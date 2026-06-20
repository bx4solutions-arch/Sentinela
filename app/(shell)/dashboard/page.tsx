import { Card, CardContent, Button, Badge } from "@/components/ui";
import { DonutSegmento, LineTendencia } from "@/components/charts";
import {
  KpiCard, AtacarHojeCard, PlanoAcaoList, SinaisTimeline, PipelineEstagio, topDemandsAtacarHoje,
} from "@/components/dashboard";
import { KPIS, SINAIS, TAREFAS } from "@/lib/dashboard-mock";
import { DEMANDS } from "@/lib/mock";
import { CalendarDays, SlidersHorizontal, Target, CheckCircle2, GitBranch, Activity, PieChart, TrendingUp, ArrowRight } from "lucide-react";

function SectionCard({ icon: Icon, title, sub, action, children, className = "" }: { icon: React.ElementType; title: string; sub?: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <Card className={`border-border/60 shadow-sm ${className}`}>
      <div className="flex items-start justify-between gap-2 px-4 pt-4">
        <div className="flex items-center gap-2">
          <Icon className="size-4 text-primary" />
          <div>
            <h2 className="text-sm font-semibold leading-none">{title}</h2>
            {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
          </div>
        </div>
        {action}
      </div>
      <CardContent className="p-4">{children}</CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const atacar = topDemandsAtacarHoje(DEMANDS, 3);

  return (
    <div className="space-y-4">
      {/* Filtro de data + Filtros */}
      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" size="sm"><CalendarDays className="size-4" />Hoje (19/06/2026)</Button>
        <Button variant="outline" size="sm"><SlidersHorizontal className="size-4" />Filtros</Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
        {KPIS.map((k) => <KpiCard key={k.key} kpi={k} />)}
      </div>

      {/* Atacar Hoje + Plano de Ação */}
      <div className="grid gap-4 lg:grid-cols-3">
        <SectionCard className="lg:col-span-2" icon={Target} title="Atacar Hoje" sub="Oportunidades prioritárias para ação imediata"
          action={<Button variant="link" size="sm" className="h-auto p-0 text-primary">Ver todas <ArrowRight className="size-3.5" /></Button>}>
          <div className="grid gap-3 md:grid-cols-3">
            {atacar.map((d) => <AtacarHojeCard key={d.id} demand={d} />)}
          </div>
        </SectionCard>

        <SectionCard icon={CheckCircle2} title="Plano de Ação da Semana" sub={`${TAREFAS.length} tarefas`}>
          <PlanoAcaoList tarefas={TAREFAS} />
          <Button variant="link" size="sm" className="mt-2 h-auto p-0 text-primary">Ver todas as tarefas <ArrowRight className="size-3.5" /></Button>
        </SectionCard>
      </div>

      {/* Pipeline por Estágio + Sinais */}
      <div className="grid gap-4 lg:grid-cols-3">
        <SectionCard className="lg:col-span-2" icon={GitBranch} title="Pipeline por Estágio" sub="Total monitorado: R$ 4,82 Mi em 102 oportunidades">
          <PipelineEstagio />
        </SectionCard>
        <SectionCard icon={Activity} title="Linha do Tempo de Sinais Oficiais"
          action={<Button variant="link" size="sm" className="h-auto p-0 text-primary">Ver todo</Button>}>
          <SinaisTimeline sinais={SINAIS} />
        </SectionCard>
      </div>

      {/* Donut + Linha */}
      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard icon={PieChart} title="Pipeline por Segmento"
          action={<Badge variant="muted" className="text-[10px]">R$ 4,82 Mi</Badge>}>
          <DonutSegmento />
        </SectionCard>
        <SectionCard icon={TrendingUp} title="Tendência de Oportunidades" sub="Identificadas × editais publicados · últimos 6 meses">
          <LineTendencia />
        </SectionCard>
      </div>
    </div>
  );
}
