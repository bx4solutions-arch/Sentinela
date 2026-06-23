// Pesquisa livre (Bloco 3) — poder ao fornecedor. Só dado real.
import type { createClient } from "@/lib/supabase/server";
import { expandirBusca } from "@/lib/nichos";
import { motorPreco, type FaixaPreco } from "@/lib/preco";
import { nowISO, isoDiasAtras } from "@/lib/utils";

type SB = Awaited<ReturnType<typeof createClient>>;

// ---- Pesquisa COMPLETA: todos os campos que o nosso dado expõe (espelha o PNCP) ----
// Opções fixas (refletem o que existe em raw_editais hoje).
export const MODALIDADES = [
  "Dispensa", "Pregão - Eletrônico", "Inexigibilidade", "Concorrência - Eletrônica",
  "Credenciamento", "Pregão - Presencial", "Concorrência - Presencial", "Leilão - Eletrônico",
];
export const SITUACOES = ["Divulgada no PNCP", "Suspensa", "Revogada", "Anulada"];

export type FiltrosCompleta = {
  objeto?: string; exata?: boolean;
  ufs?: string[]; cidade?: string; modalidades?: string[]; situacao?: string;
  numero?: string; orgao?: string; segmentos?: string[];
  valorMin?: number | null; valorMax?: number | null;
  pubDe?: string; pubAte?: string; encDe?: string; encAte?: string;
  soAbertas?: boolean; pagina?: number; tamanho?: number;
};
export type EditalCompleto = {
  numero: string; objeto: string | null; valor: number | null; situacao: string | null;
  modalidade: string | null; cidade: string | null; uf: string | null;
  dataPub: string | null; dataEnc: string | null; cnpjOrgao: string | null; orgao: string | null;
};
export type ResultadoCompleta = { rows: EditalCompleto[]; total: number; pagina: number; tamanho: number; temFiltro: boolean };

const MORTAS_COMPLETA = '("Revogada","Anulada","Cancelada","Deserta","Fracassada")';

/** Pesquisa completa multi-campo sobre raw_editais. Default = só ABERTAS (reusa a trava de vencidas). */
export async function pesquisaCompleta(sb: SB, f: FiltrosCompleta): Promise<ResultadoCompleta> {
  const tamanho = Math.min(Math.max(f.tamanho ?? 25, 1), 50);
  const pagina = Math.max(0, f.pagina ?? 0);
  const temFiltro = !!(f.objeto || f.ufs?.length || f.cidade || f.modalidades?.length || f.situacao || f.numero || f.orgao || f.segmentos?.length || f.valorMin != null || f.valorMax != null || f.pubDe || f.pubAte || f.encDe || f.encAte);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q: any = sb.from("raw_editais").select(
    "numero_controle_pncp, objeto, valor_estimado, situacao_nome, modalidade_nome, cidade, uf_sigla, data_publicacao, data_encerramento, cnpj_orgao, orgao:cnpj_orgao(razao_social)",
    { count: "exact" },
  );

  if (f.objeto) {
    if (f.exata) q = q.ilike("objeto", `%${f.objeto}%`);
    else { const termos = expandirBusca(f.objeto); if (termos.length) q = q.or(termos.map((t: string) => `objeto.ilike.*${t}*`).join(",")); }
  }
  if (f.ufs?.length) q = q.in("uf_sigla", f.ufs);
  if (f.cidade) q = q.ilike("cidade", `%${f.cidade}%`);
  if (f.modalidades?.length) q = q.in("modalidade_nome", f.modalidades);
  if (f.situacao) q = q.eq("situacao_nome", f.situacao);
  if (f.numero) q = q.ilike("numero_controle_pncp", `%${f.numero}%`);
  if (f.segmentos?.length) q = q.overlaps("segmentos", f.segmentos);
  if (f.valorMin != null) q = q.gte("valor_estimado", f.valorMin);
  if (f.valorMax != null) q = q.lte("valor_estimado", f.valorMax);
  if (f.pubDe) q = q.gte("data_publicacao", f.pubDe);
  if (f.pubAte) q = q.lte("data_publicacao", f.pubAte);
  if (f.encDe) q = q.gte("data_encerramento", f.encDe);
  if (f.encAte) q = q.lte("data_encerramento", f.encAte);
  if (f.orgao) {
    const dig = soDigitos(f.orgao);
    if (dig.length >= 8) q = q.eq("cnpj_orgao", dig);
    else {
      const { data: orgs } = await sb.from("orgao").select("cnpj").ilike("razao_social", `%${f.orgao}%`).limit(80);
      const cnpjs = (orgs ?? []).map((o) => (o as { cnpj: string }).cnpj);
      q = q.in("cnpj_orgao", cnpjs.length ? cnpjs : ["__sem_orgao__"]);
    }
  }
  // Default: só ABERTAS (prazo vigente) — mesma trava da descoberta. Desligável p/ buscar histórico.
  if (f.soAbertas !== false) {
    q = q.is("valor_homologado", null)
      .not("situacao_nome", "in", MORTAS_COMPLETA)
      .or(`data_encerramento.gte.${nowISO()},and(data_encerramento.is.null,data_publicacao.gte.${isoDiasAtras(60)})`);
  }

  const from = pagina * tamanho;
  const { data, count } = await q.order("data_publicacao", { ascending: false }).range(from, from + tamanho - 1);
  const rows: EditalCompleto[] = ((data ?? []) as Record<string, unknown>[]).map((e) => ({
    numero: e.numero_controle_pncp as string, objeto: (e.objeto as string) ?? null, valor: (e.valor_estimado as number) ?? null,
    situacao: (e.situacao_nome as string) ?? null, modalidade: (e.modalidade_nome as string) ?? null,
    cidade: (e.cidade as string) ?? null, uf: (e.uf_sigla as string) ?? null,
    dataPub: (e.data_publicacao as string) ?? null, dataEnc: (e.data_encerramento as string) ?? null,
    cnpjOrgao: (e.cnpj_orgao as string) ?? null, orgao: (e.orgao as { razao_social: string | null } | null)?.razao_social ?? null,
  }));
  return { rows, total: count ?? 0, pagina, tamanho, temFiltro };
}

