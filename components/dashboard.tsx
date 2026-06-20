import Link from "next/link";
import {
  BarChart3, Flame, CalendarClock, Clock, AlertTriangle, ArrowUpRight, ArrowDownRight,
  Building2, CheckSquare, Eye, Plus,
} from "lucide-react";
import { Card, CardContent, Badge, Button } from "@/components/ui";
import { ScoreRing } from "@/components/charts";
import { brl } from "@/lib/utils";
import { STAGES, stageIndex, type Demand } from "@/lib/mock";
import { type Kpi, type Sinal, type SinalCor, type Tarefa, type Prioridade, PIPELINE } from "@/lib/dashboard-mock";

const KPI_ICON = { pipeline: BarChart3, fogo: Flame, edital: CalendarClock, relogio: Clock, alerta: AlertTriangle };

export function KpiCard({ kpi }: { kpi: Kpi }) {
  const Icon = KPI_ICON[kpi.icon];
  const tone = kpi.tone === "up" ? "text-success" : kpi.tone === "warn" ? "text-warning" : "text-destructive";
  const Arrow = kpi.tone === "down" ? ArrowDownRight : ArrowUpRight;
  return (
    <Card className="border-border/60 shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="grid size-9 shrink-0 place-items-center rounded-md bg-primary/10">
            <Icon className="size-4 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs text-muted-foreground">{kpi.label}</p>
            <p className="text-2xl font-bold tracking-tight">{kpi.value}</p>
            <p className={`flex items-center gap-1 text-xs font-medium ${tone}`}>
              <Arrow className="size-3" />{kpi.delta}% <span className="font-normal text-muted-foreground">vs. mês anterior</span>
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function AtacarHojeCard({ demand }: { demand: Demand }) {
  const estagio = STAGES.find((s) => s.key === demand.estagioAtual)!;
  return (
    <Card className="border-border/60 shadow-sm transition hover:border-primary/40 hover:shadow-md">
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="flex items-center gap-1 text-xs text-muted-foreground"><Building2 className="size-3" />{demand.org.nome} · {demand.org.cidade}/{demand.org.uf}</p>
            <h3 className="mt-0.5 font-semibold leading-tight">{demand.titulo}</h3>
          </div>
          <ScoreRing value={demand.prioridade} />
        </div>

        <div className="space-y-1 text-sm">
          <Linha label="Valor estimado" value={<span className="font-semibold">{brl(demand.financeiro.valorPrevisto)}</span>} />
          <Linha label="Estágio" value={<span className="font-medium text-primary">{estagio.label} · {estagio.sub}</span>} />
          <Linha label="Janela provável" value={`${new Date(demand.financeiro.janelaInicio).toLocaleDateString("pt-BR", { month: "short" })}–${new Date(demand.financeiro.janelaFim).toLocaleDateString("pt-BR", { month: "short" })}`} />
          <Linha label="Ação recomendada" value={<span className="text-foreground/80">{demand.acaoDeHoje}</span>} />
        </div>

        <div className="rounded-md bg-muted/50 px-2.5 py-1.5">
          <p className="text-[11px] font-medium text-foreground/70">Prioridade {demand.prioridade} — porque:</p>
          <div className="mt-1 flex flex-wrap gap-1">
            {demand.porques.map((p) => <Badge key={p} variant="muted" className="text-[10px] font-normal">{p}</Badge>)}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1">
          <Button asChild variant="outline" size="sm"><Link href={`/dossie/${demand.id}`}><Eye className="size-3.5" />Ver dossiê</Link></Button>
          <Button size="sm"><Plus className="size-3.5" />Criar tarefa</Button>
        </div>
      </CardContent>
    </Card>
  );
}
function Linha({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="flex items-baseline justify-between gap-2"><span className="text-muted-foreground">{label}</span><span className="text-right">{value}</span></div>;
}

const PRIO_VARIANT: Record<Prioridade, "destructive" | "warning" | "secondary"> = { Alta: "destructive", Média: "warning", Baixa: "secondary" };
export function PlanoAcaoList({ tarefas }: { tarefas: Tarefa[] }) {
  return (
    <ul className="space-y-1">
      {tarefas.map((t) => (
        <li key={t.titulo} className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-muted/50">
          <CheckSquare className="size-4 shrink-0 text-muted-foreground" />
          <span className="flex-1 text-sm leading-tight">{t.titulo}</span>
          <Badge variant={PRIO_VARIANT[t.prioridade]} className="text-[10px]">{t.prioridade}</Badge>
          <span className="w-24 shrink-0 text-right text-[11px] text-muted-foreground">{t.prazo}</span>
        </li>
      ))}
    </ul>
  );
}

const DOT: Record<SinalCor, string> = {
  emerald: "bg-emerald-500", amber: "bg-amber-500", primary: "bg-primary",
  destructive: "bg-destructive", slate: "bg-slate-400", teal: "bg-teal-500",
};
export function SinaisTimeline({ sinais }: { sinais: Sinal[] }) {
  return (
    <ul className="relative space-y-3 before:absolute before:left-[5px] before:top-1 before:h-[calc(100%-12px)] before:w-px before:bg-border">
      {sinais.map((s, i) => (
        <li key={i} className="relative flex gap-3 pl-0">
          <span className={`relative z-10 mt-1 size-2.5 shrink-0 rounded-full ${DOT[s.cor]}`} />
          <div className="min-w-0 flex-1">
            <p className="text-sm leading-snug">{s.texto}</p>
            <p className="text-[11px] text-muted-foreground">{s.quando}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function PipelineEstagio() {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
      {PIPELINE.map((b) => (
        <div key={b.nome} className="overflow-hidden rounded-md border border-border/60">
          <div className="h-1.5 w-full" style={{ background: b.cor }} />
          <div className="p-2.5">
            <p className="truncate text-[11px] font-medium text-muted-foreground">{b.nome}</p>
            <p className="text-xl font-bold tracking-tight">{b.count}</p>
            <p className="text-[11px] text-muted-foreground">{b.valor}</p>
            <p className="text-[10px] text-muted-foreground">{b.pct}% do total</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export function topDemandsAtacarHoje(demands: Demand[], n = 3): Demand[] {
  return [...demands]
    .filter((d) => stageIndex(d.estagioAtual) <= stageIndex("EDITAL"))
    .sort((a, b) => b.prioridade - a.prioridade)
    .slice(0, n);
}
