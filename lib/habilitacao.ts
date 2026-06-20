import { statusCertidao } from "@/lib/certidoes";

/** Item da checklist de habilitação (Lei 14.133). key = enum certidao_tipo. */
export type ChecklistItem = { key: string; label: string; orgao: string };

/** Base — exigida de todo licitante. */
export const BASE: ChecklistItem[] = [
  { key: "fiscal_federal", label: "CND Federal (Receita/PGFN)", orgao: "Receita Federal / PGFN" },
  { key: "fgts", label: "CRF / FGTS", orgao: "Caixa Econômica" },
  { key: "trabalhista", label: "CNDT (Trabalhista)", orgao: "TST" },
  { key: "estadual", label: "CND Estadual", orgao: "SEFAZ estadual" },
  { key: "municipal", label: "CND Municipal", orgao: "Prefeitura" },
  { key: "falencia", label: "Falência / Recuperação Judicial", orgao: "Distribuidor cível" },
];

/** Setoriais por nicho. */
export const SETORIAIS: Record<string, ChecklistItem[]> = {
  "controle-de-pragas": [
    { key: "sanitaria", label: "Licença Sanitária / Vigilância", orgao: "Vigilância Sanitária" },
    { key: "ambiental", label: "Licença Ambiental", orgao: "Órgão ambiental" },
    { key: "resp_tecnico", label: "Responsável Técnico (CRQ/CRBio)", orgao: "Conselho de classe" },
  ],
};

/** Itens obrigatórios aplicáveis = base + setoriais dos nichos da empresa (sem duplicar). */
export function itensAplicaveis(nichos: string[]): ChecklistItem[] {
  const out = [...BASE];
  const seen = new Set(out.map((i) => i.key));
  for (const n of nichos ?? []) {
    for (const it of SETORIAIS[n] ?? []) {
      if (!seen.has(it.key)) {
        out.push(it);
        seen.add(it.key);
      }
    }
  }
  return out;
}

export type ItemStatus = "valida" | "a_renovar" | "vencida" | "ausente";

export const ITEM_STATUS_META: Record<ItemStatus, { label: string; badge: "success" | "warning" | "destructive" | "muted" }> = {
  valida: { label: "Válida", badge: "success" },
  a_renovar: { label: "A renovar", badge: "warning" },
  vencida: { label: "Vencida", badge: "destructive" },
  ausente: { label: "Ausente", badge: "destructive" },
};

/** Status de um item da checklist a partir da certidão cadastrada (ou ausência). */
export function statusItem(cert?: { vencimento: string } | null, hoje = new Date()): ItemStatus {
  if (!cert) return "ausente";
  const s = statusCertidao(cert.vencimento, hoje);
  return s === "ATIVO" ? "valida" : s === "A_RENOVAR" ? "a_renovar" : "vencida";
}

/** Prontidão = itens válidos ÷ itens aplicáveis (a_renovar conta como válido). */
export function calcProntidao(
  aplicaveis: ChecklistItem[],
  certByTipo: Record<string, { vencimento: string } | undefined>,
  hoje = new Date()
): { pct: number; validos: number; total: number } {
  const total = aplicaveis.length;
  const validos = aplicaveis.filter((it) => {
    const st = statusItem(certByTipo[it.key], hoje);
    return st === "valida" || st === "a_renovar";
  }).length;
  return { pct: total ? Math.round((validos / total) * 100) : 0, validos, total };
}
