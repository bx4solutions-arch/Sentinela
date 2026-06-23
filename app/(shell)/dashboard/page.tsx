import Link from "next/link";
import {
  Radar as RadarIcon, Eye, CalendarClock, Gauge, ShieldAlert, ArrowRight, Flame, GitBranch,
  Clock, Sparkles, TrendingUp, MapPin, Repeat, ExternalLink,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle, Badge, Button, Progress } from "@/components/ui";
import { buscarPCA, buscarRecorrencia, buscarContratosVencendo, montarLinhaDoTempo, type Filtro, type RecorrenciaItem, type SinalLinha } from "@/lib/antecipacao";
import { SEG_LABEL } from "@/lib/segmentos";
import { CERTIDAO_LABEL, diasAteVencer, statusCertidao } from "@/lib/certidoes";
import { itensAplicaveis, calcProntidao } from "@/lib/habilitacao";
import { ScoreRing, DonutSegmento, LineTendencia, type DonutDatum, type TrendDatum } from "@/components/charts";
import { dataBR } from "@/lib/utils";
import { monitorar, analisar } from "../radar/actions";

const brl = (n: number | null) => !n ? "—" : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(n);
const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

const STAGES = [
  { key: "nova", label: "Nova", cor: "#3C83F6" },
  { key: "monitorando", label: "Monitorando", cor: "#1E44AE" },
  { key: "preparacao", label: "Preparação", cor: "#7C3AED" },
  { key: "edital", label: "Edital", cor: "#0891B2" },
  { key: "resultado", label: "Resultado", cor: "#64748B" },
];

