// components/widgets/metric-card.tsx
// Métrica rótulo+valor com ícone — extraído do Meta de app/dashboard/raio-x
// (Fase A), sem mudança visual.

import React from "react";

export interface MetricCardProps {
  icon?: React.ReactNode;
  label: string;
  valor: string;
}

export function MetricCard({ icon, label, valor }: MetricCardProps) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-[11px] text-cinza">
        {icon}
        {label}
      </div>
      <div className="mt-0.5 font-display text-[13px] font-semibold text-indigo-deep">{valor}</div>
    </div>
  );
}
