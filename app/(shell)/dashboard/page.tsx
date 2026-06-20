import Link from "next/link";
import {
  Radar as RadarIcon, Eye, CalendarClock, Gauge, ShieldAlert, Building2, ArrowRight, Flame, GitBranch,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle, Badge, Button, Progress } from "@/components/ui";
import { CERTIDAO_LABEL, diasAteVencer, statusCertidao } from "@/lib/certidoes";
import { itensAplicaveis, calcProntidao } from "@/lib/habilitacao";
import { dataBR } from "@/lib/utils";

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().trim();
const CITY_MAP: Record<string, string> = { "SAO PAULO": "São Paulo", TERESINA: "Teresina" };

const STAGES = [
  { key: "nova", label: "Nova" },
  { key: "monitorando", label: "Monitorando" },
  { key: "preparacao", label: "Preparação" },
  { key: "edital", label: "Edital" },
  { key: "resultado", label: "Resultado" },
];

function Kpi({ icon: Icon, label, value, hint, href }: { icon: React.ElementType; label: string; value: React.ReactNode; hint?: string; href?: string }) {
  const inner = (
    <Card className="h-full transition hover:border-primary/40">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground"><Icon className="size-4 text-primary" /> {label}</div>
        <p className="mt-1.5 text-2xl font-extrabold">{value}</p>
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
  const cidade = company?.municipio ? CITY_MAP[norm(company.municipio)] ?? company.municipio : null;
  const temNicho = segmentos.length > 0 && !!cidade;

  // KPI: editais abertos do nicho + publicados em 90d
  let abertos = 0, pub90 = 0;
  if (temNicho) {
    const base = () => supabase.from("raw_editais").select("numero_controle_pncp", { count: "exact", head: true }).overlaps("segmentos", segmentos).eq("cidade", cidade).is("valor_homologado", null);
    // Server Component (renderiza 1× por request) — Date.now é determinístico aqui.
    // eslint-disable-next-line react-hooks/purity
    const d90 = new Date(Date.now() - 90 * 86400000).toISOString();
    abertos = (await base()).count ?? 0;
    pub90 = (await base().gte("data_publicacao", d90)).count ?? 0;
  }

  // Pipeline (oportunidades por estágio)
  const { data: oports } = await supabase.from("oportunidade").select("stage, numero_controle_pncp");
  const stageCount: Record<string, number> = {};
  for (const o of oports ?? []) stageCount[o.stage] = (stageCount[o.stage] ?? 0) + 1;
  const monitorando = stageCount["monitorando"] ?? 0;
  const noFunil = (oports ?? []).filter((o) => o.stage !== "descartado").length;

  // Documentos: prontidão + vencendo ≤30d
  const { data: docs } = await supabase.from("documento").select("tipo, tipo_label, vencimento");
  const docByTipo: Record<string, { vencimento: string }> = {};
  for (const d of docs ?? []) docByTipo[d.tipo] = d;
  const aplicaveis = itensAplicaveis(segmentos.length ? segmentos : ["generico"]);
  const { pct } = calcProntidao(aplicaveis, docByTipo);
  const vencendo = (docs ?? [])
    .map((d) => ({ ...d, dias: diasAteVencer(d.vencimento), st: statusCertidao(d.vencimento) }))
    .filter((d) => d.st !== "ATIVO")
    .sort((a, b) => a.dias - b.dias);

  // Atacar hoje: top abertos do nicho (excluindo descartados)
  const descartados = new Set((oports ?? []).filter((o) => o.stage === "descartado").map((o) => o.numero_controle_pncp));
  let atacar: { numero_controle_pncp: string; objeto: string | null; data_publicacao: string | null; orgao: { razao_social: string | null } | null }[] = [];
  if (temNicho) {
    const { data } = await supabase.from("raw_editais")
      .select("numero_controle_pncp, objeto, data_publicacao, orgao:cnpj_orgao(razao_social)")
      .overlaps("segmentos", segmentos).eq("cidade", cidade).is("valor_homologado", null)
      .order("data_publicacao", { ascending: false }).limit(8);
    atacar = ((data ?? []) as unknown as typeof atacar).filter((e) => !descartados.has(e.numero_controle_pncp)).slice(0, 5);
  }

  return (
    <div className="space-y-5">
      {/* KPIs reais */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Kpi icon={RadarIcon} label="Editais abertos (nicho)" value={abertos} hint={cidade ?? "defina nicho"} href="/radar" />
        <Kpi icon={Flame} label="Novos em 90 dias" value={pub90} hint="publicados recentemente" href="/radar" />
        <Kpi icon={Eye} label="Monitorando" value={monitorando} hint={`${noFunil} no funil`} href="/radar" />
        <Kpi icon={Gauge} label="Prontidão" value={`${pct}%`} hint="habilitação (Lei 14.133)" href="/empresa" />
        <Kpi icon={ShieldAlert} label="Docs vencendo" value={vencendo.length} hint="≤30 dias ou vencidos" href="/empresa" />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Atacar hoje */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2 text-base"><Flame className="size-4 text-primary" /> Atacar hoje</CardTitle>
            <Button asChild variant="ghost" size="sm"><Link href="/radar">Ver Radar <ArrowRight className="size-4" /></Link></Button>
          </CardHeader>
          <CardContent>
            {!temNicho ? (
              <p className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">Defina seu nicho em Minha Empresa para ver oportunidades.</p>
            ) : atacar.length === 0 ? (
              <p className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">Sem editais abertos do seu nicho agora.</p>
            ) : (
              <ul className="divide-y">
                {atacar.map((e) => (
                  <li key={e.numero_controle_pncp} className="flex items-start gap-3 py-2.5">
                    <Building2 className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{e.orgao?.razao_social ?? "Órgão"}</p>
                      <p className="line-clamp-1 text-xs text-muted-foreground">{e.objeto}</p>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">{e.data_publicacao ? dataBR(e.data_publicacao.slice(0, 10)) : ""}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Pipeline por estágio */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><GitBranch className="size-4 text-primary" /> Pipeline</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {STAGES.map((s) => (
              <div key={s.key} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{s.label}</span>
                <Badge variant={stageCount[s.key] ? "secondary" : "muted"}>{stageCount[s.key] ?? 0}</Badge>
              </div>
            ))}
            {noFunil === 0 && <p className="pt-1 text-xs text-muted-foreground">Monitore editais no Radar para preencher o funil.</p>}
          </CardContent>
        </Card>
      </div>

      {/* Documentos vencendo + Prontidão */}
      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><CalendarClock className="size-4 text-primary" /> Documentos a renovar</CardTitle></CardHeader>
          <CardContent>
            {vencendo.length === 0 ? (
              <p className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">Nenhum documento vencido ou a vencer nos próximos 30 dias.</p>
            ) : (
              <ul className="divide-y">
                {vencendo.map((d) => (
                  <li key={d.tipo} className="flex items-center gap-3 py-2.5">
                    <Badge variant={d.st === "VENCIDO" ? "destructive" : "warning"}>{d.st === "VENCIDO" ? "Vencido" : "A renovar"}</Badge>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">{d.tipo_label || CERTIDAO_LABEL[d.tipo] || d.tipo}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">{dataBR(d.vencimento)} · {d.dias < 0 ? `há ${-d.dias}d` : `em ${d.dias}d`}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Gauge className="size-4 text-primary" /> Prontidão</CardTitle></CardHeader>
          <CardContent>
            <p className={`text-4xl font-extrabold ${pct >= 80 ? "text-success" : pct >= 50 ? "text-warning" : "text-destructive"}`}>{pct}%</p>
            <p className="mt-1 text-sm text-muted-foreground">habilitação obrigatória</p>
            <Progress value={pct} className="mt-3" />
            <Button asChild variant="outline" size="sm" className="mt-3 w-full"><Link href="/empresa">Completar documentos</Link></Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
