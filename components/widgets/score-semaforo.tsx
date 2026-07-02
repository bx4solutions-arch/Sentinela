// components/widgets/score-semaforo.tsx
// Semáforo do Raio-X: banda de score, Gauge circular, eixo com drivers.
// Extraído de app/dashboard/raio-x/page.tsx (Fase A), sem mudança visual.

import React from "react";

/* ---------- bandas do semáforo (só usada quando existe pontuação de verdade) ---------- */
export type Banda = { label: string; hex: string; bg: string; texto: string };

export function banda(score: number): Banda {
  if (score >= 66)
    return { label: "Verde", hex: "#16A34A", bg: "#DCFCE7", texto: "#15803D" };
  if (score >= 45)
    return { label: "Amarelo", hex: "#F59E0B", bg: "#FEF3E2", texto: "#B45309" };
  return { label: "Vermelho", hex: "#DC2626", bg: "#FDE7E7", texto: "#B91C1C" };
}

export function Gauge({ score, size = 76 }: { score: number; size?: number }) {
  const stroke = 8;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, score));
  const dash = (pct / 100) * c;
  const col = banda(score).hex;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#EEF2F7" strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={col}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${dash} ${c - dash}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="20"
        fontWeight="700"
        fill="#1E1B4B"
        style={{ fontFamily: "var(--font-sora)" }}
      >
        {score}
      </text>
    </svg>
  );
}

export function SubScore({
  titulo,
  pergunta,
  score,
  drivers,
  pesaMais,
}: {
  titulo: string;
  pergunta: string;
  score: number;
  drivers: string[][];
  pesaMais?: boolean;
}) {
  const b = banda(score);
  return (
    <div
      className="rounded-2xl border bg-white p-[22px]"
      style={{ borderColor: pesaMais ? "#EAD9F7" : "var(--color-borda)" }}
    >
      <div className="mb-4 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-display text-[15px] font-semibold text-indigo-deep">{titulo}</h3>
            {pesaMais && (
              <span className="rounded-full bg-[#EDE7FB] px-2 py-0.5 font-display text-[9px] font-bold uppercase tracking-wide text-violeta">
                pesa mais
              </span>
            )}
          </div>
          <p className="mt-0.5 text-[12px] text-cinza">{pergunta}</p>
        </div>
        <Gauge score={score} />
      </div>

      <ul className="space-y-2">
        {drivers.map(([k, v]) => (
          <li key={k} className="flex items-start gap-2 text-[12.5px]">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: b.hex }} />
            <span className="text-cinza">
              <b className="font-semibold text-indigo-deep">{k}:</b> {v}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Versão do eixo pra dado real: score pode ser null (ainda não pontuado manualmente). */
export function EixoReal({
  titulo,
  pergunta,
  explicacao,
  score,
  drivers,
  pesaMais,
}: {
  titulo: string;
  pergunta: string;
  explicacao: string;
  score: number | null;
  drivers: [string, string][];
  pesaMais?: boolean;
}) {
  return (
    <div
      className="rounded-2xl border bg-white p-[22px]"
      style={{ borderColor: pesaMais ? "#EAD9F7" : "var(--color-borda)" }}
    >
      <div className="mb-4 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-display text-[15px] font-semibold text-indigo-deep">{titulo}</h3>
            {pesaMais && (
              <span className="rounded-full bg-[#EDE7FB] px-2 py-0.5 font-display text-[9px] font-bold uppercase tracking-wide text-violeta">
                pesa mais
              </span>
            )}
          </div>
          <p className="mt-0.5 text-[12px] text-cinza">{pergunta}</p>
          <p className="mt-0.5 text-[11px] italic text-cinza">{explicacao}</p>
        </div>
        {score !== null ? (
          <Gauge score={score} />
        ) : (
          <span className="grid h-[76px] w-[76px] shrink-0 place-items-center rounded-full border-2 border-dashed border-borda font-display text-[12px] font-semibold text-cinza">
            s/ nota
          </span>
        )}
      </div>

      <ul className="space-y-2">
        {drivers.map(([k, v], i) => (
          <li key={`${k}-${i}`} className="flex items-start gap-2 text-[12.5px]">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#94A3B8]" />
            <span className="text-cinza">
              <b className="font-semibold text-indigo-deep">{k}:</b> {v}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
