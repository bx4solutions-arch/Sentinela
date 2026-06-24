import Link from "next/link";
import {
  Radar as RadarIcon, Eye, CalendarClock, ShieldAlert, ArrowRight,
  Clock, Sparkles, MapPin, Repeat, ExternalLink, RefreshCw, Landmark, ShieldCheck, Activity,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, Badge, Button } from "@/components/ui";
import { buscarPCA, buscarRecorrencia, buscarContratosVencendo, montarLinhaDoTempo, type Filtro, type RecorrenciaItem, type SinalLinha } from "@/lib/antecipacao";
import { SEG_LABEL } from "@/lib/segmentos";
import { diasAteVencer, statusCertidao } from "@/lib/certidoes";
import { itensAplicaveis, calcProntidao, statusItem } from "@/lib/habilitacao";
import { dataBR } from "@/lib/utils";
import { monitorar, analisar } from "../radar/actions";

const brl = (n: number | null) => !n ? "—" : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(n);
const brlK = (n: number) => n >= 1_000_000 ? `R$ ${(n / 1_000_000).toFixed(1).replace(".", ",")} Mi` : n >= 1000 ? `R$ ${Math.round(n / 1000)}k` : brl(n);
const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

/** Anel de score (SVG, azul petróleo, estático). value 0–100. */
function ProntidaoRing({ value }: { value: number }) {
  const r = 52, c = 2 * Math.PI * r, off = c * (1 - Math.max(0, Math.min(100, value)) / 100);
  return (
    <div className="relative size-[120px] shrink-0" data-testid="dashboard-score-ring">
      <svg className="-rotate-90" width="120" height="120" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={r} stroke="#EEF2F6" strokeWidth="12" fill="none" />
        <circle cx="60" cy="60" r={r} stroke="hsl(var(--primary))" strokeWidth="12" fill="none" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={off} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[32px] font-bold leading-none text-primary">{value}</span>
        <span className="text-[13px] text-muted-foreground">/100</span>
      </div>
    </div>
  );
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: company } = await supabase.from("company").select("razao_social, segmentos, municipio, uf").maybeSingle();
  const segmentos: string[] = (company?.segmentos ?? []).filter((s: string) => s !== "generico");
  const uf: string | null = company?.uf ?? null;
  const temNicho = segmentos.length > 0 && !!uf;

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

  // Abertos no recorte (contagem real p/ header de oportunidades)
  let abertos = 0;
  if (temNicho) {
    const selC = usaCidades
      ? supabase.from("raw_editais").select("numero_controle_pncp", { count: "exact", head: true }).in("cidade", prontas)
      : supabase.from("raw_editais").select("numero_controle_pncp", { count: "exact", head: true }).eq("uf_sigla", uf!);
    const { count } = await selC.overlaps("segmentos", segmentos).is("valor_homologado", null);
    abertos = count ?? 0;
  }

  // Pipeline + monitorando (funil)
  const { data: oports } = await supabase.from("oportunidade").select("stage");
  const stageCount: Record<string, number> = {};
  for (const o of oports ?? []) stageCount[o.stage] = (stageCount[o.stage] ?? 0) + 1;
  const monitorando = stageCount["monitorando"] ?? 0;

  // ===== COFRE (real) → Score + Documentação + alertas =====
  const aplic = itensAplicaveis(segmentos.length ? segmentos : ["generico"]);
  const { data: docs } = await supabase.from("documento").select("tipo, tipo_label, vencimento").eq("escopo", "company");
  const docByTipo: Record<string, { vencimento: string }> = {};
  for (const d of docs ?? []) if (d.vencimento) docByTipo[d.tipo] = { vencimento: d.vencimento };
  const { pct, validos, total } = calcProntidao(aplic, docByTipo);
  const itStatus = aplic.map((it) => statusItem(docByTipo[it.key]));
  const certVencidas = itStatus.filter((s) => s === "vencida" || s === "ausente").length;
  const certRenovar = itStatus.filter((s) => s === "a_renovar").length;
  const certTone: "azul" | "ambar" | "vermelho" = certVencidas > 0 ? "vermelho" : certRenovar > 0 ? "ambar" : "azul";

  const vencendo = (docs ?? []).filter((d) => d.vencimento).map((d) => ({ ...d, dias: diasAteVencer(d.vencimento!), st: statusCertidao(d.vencimento!) })).filter((d) => d.st !== "ATIVO").sort((a, b) => a.dias - b.dias);
  const urgentes = vencendo.filter((d) => d.st === "VENCIDO").length;
  const criticos = vencendo.filter((d) => d.dias <= 3); // vence <72h ou já vencido
  const semImpedimento = urgentes === 0;

  // ===== Oportunidades quentes (Radar do recorte) =====
  let atacar: { numero_controle_pncp: string; objeto: string | null; valor_estimado: number | null; data_publicacao: string | null; cidade: string | null; modalidade_nome: string | null; orgao: { razao_social: string | null } | null }[] = [];
  if (temNicho) {
    const sel = usaCidades
      ? supabase.from("raw_editais").select("numero_controle_pncp, objeto, valor_estimado, data_publicacao, cidade, modalidade_nome, orgao:cnpj_orgao(razao_social)").in("cidade", prontas)
      : supabase.from("raw_editais").select("numero_controle_pncp, objeto, valor_estimado, data_publicacao, cidade, modalidade_nome, orgao:cnpj_orgao!inner(razao_social, uf_sigla)").eq("orgao.uf_sigla", uf!);
    const { data } = await sel.overlaps("segmentos", segmentos).is("valor_homologado", null).order("data_publicacao", { ascending: false }).limit(3);
    atacar = (data ?? []) as unknown as typeof atacar;
  }
  const stageByNum: Record<string, string> = {};
  { const { data: op2 } = await supabase.from("oportunidade").select("numero_controle_pncp, stage"); for (const o of op2 ?? []) stageByNum[o.numero_controle_pncp] = o.stage; }
  // FIT% = heurística de recência (ESTIMATIVA, marcada como tal — nunca "chance de ganhar").
  const fit = (pub: string | null) => { if (!pub) return 60; const dias = Math.floor((agora.getTime() - new Date(pub).getTime()) / 86400000); return Math.max(55, 95 - Math.min(dias, 40)); };

  // ===== Antecipação (PCA + recorrência + contratos) → Pipeline 90d (estimativa) + Linha do Tempo =====
  let pipeBuckets: { label: string; val: number }[] = [{ label: MESES[agora.getMonth()], val: 0 }];
  let pipelineTotal = 0;
  let timeline: SinalLinha[] = [];
  if (temNicho) {
    const filtroDash: Filtro = { busca: "", segmentos, uf: uf!, prontas, usandoFallbackUf: !usaCidades, ufBusca: null };
    const [pcaD, recD, contrD] = await Promise.all([
      buscarPCA(supabase, filtroDash), buscarRecorrencia(supabase, filtroDash), buscarContratosVencendo(supabase, filtroDash, 90),
    ]);
    const in90 = new Date(agora.getTime() + 90 * 86400000);
    const pipeItems: { data: Date; valor: number }[] = [];
    for (const c of contrD) { const d = c.data_vigencia_fim ? new Date(c.data_vigencia_fim + "T00:00:00") : null; if (d && d >= agora && d <= in90 && c.valor_global) pipeItems.push({ data: d, valor: Number(c.valor_global) }); }
    for (const p of pcaD) { const d = p.data_desejada ? new Date(p.data_desejada) : null; if (d && d >= agora && d <= in90 && p.valor_total) pipeItems.push({ data: d, valor: Number(p.valor_total) }); }
    pipelineTotal = pipeItems.reduce((s, i) => s + i.valor, 0);
    pipeBuckets = [0, 1, 2].map((k) => {
      const m = new Date(agora.getFullYear(), agora.getMonth() + k, 1);
      const val = pipeItems.filter((i) => i.data.getFullYear() === m.getFullYear() && i.data.getMonth() === m.getMonth()).reduce((s, i) => s + i.valor, 0);
      return { label: MESES[m.getMonth()], val };
    });
    let repQ = supabase.from("raw_editais")
      .select("numero_controle_pncp, objeto, valor_homologado, data_publicacao, cidade, cnpj_orgao, uf_sigla, link_origem, orgao:cnpj_orgao(razao_social)")
      .overlaps("segmentos", segmentos).or("situacao_nome.ilike.*fracassad*,situacao_nome.ilike.*desert*");
    repQ = usaCidades ? repQ.in("cidade", prontas) : repQ.eq("uf_sigla", uf!);
    const { data: repD } = await repQ.order("data_publicacao", { ascending: false }).limit(10);
    timeline = montarLinhaDoTempo(pcaD, recD, (repD ?? []) as unknown as RecorrenciaItem[], contrD).slice(0, 12);
  }
  const pipeMax = Math.max(1, ...pipeBuckets.map((b) => b.val));
  const seloTone: Record<SinalLinha["tone"], "secondary" | "warning" | "muted"> = { navy: "secondary", amber: "warning", slate: "muted" };

  // ===== Ações de hoje (prazos reais) =====
  const nContratosVencendo = timeline.filter((s) => s.tipo === "contrato_vencendo").length;
  const tarefas: { txt: string; sub: string; href: string; tone: "red" | "amber" | "blue" }[] = [];
  if (urgentes > 0) tarefas.push({ txt: `Renovar ${urgentes} documento(s) vencido(s)`, sub: "pode te inabilitar", href: "/empresa", tone: "red" });
  if (vencendo.length - urgentes > 0) tarefas.push({ txt: `Acompanhar ${vencendo.length - urgentes} certidão(ões) vencendo`, sub: "≤30 dias", href: "/empresa", tone: "amber" });
  if (atacar.length > 0) tarefas.push({ txt: `Analisar ${atacar.length} edital(is) aberto(s)`, sub: "do seu nicho", href: "/radar", tone: "blue" });
  if (nContratosVencendo > 0) tarefas.push({ txt: `Antecipar ${nContratosVencendo} contrato(s) vencendo`, sub: "janela de recompra", href: "/radar?pilar=antecipacao", tone: "amber" });
  const tarefas3 = tarefas.slice(0, 3);

  const semaforoDot = (t: "azul" | "ambar" | "vermelho") => t === "vermelho" ? "bg-destructive" : t === "ambar" ? "bg-warning" : "bg-primary";
  const semaforoBorder = (t: "azul" | "ambar" | "vermelho") => t === "vermelho" ? "border-destructive" : t === "ambar" ? "border-warning" : "border-primary";

  return (
    <div className="space-y-5 pb-20 md:pb-0" data-testid="dashboard-root">
      {/* Alerta crítico (cofre vence <72h) */}
      {criticos.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm" data-testid="dashboard-alerta-critico">
          <ShieldAlert className="size-5 text-destructive" />
          <span className="font-semibold text-destructive">Atenção:</span>
          <span className="flex-1">{criticos.length} documento(s) {criticos.some((c) => c.dias < 0) ? "vencido(s)" : "vencendo em <72h"} — pode te impedir de habilitar.</span>
          <Button asChild size="sm" variant="destructive"><Link href="/empresa">Renovar agora <ArrowRight className="size-4" /></Link></Button>
        </div>
      )}

      {/* Cabeçalho + streak */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold leading-tight text-foreground">Bom dia{company?.razao_social ? `, ${company.razao_social.split(" ")[0]}` : ""}</h1>
          <p className="text-sm text-muted-foreground">Seu recorte: {temNicho ? `${segmentos.map((s) => SEG_LABEL[s] ?? s).join(", ")} · ${escopoLabel}` : "defina seu nicho em Minha Empresa"}</p>
        </div>
        <Badge variant={semImpedimento ? "secondary" : "destructive"} className="gap-1.5" data-testid="dashboard-streak">
          {semImpedimento ? <ShieldCheck className="size-3.5" /> : <ShieldAlert className="size-3.5" />}
          {semImpedimento ? "Cofre sem impedimentos" : `${urgentes} impedimento(s)`}
        </Badge>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        {/* ESQUERDA — Prontidão + Documentação */}
        <aside className="space-y-5 xl:col-span-3">
          <Card data-testid="dashboard-score">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-foreground">Score de Prontidão</h2>
                <Badge variant="muted">fato, não chance</Badge>
              </div>
              <div className="mt-5 flex items-center gap-5">
                <ProntidaoRing value={pct} />
                <div>
                  <p className="text-[20px] font-semibold leading-tight text-primary">{pct >= 80 ? "Pronto para licitar" : pct >= 50 ? "Quase lá" : "Habilite-se"}</p>
                  <p className="mt-1.5 text-[13px] text-muted-foreground">{validos} de {total} exigências típicas atendidas</p>
                  <div className="mt-3 flex items-center gap-1.5">
                    <span className={`size-2 rounded-full ${semImpedimento ? "bg-primary" : "bg-destructive"}`} />
                    <span className={`text-[13px] font-medium ${semImpedimento ? "text-primary" : "text-destructive"}`}>{semImpedimento ? "Status ativo" : "Pendência no cofre"}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <h3 className="mb-3.5 font-semibold">Documentação</h3>
              <div className="space-y-3" data-testid="dashboard-semaforo">
                <div className={`rounded-[10px] border-l-[3px] ${semaforoBorder(certTone)} py-2.5 pl-3.5`}>
                  <p className="flex items-center gap-1.5 text-[13px] font-medium"><span className={`size-2 rounded-full ${semaforoDot(certTone)}`} /> Certidões</p>
                  <p className="mt-0.5 text-[13px] text-muted-foreground">{validos}/{total} em dia{certVencidas > 0 ? ` · ${certVencidas} a resolver` : certRenovar > 0 ? ` · ${certRenovar} vencendo` : ""}</p>
                </div>
                {[["SICAF", "credenciamento SICAF"], ["Atestados", "capacidade técnica"], ["Sanções", "CEIS/CNEP"]].map(([nome, sub]) => (
                  <div key={nome} className="rounded-[10px] border-l-[3px] border-border py-2.5 pl-3.5">
                    <p className="flex items-center gap-1.5 text-[13px] font-medium"><span className="size-2 rounded-full bg-neutral" /> {nome}</p>
                    <div className="mt-0.5 flex items-center gap-1.5 text-[13px] text-muted-foreground">{sub} <Badge variant="muted">em ingestão</Badge></div>
                  </div>
                ))}
              </div>
              <Button asChild className="mt-4 w-full"><Link href="/empresa"><RefreshCw className="size-4" /> Renovar tudo</Link></Button>
            </CardContent>
          </Card>
        </aside>

        {/* CENTRO — Pipeline + Oportunidades quentes */}
        <section className="space-y-5 xl:col-span-6">
          <Card data-testid="dashboard-pipeline">
            <CardContent className="p-5 sm:p-6">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                  <h2 className="text-[18px] font-semibold sm:text-[20px]">Pipeline de Oportunidades</h2>
                  <p className="mt-0.5 text-[13px] text-muted-foreground">Próximos 90 dias · antecipação do recorte</p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-[13px] font-medium uppercase tracking-wide text-muted-foreground">Valor estimado</p>
                  <p className="mt-1 text-[26px] font-bold leading-none text-primary">{pipelineTotal > 0 ? brlK(pipelineTotal) : "—"}</p>
                </div>
              </div>
              {pipelineTotal > 0 ? (
                <>
                  <div className="mt-6 grid h-[140px] grid-cols-3 items-end gap-4 sm:gap-8">
                    {pipeBuckets.map((b, i) => (
                      <div key={i} className="flex flex-col items-center gap-2">
                        <div className="flex h-[100px] w-full items-end justify-center">
                          <div className="group relative w-[56px] rounded-t-[10px] bg-gradient-to-t from-primary to-secondary sm:w-[72px]" style={{ height: `${Math.max(6, (b.val / pipeMax) * 100)}px` }}>
                            <span className="absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-foreground px-2 py-1 text-[12px] font-semibold text-background opacity-0 transition group-hover:opacity-100">{b.val > 0 ? brlK(b.val) : "—"}</span>
                          </div>
                        </div>
                        <span className="text-[13px] font-medium text-muted-foreground">{b.label}</span>
                      </div>
                    ))}
                  </div>
                  <p className="mt-3 text-[13px] text-muted-foreground">Soma da antecipação (PCA + contratos vencendo) do seu recorte — <strong>estimativa, não promessa</strong>.</p>
                </>
              ) : (
                <p className="mt-4 rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">Pipeline preenche conforme a <strong>antecipação</strong> liga (PCA + contratos vencendo do seu nicho — em ingestão).</p>
              )}
            </CardContent>
          </Card>

          <div data-testid="dashboard-oportunidades">
            <div className="mb-3.5 flex items-center justify-between">
              <h3 className="font-semibold text-[15px]">Oportunidades quentes</h3>
              <span className="text-[13px] text-muted-foreground">{abertos} aberto(s) · {monitorando} monitorando</span>
            </div>
            {atacar.length === 0 ? (
              <Card><CardContent className="p-5"><p className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">{temNicho ? "Sem editais abertos do seu nicho agora — vazio verdadeiro." : "Defina seu nicho em Minha Empresa."}</p></CardContent></Card>
            ) : (
              <div className="space-y-3.5">
                {atacar.map((e) => {
                  const mon = stageByNum[e.numero_controle_pncp] === "monitorando";
                  const f = fit(e.data_publicacao);
                  const fitTone = f >= 75 ? "primary" : "warning";
                  return (
                    <Card key={e.numero_controle_pncp} data-testid="oportunidade-card" className="transition hover:shadow-cardhover">
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            <p className="text-[13px] font-medium text-muted-foreground">{e.orgao?.razao_social ?? "Órgão"}</p>
                            <h4 className="mt-1 line-clamp-2 text-[16px] font-semibold text-foreground">{e.objeto ?? "Edital"}</h4>
                            <div className="mt-2.5 flex flex-wrap items-center gap-4 text-[13px] text-muted-foreground">
                              {e.cidade && <span className="flex items-center gap-1.5"><MapPin className="size-3.5" />{e.cidade}</span>}
                              {e.modalidade_nome && <span className="flex items-center gap-1.5"><Activity className="size-3.5" />{e.modalidade_nome}</span>}
                              <span className="font-medium text-foreground">{brl(e.valor_estimado)}</span>
                            </div>
                          </div>
                          <div className={`flex size-[56px] shrink-0 flex-col items-center justify-center rounded-[12px] ${fitTone === "primary" ? "bg-primary/10" : "bg-warning/10"}`}>
                            <span className={`text-[18px] font-bold leading-none ${fitTone === "primary" ? "text-primary" : "text-warning"}`}>{f}%</span>
                            <span className="text-[10px] font-medium text-muted-foreground">FIT*</span>
                          </div>
                        </div>
                        <div className="mt-4 flex items-center gap-2.5">
                          {mon ? (
                            <Badge variant="secondary" className="h-[36px] gap-1.5 px-4"><Eye className="size-4" /> Monitorando</Badge>
                          ) : (
                            <form action={monitorar}><input type="hidden" name="numero" value={e.numero_controle_pncp} /><Button type="submit" size="sm" variant="outline" className="h-[36px]" data-testid="dash-monitorar"><Eye className="size-4" /> Monitorar</Button></form>
                          )}
                          <form action={analisar}><input type="hidden" name="numero" value={e.numero_controle_pncp} /><Button type="submit" size="sm" className="h-[36px]"><Sparkles className="size-4" /> Ver detalhes</Button></form>
                          <span className="ml-auto hidden text-[12px] text-muted-foreground sm:block">* FIT = estimativa</span>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* DIREITA — Ações de hoje + Performance */}
        <aside className="space-y-5 xl:col-span-3">
          <Card data-testid="dashboard-acoes">
            <CardContent className="p-5">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-semibold text-[15px]">Ações de hoje</h3>
                <Badge variant="secondary">{tarefas3.length} pendente(s)</Badge>
              </div>
              {tarefas3.length === 0 ? (
                <p className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">Nada urgente hoje. Cofre e prazos em dia.</p>
              ) : (
                <div className="space-y-3">
                  {tarefas3.map((t, i) => (
                    <Link key={i} href={t.href} data-testid="dashboard-tarefa" className="-mx-2.5 flex items-start gap-3 rounded-[10px] p-2.5 transition hover:bg-accent">
                      <span className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border-2 text-[12px] font-bold ${t.tone === "red" ? "border-destructive text-destructive" : t.tone === "amber" ? "border-warning text-warning" : "border-primary text-primary"}`}>{i + 1}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-medium leading-snug">{t.txt}</p>
                        <p className={`mt-0.5 text-[12px] ${t.tone === "red" ? "text-destructive" : t.tone === "amber" ? "text-warning" : "text-muted-foreground"}`}>{t.sub}</p>
                      </div>
                      <ArrowRight className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card data-testid="dashboard-performance">
            <CardContent className="p-5">
              <h3 className="mb-1 font-semibold text-[15px]">Performance</h3>
              <p className="text-[13px] text-muted-foreground">Preenche conforme você usa o Sentinela — sem número inventado.</p>
              <div className="mt-3 space-y-2.5">
                {["Taxa de habilitação", "Tempo médio de proposta", "Ticket ganho / perdido"].map((m) => (
                  <div key={m} className="flex items-center justify-between rounded-[10px] bg-muted/40 px-3 py-2">
                    <span className="text-[13px] text-muted-foreground">{m}</span>
                    <Badge variant="muted">preenche com o uso</Badge>
                  </div>
                ))}
                <div className="rounded-[10px] border-t border-border pt-3">
                  <p className="flex items-center gap-1.5 text-[13px] font-medium"><Landmark className="size-3.5 text-primary" /> Órgãos: capacidade de pagamento</p>
                  <div className="mt-1 flex items-center gap-1.5 text-[12px] text-muted-foreground">Ranking por <strong>CAPAG</strong> (Tesouro) <Badge variant="muted">em ingestão</Badge></div>
                  <p className="mt-1.5 rounded border border-warning/30 bg-warning/10 px-2 py-1 text-[12px]">⚠️ CAPAG = saúde fiscal do ente, <strong>não garantia de pontualidade</strong> de pagamento.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>

      {/* Linha do Tempo de Sinais (Antecipação) — só o que tem dado real */}
      {timeline.length > 0 && (
        <Card data-testid="linha-tempo-sinais">
          <CardContent className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="flex items-center gap-2 font-semibold text-[15px]"><CalendarClock className="size-4 text-primary" /> Linha do Tempo de Sinais</h3>
              <Button asChild variant="ghost" size="sm"><Link href="/radar?pilar=antecipacao">Ver Antecipação <ArrowRight className="size-4" /></Link></Button>
            </div>
            <p className="mb-3 text-[13px] text-muted-foreground">Sinais reais do seu recorte — <strong>probabilidade, não promessa</strong>.</p>
            <ol className="relative space-y-3 border-l pl-4">
              {timeline.map((s, i) => (
                <li key={i} className="relative" data-testid="sinal-item">
                  <span className="absolute -left-[21px] top-1 size-2.5 rounded-full bg-primary" />
                  <div className="flex flex-wrap items-center gap-2 text-[13px] text-muted-foreground">
                    <Badge variant={seloTone[s.tone]} className="gap-1">
                      {s.tipo === "recorrencia" ? <Repeat className="size-3" /> : s.tipo === "pca" ? <CalendarClock className="size-3" /> : <Clock className="size-3" />}{s.selo}
                    </Badge>
                    <span className="font-medium text-foreground">{s.orgao}</span>
                    {s.data && <span className="ml-auto">{dataBR(s.data)}</span>}
                  </div>
                  <p className="mt-1 line-clamp-1 text-sm">{s.titulo}</p>
                  <p className="text-[13px] text-muted-foreground">{s.detalhe}{s.link && <> · <a href={s.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 text-primary hover:underline"><ExternalLink className="size-3" />fonte</a></>}</p>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}

      {/* Barra de ação fixa (mobile) — acima da bottom-nav do shell */}
      <div className="fixed inset-x-0 bottom-[60px] z-30 flex items-center gap-2 border-t bg-card/95 px-4 py-2 backdrop-blur md:hidden" data-testid="dashboard-mobile-acao">
        {criticos.length > 0
          ? <Button asChild className="flex-1" variant="destructive"><Link href="/empresa"><RefreshCw className="size-4" /> Renovar agora</Link></Button>
          : <Button asChild className="flex-1"><Link href="/empresa"><RefreshCw className="size-4" /> Renovar tudo</Link></Button>}
        <Button asChild className="flex-1" variant="outline"><Link href="/radar"><RadarIcon className="size-4" /> Ver Radar</Link></Button>
      </div>
    </div>
  );
}