/** Motor de preço para item+cidade: faixa saneada de contratos firmados do termo na UF. */
export async function faixaItemCidade(sb: SB, termo: string, uf: string): Promise<FaixaPreco | null> {
  const tokens = expandirBusca(termo);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q: any = sb.from("contratos").select("valor_global");
  if (tokens.length) q = q.or(tokens.map((t: string) => `objeto.ilike.*${t}*`).join(","));
  if (uf) q = q.eq("uf_sigla", uf);
  const { data } = await q.limit(300);
  return motorPreco(((data ?? []) as { valor_global: number | null }[]).map((r) => r.valor_global));
}
export const soDigitos = (s: string) => (s ?? "").replace(/\D/g, "");

// ---- C3: vida do concorrente (por CNPJ) ----
export type Vitoria = { numero: string; objeto: string | null; valor: number | null; data: string | null; uf: string | null; cnpjOrgao: string | null; orgao: string | null };
export type VidaConcorrente = {
  nome: string | null; nContratos: number; totalValor: number;
  ufs: string[]; orgaos: { cnpj: string; nome: string | null; n: number }[]; vitorias: Vitoria[];
};

export async function vidaDoConcorrente(sb: SB, cnpjRaw: string): Promise<VidaConcorrente | null> {
  const cnpj = soDigitos(cnpjRaw);
  if (cnpj.length < 11) return null;
  const { data } = await sb.from("contratos")
    .select("numero_controle_pncp, objeto, valor_global, data_assinatura, data_vigencia_inicio, uf_sigla, cnpj_orgao, nome_fornecedor")
    .eq("ni_fornecedor", cnpj).limit(200);
  const rows = (data ?? []) as { numero_controle_pncp: string; objeto: string | null; valor_global: number | null; data_assinatura: string | null; data_vigencia_inicio: string | null; uf_sigla: string | null; cnpj_orgao: string | null; nome_fornecedor: string | null }[];
  if (rows.length === 0) return { nome: null, nContratos: 0, totalValor: 0, ufs: [], orgaos: [], vitorias: [] };

  const nome = rows.find((r) => r.nome_fornecedor)?.nome_fornecedor ?? null;
  const totalValor = rows.reduce((s, r) => s + (Number(r.valor_global) || 0), 0);
  const ufs = Array.from(new Set(rows.map((r) => r.uf_sigla).filter(Boolean))) as string[];
  const byOrg: Record<string, number> = {};
  for (const r of rows) if (r.cnpj_orgao) byOrg[r.cnpj_orgao] = (byOrg[r.cnpj_orgao] ?? 0) + 1;
  const cnpjs = Object.keys(byOrg);
  const nome_org: Record<string, string | null> = {};
  if (cnpjs.length) {
    const { data: orgs } = await sb.from("orgao").select("cnpj, razao_social").in("cnpj", cnpjs);
    for (const o of orgs ?? []) nome_org[o.cnpj as string] = (o as { razao_social: string | null }).razao_social;
  }
  const orgaos = Object.entries(byOrg).map(([cnpj, n]) => ({ cnpj, nome: nome_org[cnpj] ?? null, n })).sort((a, b) => b.n - a.n).slice(0, 10);
  const vitorias: Vitoria[] = rows
    .map((r) => ({ numero: r.numero_controle_pncp, objeto: r.objeto, valor: r.valor_global, data: r.data_assinatura ?? r.data_vigencia_inicio, uf: r.uf_sigla, cnpjOrgao: r.cnpj_orgao, orgao: r.cnpj_orgao ? (nome_org[r.cnpj_orgao] ?? null) : null }))
    .sort((a, b) => (b.data ?? "").localeCompare(a.data ?? "")).slice(0, 30);
  return { nome, nContratos: rows.length, totalValor, ufs, orgaos, vitorias };
}

