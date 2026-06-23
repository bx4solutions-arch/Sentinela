// Pesquisa livre (Bloco 3) — poder ao fornecedor. Só dado real.
import type { createClient } from "@/lib/supabase/server";
import { expandirBusca } from "@/lib/nichos";

type SB = Awaited<ReturnType<typeof createClient>>;
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
