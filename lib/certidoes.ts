/** Tipos de certidão/documento do Vigia. Chaves = enum certidao_tipo no banco. */
export const CERTIDAO_TIPOS: { key: string; label: string }[] = [
  { key: "fiscal_federal", label: "CND Federal (RFB/PGFN)" },
  { key: "fgts", label: "FGTS (CRF)" },
  { key: "trabalhista", label: "CNDT (Trabalhista)" },
  { key: "estadual", label: "CND Estadual (SEFAZ)" },
  { key: "municipal", label: "CND Municipal" },
  { key: "licenca", label: "Licença / Sanitária" },
  { key: "alvara", label: "Alvará de funcionamento" },
  { key: "atestado", label: "Atestado de Capacidade Técnica" },
];

export const CERTIDAO_LABEL: Record<string, string> = Object.fromEntries(
  CERTIDAO_TIPOS.map((t) => [t.key, t.label])
);

export type SemaforoStatus = "ATIVO" | "A_RENOVAR" | "VENCIDO";

/** Semáforo a partir do vencimento: VENCIDO < hoje; A_RENOVAR ≤30d; senão ATIVO. */
export function statusCertidao(vencimento: string, hoje = new Date()): SemaforoStatus {
  const venc = new Date(vencimento + "T00:00:00");
  const ref = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  const dias = Math.floor((venc.getTime() - ref.getTime()) / 86_400_000);
  if (dias < 0) return "VENCIDO";
  if (dias <= 30) return "A_RENOVAR";
  return "ATIVO";
}

/** Dias restantes até o vencimento (negativo = vencido). */
export function diasAteVencer(vencimento: string, hoje = new Date()): number {
  const venc = new Date(vencimento + "T00:00:00");
  const ref = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  return Math.floor((venc.getTime() - ref.getTime()) / 86_400_000);
}

export const STATUS_META: Record<SemaforoStatus, { label: string; badge: "success" | "warning" | "destructive" }> = {
  ATIVO: { label: "Ativo", badge: "success" },
  A_RENOVAR: { label: "A renovar", badge: "warning" },
  VENCIDO: { label: "Vencido", badge: "destructive" },
};
