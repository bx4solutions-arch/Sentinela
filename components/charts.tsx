"use client";

import {
  ResponsiveContainer, RadialBarChart, RadialBar, PolarAngleAxis,
  PieChart, Pie, Cell, AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip,
} from "recharts";

// Paleta SEM VERDE (regra do Bione): navy/azul/âmbar/slate/vermelho.
const NAVY = "#1E44AE";
const BLUE = "#3C83F6";
const AMBER = "#F59F0A";
const SLATE = "#94A3B8";
const GRID = "hsl(214 32% 91%)";

function ringColor(v: number) {
  if (v >= 75) return NAVY;
  if (v >= 50) return AMBER;
  return SLATE;
}

/** Anel de PRIORIDADE (0–100). Rótulo é "prioridade", nunca "% de chance". */
export function ScoreRing({ value, size = 60 }: { value: number; size?: number }) {
  const color = ringColor(value);
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart innerRadius="72%" outerRadius="100%" data={[{ value }]} startAngle={90} endAngle={-270}>
          <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
          <RadialBar dataKey="value" angleAxisId={0} background={{ fill: GRID }} cornerRadius={20} fill={color} />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        <span className="text-sm font-bold tabular-nums" style={{ color }}>{value}</span>
      </div>
    </div>
  );
}

export type DonutDatum = { nome: string; valor: number; cor?: string };
const DONUT_CORES = [NAVY, BLUE, AMBER, SLATE, "#7C3AED", "#0891B2"];

/** Donut por segmento (dado real). */
export function DonutSegmento({ data, totalLabel }: { data: DonutDatum[]; totalLabel: string }) {
  const total = data.reduce((s, d) => s + d.valor, 0) || 1;
  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <div className="relative h-[150px] w-[150px] shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="valor" nameKey="nome" innerRadius={48} outerRadius={70} paddingAngle={2} strokeWidth={0}>
              {data.map((d, i) => <Cell key={d.nome} fill={d.cor ?? DONUT_CORES[i % DONUT_CORES.length]} />)}
            </Pie>
            <Tooltip formatter={(v, n) => [`${v}`, String(n)]} contentStyle={{ borderRadius: 8, border: `1px solid ${GRID}`, fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[10px] text-muted-foreground">Total</span>
          <span className="text-sm font-bold">{totalLabel}</span>
        </div>
      </div>
      <ul className="flex-1 space-y-1.5">
        {data.map((d, i) => (
          <li key={d.nome} className="flex items-center gap-2 text-sm">
            <span className="size-2.5 rounded-full" style={{ background: d.cor ?? DONUT_CORES[i % DONUT_CORES.length] }} />
            <span className="flex-1 text-muted-foreground">{d.nome}</span>
            <span className="w-12 text-right text-xs text-muted-foreground tabular-nums">{Math.round((d.valor / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export type TrendDatum = { mes: string; editais: number };

/** Linha/área de editais publicados por mês (dado real). */
export function LineTendencia({ data }: { data: TrendDatum[] }) {
  return (
    <div className="h-[180px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
          <defs>
            <linearGradient id="gnavy" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={NAVY} stopOpacity={0.18} />
              <stop offset="100%" stopColor={NAVY} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={GRID} />
          <XAxis dataKey="mes" fontSize={11} tickLine={false} axisLine={false} />
          <YAxis fontSize={11} tickLine={false} axisLine={false} width={32} allowDecimals={false} />
          <Tooltip contentStyle={{ borderRadius: 8, border: `1px solid ${GRID}`, fontSize: 12 }} />
          <Area type="monotone" dataKey="editais" name="Editais publicados" stroke={NAVY} strokeWidth={2.5} fill="url(#gnavy)" dot={{ r: 2 }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