// ---- C1: perfil do órgão (por nome ou CNPJ) ----
export type PerfilOrgao = {
  cnpj: string; nome: string | null; uf: string | null; cidade: string | null;
  nEditais: number; nContratos: number;
  editais: { numero: string; objeto: string | null; valor: number | null; data: string | null; situacao: string | null }[];
};

export async function perfilOrgao(sb: SB, termo: string): Promise<PerfilOrgao[] | null> {
  const t = (termo ?? "").trim();
  if (!t) return null;
  const dig = soDigitos(t);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q: any = sb.from("orgao").select("cnpj, razao_social, uf_sigla, cidade, n_editais");
  if (dig.length >= 8) q = q.eq("cnpj", dig);
  else q = q.ilike("razao_social", `%${t}%`);
  const { data: orgs } = await q.limit(8);
  const lista = (orgs ?? []) as { cnpj: string; razao_social: string | null; uf_sigla: string | null; cidade: string | null; n_editais: number | null }[];
  const out: PerfilOrgao[] = [];
  for (const o of lista.slice(0, 5)) {
    const { data: eds } = await sb.from("raw_editais")
      .select("numero_controle_pncp, objeto, valor_estimado, data_publicacao, situacao_nome")
      .eq("cnpj_orgao", o.cnpj).order("data_publicacao", { ascending: false }).limit(15);
    const { count } = await sb.from("contratos").select("numero_controle_pncp", { count: "exact", head: true }).eq("cnpj_orgao", o.cnpj);
    out.push({
      cnpj: o.cnpj, nome: o.razao_social, uf: o.uf_sigla, cidade: o.cidade,
      nEditais: o.n_editais ?? (eds ?? []).length, nContratos: count ?? 0,
      editais: (eds ?? []).map((e) => ({ numero: e.numero_controle_pncp, objeto: e.objeto, valor: e.valor_estimado, data: e.data_publicacao, situacao: e.situacao_nome })),
    });
  }
  return out;
}

// ---- C2: item + cidade (reusa trigram do objeto + uf) ----
export type ItemAchado = { numero: string; objeto: string | null; valor: number | null; data: string | null; cidade: string | null; situacao: string | null; orgao: string | null };

export async function buscarItem(sb: SB, termo: string, uf: string): Promise<ItemAchado[]> {
  const tokens = expandirBusca(termo);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q: any = sb.from("raw_editais").select("numero_controle_pncp, objeto, valor_estimado, data_publicacao, cidade, situacao_nome, orgao:cnpj_orgao(razao_social)").is("valor_homologado", null);
  if (tokens.length) q = q.or(tokens.map((t: string) => `objeto.ilike.*${t}*`).join(","));
  if (uf) q = q.eq("uf_sigla", uf);
  const { data } = await q.limit(40);
  const rows = (data ?? []) as { numero_controle_pncp: string; objeto: string | null; valor_estimado: number | null; data_publicacao: string | null; cidade: string | null; situacao_nome: string | null; orgao: { razao_social: string | null } | null }[];
  return rows
    .sort((a, b) => (b.data_publicacao ?? "").localeCompare(a.data_publicacao ?? ""))
    .map((e) => ({ numero: e.numero_controle_pncp, objeto: e.objeto, valor: e.valor_estimado, data: e.data_publicacao, cidade: e.cidade, situacao: e.situacao_nome, orgao: e.orgao?.razao_social ?? null }));
}
