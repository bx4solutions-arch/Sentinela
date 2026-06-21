// Sinais do card de licitação — SÓ os que têm dado real hoje.
// Sem dado (deserta, contrato-vencendo, baixa-concorrência) → NÃO renderiza (em ingestão).

export type SinalTone = "red" | "amber" | "navy" | "slate";
export type Sinal = { tipo: string; label: string; tone: SinalTone };

export type EditalSinal = {
  cnpj_orgao: string | null;
  situacao_nome: string | null;
  data_encerramento: string | null;
};

export function sinaisEdital(e: EditalSinal, recorrentes: Set<string>, hoje = new Date()): Sinal[] {
  const out: Sinal[] = [];

  // Prazo apertado (data_encerramento futura) — urgência
  if (e.data_encerramento) {
    const venc = new Date(e.data_encerramento);
    const dias = Math.floor((venc.getTime() - hoje.getTime()) / 86_400_000);
    if (dias >= 0 && dias <= 7) out.push({ tipo: "prazo", label: `encerra em ${dias}d`, tone: "red" });
    else if (dias > 7 && dias <= 15) out.push({ tipo: "prazo", label: `encerra em ${dias}d`, tone: "amber" });
  }

  // Órgão recorrente (tem histórico homologado no nicho)
  if (e.cnpj_orgao && recorrentes.has(e.cnpj_orgao)) out.push({ tipo: "recorrencia", label: "órgão recorrente", tone: "navy" });

  // Suspensa → pode republicar
  if ((e.situacao_nome ?? "").toLowerCase().includes("suspens")) out.push({ tipo: "suspensa", label: "suspensa · pode republicar", tone: "amber" });

  return out;
}

export const SINAL_BADGE: Record<SinalTone, "destructive" | "warning" | "secondary" | "muted"> = {
  red: "destructive", amber: "warning", navy: "secondary", slate: "muted",
};