function Kpi({ icon: Icon, label, value, hint, href, tone = "blue" }: { icon: React.ElementType; label: string; value: React.ReactNode; hint?: string; href?: string; tone?: "blue" | "amber" | "red" | "navy" }) {
  const badge = { blue: "bg-primary/10 text-primary", amber: "bg-warning/15 text-warning", red: "bg-destructive/10 text-destructive", navy: "bg-primary/10 text-primary" }[tone];
  const inner = (
    <Card className="h-full transition hover:border-primary/40">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <span className={`grid size-7 place-items-center rounded-md ${badge}`}><Icon className="size-4" /></span> {label}
        </div>
        <p className="mt-2 text-2xl font-extrabold tracking-tight">{value}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
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

  // Agregação: abertos em escopo (data + segmentos) p/ KPIs/donut/linha
  let abertosRows: { data_publicacao: string | null; segmentos: string[] | null }[] = [];
  if (temNicho) {
    const sel = usaCidades
      ? supabase.from("raw_editais").select("data_publicacao, segmentos").in("cidade", prontas)
      : supabase.from("raw_editais").select("data_publicacao, segmentos").eq("uf_sigla", uf!);
    const { data } = await sel.overlaps("segmentos", segmentos).is("valor_homologado", null).limit(3000);
    abertosRows = (data ?? []) as unknown as typeof abertosRows;
  }
  const abertos = abertosRows.length;
  const agora = new Date();
  const d90 = new Date(agora.getTime() - 90 * 86400000);
  const pub90 = abertosRows.filter((r) => r.data_publicacao && new Date(r.data_publicacao) >= d90).length;

  // Donut por segmento (real)
  const donut: DonutDatum[] = segmentos.map((s) => ({ nome: SEG_LABEL[s] ?? s, valor: abertosRows.filter((r) => (r.segmentos ?? []).includes(s)).length }));
  // Linha: editais publicados por mês (6 meses, real)
  const trend: TrendDatum[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(agora.getFullYear(), agora.getMonth() - i, 1);
    const n = abertosRows.filter((r) => { if (!r.data_publicacao) return false; const x = new Date(r.data_publicacao); return x.getFullYear() === d.getFullYear() && x.getMonth() === d.getMonth(); }).length;
    trend.push({ mes: MESES[d.getMonth()], editais: n });
  }

  // Pipeline + monitorando
  const { data: oports } = await supabase.from("oportunidade").select("stage");
  const stageCount: Record<string, number> = {};
  for (const o of oports ?? []) stageCount[o.stage] = (stageCount[o.stage] ?? 0) + 1;
  const monitorando = stageCount["monitorando"] ?? 0;
  const noFunil = (oports ?? []).filter((o) => o.stage !== "descartado").length;

  // Documentos
  const { data: docs } = await supabase.from("documento").select("tipo, tipo_label, vencimento").eq("escopo", "company");
  const docByTipo: Record<string, { vencimento: string }> = {};
  for (const d of docs ?? []) if (d.vencimento) docByTipo[d.tipo] = { vencimento: d.vencimento };
  const { pct } = calcProntidao(itensAplicaveis(segmentos.length ? segmentos : ["generico"]), docByTipo);
  const vencendo = (docs ?? []).filter((d) => d.vencimento).map((d) => ({ ...d, dias: diasAteVencer(d.vencimento!), st: statusCertidao(d.vencimento!) })).filter((d) => d.st !== "ATIVO").sort((a, b) => a.dias - b.dias);
  const urgentes = vencendo.filter((d) => d.st === "VENCIDO").length;

  // Atacar hoje (top abertos por recência → prioridade heurística)
  let atacar: { numero_controle_pncp: string; objeto: string | null; valor_estimado: number | null; data_publicacao: string | null; cidade: string | null; orgao: { razao_social: string | null } | null }[] = [];
  if (temNicho) {
    const sel = usaCidades
      ? supabase.from("raw_editais").select("numero_controle_pncp, objeto, valor_estimado, data_publicacao, cidade, orgao:cnpj_orgao(razao_social)").in("cidade", prontas)
      : supabase.from("raw_editais").select("numero_controle_pncp, objeto, valor_estimado, data_publicacao, cidade, orgao:cnpj_orgao!inner(razao_social, uf_sigla)").eq("orgao.uf_sigla", uf!);
    const { data } = await sel.overlaps("segmentos", segmentos).is("valor_homologado", null).order("data_publicacao", { ascending: false }).limit(4);
    atacar = (data ?? []) as unknown as typeof atacar;
  }
  const prioridade = (pub: string | null) => { if (!pub) return 40; const dias = Math.floor((agora.getTime() - new Date(pub).getTime()) / 86400000); return Math.max(35, 100 - Math.min(dias, 65)); };

  // Linha do Tempo de Sinais (Etapa 2) — só o que TEM dado: PCA + recorrência + republicação.
  let timeline: SinalLinha[] = [];
  if (temNicho) {
    const filtroDash: Filtro = { busca: "", segmentos, uf: uf!, prontas, usandoFallbackUf: !usaCidades, ufBusca: null };
    const [pcaD, recD, contrD] = await Promise.all([
      buscarPCA(supabase, filtroDash), buscarRecorrencia(supabase, filtroDash), buscarContratosVencendo(supabase, filtroDash),
    ]);
    let repQ = supabase.from("raw_editais")
      .select("numero_controle_pncp, objeto, valor_homologado, data_publicacao, cidade, cnpj_orgao, uf_sigla, link_origem, orgao:cnpj_orgao(razao_social)")
      .overlaps("segmentos", segmentos).or("situacao_nome.ilike.*fracassad*,situacao_nome.ilike.*desert*");
    repQ = usaCidades ? repQ.in("cidade", prontas) : repQ.eq("uf_sigla", uf!);
    const { data: repD } = await repQ.order("data_publicacao", { ascending: false }).limit(10);
    timeline = montarLinhaDoTempo(pcaD, recD, (repD ?? []) as unknown as RecorrenciaItem[], contrD).slice(0, 14);
  }
  const seloTone: Record<SinalLinha["tone"], "secondary" | "warning" | "muted"> = { navy: "secondary", amber: "warning", slate: "muted" };

  return (
    <div className="space-y-5">
      {/* Thesis / antecipação (nosso diferencial) */}
      <div className="rounded-xl bg-gradient-to-r from-sidebar to-primary px-5 py-4 text-sidebar-foreground">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4" />
          <p className="text-sm font-semibold">O mercado avisa quando o edital sai. O Sentinela cruza o seu recorte com o dado público.</p>
          <Badge variant="secondary" className="ml-auto hidden sm:inline-flex">antecipação · roadmap</Badge>
        </div>
        <p className="mt-1 text-xs text-sidebar-foreground/70">Sinais pré-edital (PCA→DFD→ETP→TR→Edital) entram com a ingestão de atas/PCA. Hoje: editais abertos do seu nicho em tempo real.</p>
      </div>

      {/* Linha do Tempo de Sinais (Antecipação) — só o que tem dado */}
      {timeline.length > 0 && (
        <Card data-testid="linha-tempo-sinais">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2 text-base"><CalendarClock className="size-4 text-primary" /> Linha do Tempo de Sinais</CardTitle>
            <Button asChild variant="ghost" size="sm"><Link href="/radar?pilar=antecipacao">Ver Antecipação <ArrowRight className="size-4" /></Link></Button>
          </CardHeader>
          <CardContent>
            <p className="mb-3 text-xs text-muted-foreground">Sinais reais do seu recorte — <strong>probabilidade, não promessa</strong>. Contrato vencendo entra quando a coleta de contratos ligar (em ingestão).</p>
            <ol className="relative space-y-3 border-l pl-4">
              {timeline.map((s, i) => (
                <li key={i} className="relative" data-testid="sinal-item">
                  <span className="absolute -left-[21px] top-1 size-2.5 rounded-full bg-primary" />
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant={seloTone[s.tone]} className="gap-1">
                      {s.tipo === "recorrencia" ? <Repeat className="size-3" /> : s.tipo === "pca" ? <CalendarClock className="size-3" /> : <Clock className="size-3" />}{s.selo}
                    </Badge>
                    <span className="font-medium text-foreground">{s.orgao}</span>
                    {s.data && <span className="ml-auto">{dataBR(s.data)}</span>}
                  </div>
                  <p className="mt-1 line-clamp-1 text-sm">{s.titulo}</p>
                  <p className="text-xs text-muted-foreground">{s.detalhe}{s.link && <> · <a href={s.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 text-primary hover:underline"><ExternalLink className="size-3" />fonte</a></>}</p>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        <Kpi icon={RadarIcon} label="Editais abertos" value={abertos} hint={escopoLabel} href="/radar" tone="navy" />
        <Kpi icon={Flame} label="Novos em 90 dias" value={pub90} hint="publicados" href="/radar" tone="blue" />
        <Kpi icon={Eye} label="Monitorando" value={monitorando} hint={`${noFunil} no funil`} href="/kanban" tone="blue" />
        <Kpi icon={Gauge} label="Prontidão" value={`${pct}%`} hint="habilitação" href="/empresa" tone={pct >= 80 ? "blue" : pct >= 50 ? "amber" : "red"} />
        <Kpi icon={CalendarClock} label="Docs vencendo" value={vencendo.length} hint="≤30d ou vencidos" href="/empresa" tone="amber" />
        <Kpi icon={ShieldAlert} label="Ações urgentes" value={urgentes} hint="docs vencidos" href="/empresa" tone="red" />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Atacar hoje */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2 text-base"><Flame className="size-4 text-primary" /> Atacar hoje</CardTitle>
            <Button asChild variant="ghost" size="sm"><Link href="/radar">Ver Radar <ArrowRight className="size-4" /></Link></Button>
          </CardHeader>
          <CardContent>
            {atacar.length === 0 ? (
              <p className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">{temNicho ? "Sem editais abertos do seu nicho agora." : "Defina seu nicho em Minha Empresa."}</p>
            ) : (
              <div className="space-y-3">
                {atacar.map((e) => (
                  <div key={e.numero_controle_pncp} className="flex gap-3 rounded-lg border p-3">
                    <ScoreRing value={prioridade(e.data_publicacao)} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{e.orgao?.razao_social ?? "Órgão"}</p>
                      <p className="flex items-center gap-2 text-xs text-muted-foreground">
                        {e.cidade && <span className="flex items-center gap-0.5"><MapPin className="size-3" />{e.cidade}</span>}
                        <span className="font-medium text-foreground">{brl(e.valor_estimado)}</span>
                        {e.data_publicacao && <span>{dataBR(e.data_publicacao.slice(0, 10))}</span>}
                      </p>
                      <p className="mt-1 line-clamp-1 text-xs">{e.objeto}</p>
                      <div className="mt-2 flex gap-2">
                        <form action={monitorar}><input type="hidden" name="numero" value={e.numero_controle_pncp} /><Button type="submit" size="sm" variant="outline"><Eye className="size-4" /> Monitorar</Button></form>
                        <form action={analisar}><input type="hidden" name="numero" value={e.numero_controle_pncp} /><Button type="submit" size="sm"><Sparkles className="size-4" /> Analisar</Button></form>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pipeline */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><GitBranch className="size-4 text-primary" /> Pipeline</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {STAGES.map((s) => (
              <div key={s.key} className="flex items-center gap-2 text-sm">
                <span className="size-2.5 rounded-full" style={{ background: s.cor }} />
                <span className="flex-1 text-muted-foreground">{s.label}</span>
                <Badge variant={stageCount[s.key] ? "secondary" : "muted"}>{stageCount[s.key] ?? 0}</Badge>
              </div>
            ))}
            {noFunil === 0 && <p className="pt-1 text-xs text-muted-foreground">Monitore editais no Radar para preencher o funil.</p>}
          </CardContent>
        </Card>
      </div>

      {/* Charts: donut + linha (reais) */}
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><GitBranch className="size-4 text-primary" /> Abertos por segmento</CardTitle></CardHeader>
          <CardContent>
            {donut.some((d) => d.valor > 0) ? <DonutSegmento data={donut} totalLabel={String(abertos)} /> : <p className="text-sm text-muted-foreground">Sem dados no escopo.</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><TrendingUp className="size-4 text-primary" /> Editais publicados / mês</CardTitle></CardHeader>
          <CardContent><LineTendencia data={trend} /></CardContent>
        </Card>
      </div>

      {/* Vigia de documentos */}
      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Clock className="size-4 text-primary" /> Documentos a renovar</CardTitle></CardHeader>
          <CardContent>
            {vencendo.length === 0 ? (
              <p className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">Nenhum documento vencido ou a vencer nos próximos 30 dias.</p>
            ) : (
              <ul className="divide-y">
                {vencendo.map((d) => (
                  <li key={d.tipo} className="flex items-center gap-3 py-2.5">
                    <Badge variant={d.st === "VENCIDO" ? "destructive" : "warning"}>{d.st === "VENCIDO" ? "Vencido" : "A renovar"}</Badge>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">{d.tipo_label || CERTIDAO_LABEL[d.tipo] || d.tipo}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">{dataBR(d.vencimento!)} · {d.dias < 0 ? `há ${-d.dias}d` : `em ${d.dias}d`}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Gauge className="size-4 text-primary" /> Prontidão</CardTitle></CardHeader>
          <CardContent>
            <p className={`text-4xl font-extrabold ${pct >= 80 ? "text-primary" : pct >= 50 ? "text-warning" : "text-destructive"}`}>{pct}%</p>
            <p className="mt-1 text-sm text-muted-foreground">habilitação obrigatória</p>
            <Progress value={pct} className="mt-3" />
            <Button asChild variant="outline" size="sm" className="mt-3 w-full"><Link href="/empresa">Completar documentos</Link></Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
