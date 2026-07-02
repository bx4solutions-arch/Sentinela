// lib/formatar.ts — helpers de formatação compartilhados (extraídos de
// pesquisar-licitacoes na Fase A). Nunca inventam dado, só formatam o que existe.

export function formatarData(iso: string | null): string {
  if (!iso) return "Não informado";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Não informado";
  return d.toLocaleDateString("pt-BR");
}

export function formatarDataHora(iso: string | null): string {
  if (!iso) return "Não informado";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Não informado";
  return `${d.toLocaleDateString("pt-BR")} às ${d.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

export function formatarMoeda(v: number | null): string {
  if (v === null || v === undefined) return "Não informado";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
