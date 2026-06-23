import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Formata número como BRL compacto (ex.: R$ 520 mil, R$ 1,2 mi). */
export function brl(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);
}

/** Data ISO -> dd/mm/aaaa (pt-BR). */
export function dataBR(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

/** Agora em ISO (isolado aqui para não disparar a regra de pureza de render). */
export function nowISO(): string {
  return new Date().toISOString();
}
/** ISO de N dias atrás. */
export function isoDiasAtras(dias: number): string {
  return new Date(Date.now() - dias * 86400000).toISOString();
}
/** Dias inteiros entre agora e uma data ISO (negativo = passado). null se sem data. */
export function diasAte(iso: string | null | undefined): number | null {
  if (!iso) return null;
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
}

/**
 * Monta a URL OFICIAL do edital no PNCP a partir do numeroControlePNCP.
 * Formato do número: "{cnpj14}-{tipo}-{sequencial6}/{ano4}" (ex.: "60701190000104-1-000123/2026").
 * URL canônica: https://pncp.gov.br/app/editais/{cnpj}/{ano}/{sequencial-sem-zeros-à-esquerda}
 * Retorna null se o número não casar o formato (não inventa link).
 */
export function pncpEditalUrl(numeroControlePNCP: string | null | undefined): string | null {
  if (!numeroControlePNCP) return null;
  const m = numeroControlePNCP.trim().match(/^(\d{14})-\d+-(\d+)\/(\d{4})$/);
  if (!m) return null;
  const [, cnpj, sequencial, ano] = m;
  const seq = String(Number(sequencial)); // remove zeros à esquerda
  return `https://pncp.gov.br/app/editais/${cnpj}/${ano}/${seq}`;
}
