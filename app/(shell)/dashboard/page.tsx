import Link from "next/link";
import { Radar, Scale, FileText, AlertTriangle, CalendarClock, Clock, Sparkles, type LucideIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { SEG_LABEL } from "@/lib/segmentos";
import { diasAteVencer, statusCertidao } from "@/lib/certidoes";
import { itensAplicaveis, calcProntidao, statusItem } from "@/lib/habilitacao";
import { monitorar, analisar } from "../radar/actions";

// HOME (v2 "5 Telas Conectadas") — KPIs + Ações urgentes + Status da empresa + Oportunidades
// recomendadas, TUDO do recorte real do tenant. Score = ESTIMATIVA (rotulado). Sem número forjado.
const brl = (n: number | null) => !n ? "—" : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(n);
const brlK = (n: number) => n >= 1_000_000 ? `R$ ${(n / 1_000_000).toFixed(1).replace(".", ",")} Mi` : n >= 1000 ? `R$ ${Math.round(n / 1000)} mil` : brl(n);
const fmtData = (s: string | null) => { if (!s) return "—"; const d = new Date(s.length <= 10 ? s + "T00:00:00" : s); return d.toLocaleDateString("pt-BR"); };

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: company } = await supabase.from("company").select("razao_social, segmentos, municipio, uf").maybeSingle();
  const segmentos: string[] = (company?.segmentos ?? []).filter((s: string) => s !== "generico");
  const uf: string | null = company?.uf ?? null;
  const temNicho = segmentos.length > 0 && !!uf;
  const primeiroNome = company?.razao_social ? company.razao_social.split(" ")[0] : null;

  // Escopo (células prontas) ou UF fallback
  const { data: celulas } = await supabase.from("celula").select("codigo_ibge, municipio");
  const codigos = (celulas ?? []).map((c) => c.codigo_ibge);
  let prontas: string[] = [];
  if (codigos.length) {
    const { data: cc } = await supabase.from("cidade_coletada").select("codigo_ibge, status").in("codigo_ibge", codigos).eq("status", "pronta");
    const ok = new Set((cc ?? []).map((c) => c.codigo_ibge));
    prontas = (celulas ?? []).filter((c) => ok.has(c.codigo_ibge)).map((c) => c.municipio);
  }
  const usaCidades = prontas.length > 0;
  const escopoLabel = usaCidades ? prontas.join(", ") : uf ? `estado ${uf}` : "—";
  const agora = new Date();

  // ===== Oportunidades abertas no recorte + valor estimado total (REAL) =====
  let abertos = 0, valorRadar = 0;
  if (temNicho) {
    // Contagem EXATA do recorte (count=exact). Antes usava-se rows.length de um SELECT com .limit(1000),
    // que CAPAVA o KPI em 1000 (e o supabase-js também limita a 1000 por padrão) — subcontava recortes grandes.
    const selCount = usaCidades
      ? supabase.from("raw_editais").select("*", { count: "exact", head: true }).in("cidade", prontas)
      : supabase.from("raw_editais").select("orgao:cnpj_orgao!inner(uf_sigla)", { count: "exact", head: true }).eq("orgao.uf_sigla", uf!);
    const { count } = await selCount.overlaps("segmentos", segmentos).is("valor_homologado", null);
    abertos = count ?? 0;
    // Valor estimado total: soma sobre amostra (rótulo "estimado"). O count acima é exato; a soma é aproximada
    // quando o recorte passa de 1000 (somar tudo exigiria agregação server-side — fora de escopo aqui).
    const selV = usaCidades
      ? supabase.from("raw_editais").select("valor_estimado").in("cidade", prontas)
      : supabase.from("raw_editais").select("valor_estimado, orgao:cnpj_orgao!inner(uf_sigla)").eq("orgao.uf_sigla", uf!);
    const { data: vd } = await selV.overlaps("segmentos", segmentos).is("valor_homologado", null).limit(1000);
    const rows = (vd ?? []) as { valor_estimado: number | null }[];
    valorRadar = rows.reduce((s, r) => s + (Number(r.valor_estimado) || 0), 0);
  }

  // ===== Pipeline (oportunidade.stage) =====
  const { data: oports } = await supabase.from("oportunidade").select("stage");
  const totalOports = (oports ?? []).length;
  const monitorando = (oports ?? []).filter((o) => o.stage === "monitorando").length;
  const emPreparacao = totalOports - monitorando;

  // ===== Cofre (real) → prontidão + contagens + prazos =====
  const aplic = itensAplicaveis(segmentos.length ? segmentos : ["generico"]);
  const { data: docs } = await supabase.from("documento").select("tipo, tipo_label, vencimento").eq("escopo", "company");
  const docByTipo: Record<string, { vencimento: string }> = {};
  for (const d of docs ?? []) if (d.vencimento) docByTipo[d.tipo] = { vencimento: d.vencimento };
  const { pct, validos, total } = calcProntidao(aplic, docByTipo);
  const itStatus = aplic.map((it) => statusItem(docByTipo[it.key]));
  const emDia = itStatus.filter((s) => s === "valida").length;
  const vencendoN = itStatus.filter((s) => s === "a_renovar").length;
  const vencidosN = itStatus.filter((s) => s === "vencida").length;
  const naoEnviados = itStatus.filter((s) => s === "ausente").length;

  const vencendoDocs = (docs ?? []).filter((d) => d.vencimento).map((d) => ({ ...d, dias: diasAteVencer(d.vencimento!), st: statusCertidao(d.vencimento!) })).filter((d) => d.st !== "ATIVO").sort((a, b) => a.dias - b.dias);
  const docsVencendo = vencendoDocs.length;
  const criticos = vencendoDocs.filter((d) => d.dias <= 7);
  const prontidaoLabel = pct >= 80 ? "Excelente" : pct >= 60 ? "Bom" : pct >= 40 ? "Atenção" : "Crítico";

  // ===== Ações urgentes (prazos reais) =====
  const acoes: { tone: "danger" | "warn" | "ok" | ""; Icon: LucideIcon; iconBg: string; iconColor: string; b: string; sub: string; date: string; dateTone: "red" | "orange" | "ok" | ""; href: string }[] = [];
  if (vencidosN > 0) acoes.push({ tone: "danger", Icon: AlertTriangle, iconBg: "var(--v2-red-soft)", iconColor: "var(--v2-red)", b: `${vencidosN} documento(s) vencido(s)`, sub: "Pode te inabilitar — renove já", date: "Renovar", dateTone: "red", href: "/empresa" });
  if (criticos.length > 0) acoes.push({ tone: "warn", Icon: Clock, iconBg: "var(--v2-yellow-soft)", iconColor: "#ca8a04", b: `${criticos.length} prazo(s) crítico(s)`, sub: "Documentos vencendo nos próximos 7 dias", date: fmtData(criticos[0].vencimento!), dateTone: "orange", href: "/empresa" });
  if (docsVencendo - criticos.length > 0) acoes.push({ tone: "", Icon: FileText, iconBg: "var(--v2-blue-soft)", iconColor: "var(--v2-blue)", b: `${docsVencendo} documento(s) vencendo`, sub: "Certidões e licenças vencem nos próximos 30 dias", date: "Ver docs", dateTone: "", href: "/empresa" });
  if (abertos > 0) acoes.push({ tone: "ok", Icon: Sparkles, iconBg: "var(--v2-green-soft)", iconColor: "#059669", b: `${abertos} licitação(ões) do seu nicho`, sub: temNicho ? `${segmentos.map((s) => SEG_LABEL[s] ?? s).join(", ")} · ${escopoLabel}` : "", date: "Analisar", dateTone: "ok", href: "/radar" });

  // ===== Oportunidades recomendadas (3 quentes do recorte) =====
  let atacar: { numero_controle_pncp: string; objeto: string | null; valor_estimado: number | null; data_publicacao: string | null; cidade: string | null; orgao: { razao_social: string | null } | null }[] = [];
  if (temNicho) {
    const sel = usaCidades
      ? supabase.from("raw_editais").select("numero_controle_pncp, objeto, valor_estimado, data_publicacao, cidade, orgao:cnpj_orgao(razao_social)").in("cidade", prontas)
      : supabase.from("raw_editais").select("numero_controle_pncp, objeto, valor_estimado, data_publicacao, cidade, orgao:cnpj_orgao!inner(razao_social, uf_sigla)").eq("orgao.uf_sigla", uf!);
    const { data } = await sel.overlaps("segmentos", segmentos).is("valor_homologado", null).order("data_publicacao", { ascending: false }).limit(3);
    atacar = (data ?? []) as unknown as typeof atacar;
  }
  const stageByNum: Record<string, string> = {};
  { const { data: op2 } = await supabase.from("oportunidade").select("numero_controle_pncp, stage"); for (const o of op2 ?? []) stageByNum[o.numero_controle_pncp] = o.stage; }
  // Score = ESTIMATIVA (heurística de recência) — NUNCA "chance de ganhar".
  const score = (pub: string | null) => { if (!pub) return 70; const dias = Math.floor((agora.getTime() - new Date(pub).getTime()) / 86400000); return Math.max(60, 95 - Math.min(dias, 35)); };

  const KPIS: { id: string; Icon: LucideIcon; bg: string; label: string; value: string; sub: string }[] = [
    { id: "oportunidades", Icon: Radar, bg: "#2563eb", label: "Oportunidades no Radar", value: String(abertos), sub: valorRadar > 0 ? `<b>${brlK(valorRadar)}</b><br>valor total estimado` : "valor estimado em ingestão" },
    { id: "decidir", Icon: Scale, bg: "#fbbf24", label: "Licitações para decidir", value: String(monitorando), sub: "monitorando · aguardando veredito" },
    { id: "preparacao", Icon: FileText, bg: "#22c55e", label: "Propostas em preparação", value: String(emPreparacao), sub: "em execução no kanban" },
    { id: "prazos", Icon: AlertTriangle, bg: "#ef4444", label: "Prazos críticos", value: String(criticos.length), sub: "Documentos vencendo em ≤ 7 dias" },
    { id: "docs", Icon: CalendarClock, bg: "#8b5cf6", label: "Documentos vencendo", value: String(docsVencendo), sub: "Itens vencendo nos próximos 30 dias" },
  ];

  return (
    <div className="v2" data-testid="dashboard-root">
      <div className="hero">
        <div>
          <h1>Bom dia{primeiroNome ? `, ${primeiroNome}` : ""} 👋</h1>
          <p>{temNicho ? <>Seu recorte: <strong>{segmentos.map((s) => SEG_LABEL[s] ?? s).join(", ")}</strong> · {escopoLabel}. Aqui está o que precisa da sua atenção hoje.</> : "Defina seu nicho em Minha Empresa para o Radar trabalhar pra você."}</p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <Link className="secondaryBtn" href="/radar" data-testid="btn-importar">⇧ Importar edital</Link>
          <Link className="primaryBtn" href="/radar" data-testid="btn-analisar">＋ Analisar Licitação</Link>
        </div>
      </div>

      <div className="kpis" data-testid="home-kpis">
        {KPIS.map((k) => (
          <div className="kpi" key={k.id} data-testid={`kpi-${k.id}`}>
            <div className="kpiTop">
              <div className="kpiIcon" style={{ background: k.bg }}><k.Icon size={24} strokeWidth={2.2} /></div>
              <div><label>{k.label}</label><strong data-testid={`kpi-${k.id}-valor`}>{k.value}</strong></div>
            </div>
            <small dangerouslySetInnerHTML={{ __html: k.sub }} />
          </div>
        ))}
      </div>

      <div className="grid">
        <div className="panel" data-testid="home-acoes">
          <div className="panelHead"><div><h2>Ações urgentes</h2><p>O que precisa ser feito agora — do seu recorte.</p></div><Link className="link" href="/empresa">Ver todas</Link></div>
          {acoes.length === 0 ? (
            <div className="emptyState"><b>Nada urgente hoje</b>Cofre e prazos em dia. Quando surgir prazo ou documento vencendo, aparece aqui.</div>
          ) : (
            <div className="actionList">
              {acoes.map((a, i) => (
                <Link key={i} href={a.href} className={`action ${a.tone}`} data-testid="acao-item" style={{ textDecoration: "none", color: "inherit" }}>
                  <div className="circle" style={{ background: a.iconBg, color: a.iconColor }}><a.Icon size={20} /></div>
                  <div><b>{a.b}</b><span>{a.sub}</span></div>
                  <div className={`date ${a.dateTone}`} style={a.dateTone === "ok" ? { color: "#059669" } : undefined}>{a.date}</div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="panel" data-testid="home-status">
          <div className="panelHead"><div><h2>Status da minha empresa</h2><p>Prontidão para participar sem cair na habilitação.</p></div><Link className="link" href="/empresa">Ver detalhes</Link></div>
          <div className="companyGrid">
            <div className="readiness" data-testid="home-readiness" style={{ backgroundImage: `conic-gradient(var(--v2-green) 0 ${pct}%, #e5e7eb ${pct}% 100%)` }}>
              <div><strong data-testid="home-prontidao">{pct}%</strong><span>{prontidaoLabel}</span></div>
            </div>
            <div className="docRows">
              <div className="docRow"><span><i className="dot" style={{ background: "var(--v2-green)" }} />Em dia</span><b>{emDia}</b></div>
              <div className="docRow"><span><i className="dot" style={{ background: "var(--v2-orange)" }} />Vencendo em até 30 dias</span><b>{vencendoN}</b></div>
              <div className="docRow"><span><i className="dot" style={{ background: "var(--v2-red)" }} />Vencidos</span><b>{vencidosN}</b></div>
              <div className="docRow"><span><i className="dot" style={{ background: "var(--v2-muted-2)" }} />Não enviados</span><b>{naoEnviados}</b></div>
              <Link className="primaryBtn" href="/empresa" style={{ width: "100%", justifyContent: "center", marginTop: 10 }}>Atualizar documentos</Link>
            </div>
          </div>
        </div>
      </div>

      <div className="warningStrip" data-testid="home-warning">⚠ Scores de chance são <b style={{ margin: "0 3px" }}>estimativas</b> em calibração. Prontidão documental é fato; chance de vitória depende de histórico e backtest.</div>

      <div className="panel" data-testid="home-oportunidades">
        <div className="panelHead"><div><h2>Oportunidades recomendadas</h2><p>{abertos} aberta(s) · {monitorando} monitorando — do seu recorte.</p></div><Link className="link" href="/radar">Ver radar</Link></div>
        {atacar.length === 0 ? (
          <div className="emptyState"><b>{temNicho ? "Sem editais abertos do seu nicho agora" : "Defina seu nicho"}</b>{temNicho ? "Vazio verdadeiro — assim que entrar um edital do seu recorte, ele aparece aqui." : "Em Minha Empresa, escolha seus segmentos para o Radar filtrar pra você."}</div>
        ) : (
          <div className="oppGrid">
            {atacar.map((e, idx) => {
              const sc = score(e.data_publicacao);
              const mon = stageByNum[e.numero_controle_pncp] === "monitorando";
              // 1 form por card (action=analisar → abre o Space). Corpo clicável = submit; Monitorar
              // usa formAction p/ não aninhar forms. Clicar em qualquer lugar do card abre a oportunidade.
              return (
                <form action={analisar} className={`opp${idx === 0 ? " hot" : ""}`} key={e.numero_controle_pncp} data-testid="oportunidade-card">
                  <input type="hidden" name="numero" value={e.numero_controle_pncp} />
                  <button type="submit" className="oppBody" data-testid="opp-abrir" title="Abrir no Space">
                    <div className="oppTop">
                      <div><h3>{e.orgao?.razao_social ?? "Órgão"}</h3><div className="loc">{e.cidade ?? "—"}</div></div>
                      <div><div className="score" style={sc < 80 ? { borderColor: "var(--v2-orange)" } : undefined}>{sc}<small>/100</small></div><span className="scoreNote">estimativa</span></div>
                    </div>
                    <div className="obj">{e.objeto ?? "Edital do seu nicho"}</div>
                    <div className="meta"><span>Valor estimado</span><span>{brl(e.valor_estimado)}</span><span>Prontidão</span><span>{pct}%</span><span>Próxima ação</span><span>Analisar</span></div>
                  </button>
                  <div className="oppBtns">
                    {mon
                      ? <span className="btn" style={{ cursor: "default" }}>👁 Monitorando</span>
                      : <button type="submit" formAction={monitorar} className="btn" data-testid="opp-monitorar">Monitorar</button>}
                    <button type="submit" className="btn blue" data-testid="opp-analisar">Analisar</button>
                  </div>
                </form>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
