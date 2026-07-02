// components/widgets/alvo-card.tsx
// Widget "Alvo Quente" — extraído de app/dashboard/page.tsx (Fase A), sem
// mudança visual. Será um dos blocos {widget, props} da UI generativa (Fase B).

import React from "react";

export interface AlvoCardProps {
  cor: "verde" | "amarelo";
  orgao: string;
  texto: React.ReactNode;
  scores: string[];
  last?: boolean;
}

export function AlvoCard({ cor, orgao, texto, scores, last }: AlvoCardProps) {
  const dot =
    cor === "verde"
      ? "bg-verde shadow-[0_0_0_4px_rgba(22,163,74,.15)]"
      : "bg-amarelo shadow-[0_0_0_4px_rgba(245,158,11,.15)]";
  return (
    <div
      className={[
        "flex items-center gap-3.5 py-3.5",
        last ? "" : "border-b border-borda",
      ].join(" ")}
    >
      <span className={`h-[11px] w-[11px] shrink-0 rounded-full ${dot}`} />
      <div className="min-w-0 flex-1">
        <b className="font-display text-sm font-semibold text-indigo-deep">
          {orgao}
        </b>
        <p className="mt-0.5 text-xs text-cinza">{texto}</p>
      </div>
      <div className="hidden gap-1.5 md:flex">
        {scores.map((s) => (
          <span
            key={s}
            className="rounded-[7px] bg-[#F1F5F9] px-2 py-[3px] font-display text-[11px] font-semibold text-indigo-deep"
          >
            {s}
          </span>
        ))}
      </div>
      <a href="#" className="whitespace-nowrap text-xs font-semibold text-violeta">
        Ver Raio-X →
      </a>
    </div>
  );
}
