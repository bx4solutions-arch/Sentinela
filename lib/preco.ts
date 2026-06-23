// Motor de Preço (Bloco 4 / M2) — IN-APP (sem VPS por agora).
// "Quanto cobrar": faixa saneada (IQR) de CONTRATOS firmados comparáveis + CV semáforo +
// recusa honesta + risco de inexequibilidade. NÃO é recomendação: a empresa decide o preço.
// Migração pro motor canônico na VPS (M1 + price_references) fica para o gate de infra.

export type Semaforo = "verde" | "amarelo" | "vermelho";
export type FaixaPreco = {
  n: number;
  min: number; max: number; mediana: number; q1: number; q3: number;
  cv: number;              // coeficiente de variação (dispersão)
  semaforo: Semaforo;      // confiabilidade da faixa pela dispersão
  confiavel: boolean;      // false = recusa honesta (amostra pequena/dispersa)
  motivoRecusa: string | null;
  // frame vendedor (referências, não recomendação):
  segura: number;          // mediana — margem confortável
  vencedora: number;       // ~Q1 — competitivo, faixa que historicamente vence
  agressiva: number;       // perto do piso — alta chance, alto risco
  pisoInexequivel: number; // abaixo disto = risco de inexequibilidade (referência Lei 14.133, art. 59)
};

const percentil = (xs: number[], p: number) => {
  if (xs.length === 0) return 0;
  const i = (xs.length - 1) * p;
  const lo = Math.floor(i), hi = Math.ceil(i);
  return lo === hi ? xs[lo] : xs[lo] + (xs[hi] - xs[lo]) * (i - lo);
};

/** Saneia uma amostra de valores (contratos comparáveis) e devolve a faixa + semáforo + recusa. */
export function motorPreco(valoresBrutos: (number | null | undefined)[]): FaixaPreco | null {
  // remove nulos/zeros e outliers grosseiros por IQR (Tukey) antes de estatística
  const todos = valoresBrutos.map((v) => Number(v)).filter((v) => Number.isFinite(v) && v > 0).sort((a, b) => a - b);
  if (todos.length === 0) return null;
  const q1b = percentil(todos, 0.25), q3b = percentil(todos, 0.75);
  const iqr = q3b - q1b;
  const lim = iqr > 0 ? [q1b - 1.5 * iqr, q3b + 1.5 * iqr] : [todos[0], todos[todos.length - 1]];
  const xs = todos.filter((v) => v >= lim[0] && v <= lim[1]);
  const base = xs.length >= 3 ? xs : todos; // se o filtro zerou demais, usa a amostra crua

  const n = base.length;
  const min = base[0], max = base[n - 1];
  const mediana = percentil(base, 0.5), q1 = percentil(base, 0.25), q3 = percentil(base, 0.75);
  const media = base.reduce((s, v) => s + v, 0) / n;
  const std = Math.sqrt(base.reduce((s, v) => s + (v - media) ** 2, 0) / n);
  const cv = media > 0 ? std / media : 0;

  const semaforo: Semaforo = cv <= 0.35 ? "verde" : cv <= 0.7 ? "amarelo" : "vermelho";
  // recusa honesta: amostra pequena OU dispersão alta demais → faixa não confiável
  let confiavel = true; let motivoRecusa: string | null = null;
  if (n < 5) { confiavel = false; motivoRecusa = `Amostra pequena (${n} contratos) — faixa apenas indicativa.`; }
  else if (cv > 1.0) { confiavel = false; motivoRecusa = `Dispersão muito alta (CV ${(cv * 100).toFixed(0)}%) — itens provavelmente heterogêneos; não use como referência direta.`; }

  // referência de inexequibilidade (Lei 14.133, art. 59, §4 — exequibilidade): heurística 75% da mediana.
  const pisoInexequivel = Math.round(mediana * 0.75);

  return {
    n, min, max, mediana, q1, q3, cv, semaforo, confiavel, motivoRecusa,
    segura: Math.round(mediana),
    vencedora: Math.round(q1),
    agressiva: Math.round(Math.max(pisoInexequivel * 1.05, min)),
    pisoInexequivel,
  };
}

export const SEMAFORO_LABEL: Record<Semaforo, string> = {
  verde: "faixa consistente",
  amarelo: "dispersão moderada",
  vermelho: "muito disperso",
};
