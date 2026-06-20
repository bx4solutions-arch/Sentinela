"use client";

import {
  ResponsiveContainer, RadialBarChart, RadialBar, PolarAngleAxis,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, Legend,
} from "recharts";
import { CHART, SEGMENTOS, SEGMENTO_TOTAL, TENDENCIA } from "@/lib/dashboard-mock";
import { cn } from "@/lib/utils";

/* Cor do score por faixa (prioridade, não probabilidade). */
function ringColor(v: number) {
  if (v >= 75) return CHART.emerald;
  if (v >= 50) return CHART.amber;
  return CHART.slate;
}

/** Anel de PRIORIDADE (0–100). O rótulo é "Prioridade", nunca "% de chance". */
export function ScoreRing({ value, size = 72 }: { value: number; size?: number }) {
  const color = ringColor(value);
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart innerRadius="74%" outerRadius="100%" data={[{ value }]} startAngle={90} endAngle={-270}>
          <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
          <RadialBar dataKey="value" angleAxisId={0} background={{ fill: "hsl(214 32% 91%)" }} cornerRadius={20} fill={color} />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        <span className="text-lg font-bold tabular-nums" style={{ color }}>{value}</span>
        <span className="text-[9px] text-muted-foreground">/100</span>
      </div>
    </div>
  );
}

/** Donut de segmento com total central + legenda %. */
export function DonutSegmento() {
  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <div className="relative h-[180px] w-[180px] shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={SEGMENTOS} dataKey="pct" nameKey="nome" innerRadius={58} outerRadius={84} paddingAngle={2} strokeWidth={0}>
              {SEGMENTOS.map((s) => <Cell key={s.nome} fill={s.cor} />)}
            </Pie>
            <Tooltip
              formatter={(v, n) => [`${v ?? ""}%`, String(n)]}
              contentStyle={{ borderRadius: 8, border: "1px solid hsl(214 32% 91%)", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)", fontSize: 12 }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[10px] text-muted-foreground">Total</span>
          <span className="text-sm font-bold">{SEGMENTO_TOTAL}</span>
        </div>
      </div>
      <ul className="flex-1 space-y-1.5">
        {SEGMENTOS.map((s) => (
          <li key={s.nome} className="flex items-center gap-2 text-sm">
            <span className="size-2.5 rounded-full" style={{ background: s.cor }} />
            <span className="flex-1 text-muted-foreground">{s.nome}</span>
            <span className="font-medium tabular-nums">R$ {s.valor.toFixed(2).replace(".", ",")} Mi</span>
            <span className="w-9 text-right text-xs text-muted-foreground tabular-nums">{s.pct}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Linha de tendência: oportunidades identificadas × editais publicados (6 meses). */
export function LineTendencia() {
  return (
    <div className="h-[240px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={TENDENCIA} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART.grid} />
          <XAxis dataKey="mes" fontSize={11} tickLine={false} axisLine={false} />
          <YAxis fontSize={11} tickLine={false} axisLine={false} width={32} />
          <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(214 32% 91%)", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)", fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
          <Line type="monotone" dataKey="identificadas" name="Identificadas" stroke={CHART.primary} strokeWidth={2.5} dot={{ r: 3 }} />
          <Line type="monotone" dataKey="publicados" name="Editais publicados" stroke={CHART.emerald} strokeWidth={2.5} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export { cn };
