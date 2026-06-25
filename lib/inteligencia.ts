// Inteligência Comercial & de Mercado (Bloco 2) — Sala de Guerra.
// Só o que TEM dado: contratos (quem ganhou/fornecedor atual/valor) + homologados (faixa).
// nº médio de participantes/lances = DEFERIDO (endpoint de resultado rate-limited) → "em ingestão".
import type { createClient } from "@/lib/supabase/server";
import { motorPreco, type FaixaPreco } from "@/lib/preco";

type SB = Awaited<ReturnType<typeof createClient>>;

export type Concorrente = { ni: string; nome: string | null; n: number; valorTotal: number };
export type ContratoAtual = { nome: string | null; ni: string | null; valor: number | null; vigenciaFim: string | null; dias: number | null; objeto: string | null };
export type MercadoIntel = {
  concorrentes: Concorrente[];
  faixa: FaixaPreco | null;   // motor de preço (IQR/CV/faixas/inexequibilidade)
  contratoAtual: ContratoAtual[];
  amostra: number;
};

/** Inteligência de Mercado para um edital: concorrentes (quem ganha o nicho na UF), faixa de valor
 *  praticada (contratos) e o fornecedor/contrato ATUAL do órgão deste edital. Tudo de dado real. */
export async function inteligenciaMercado(sb: SB, opts: { tokens: string[]; uf: string | null; cnpjOrgao: string | null }): Promise<MercadoIntel> {
  const { tokens, uf, cnpjOrgao } = opts;
  // amostra de contratos do nicho na UF (agrega em JS — PostgREST não agrupa)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q: any = sb.from("contratos").select("ni_fornecedor, nome_fornecedor, valor_global, tipo_pessoa");
  if (tokens.length) q = q.or(tokens.map((t) => `objeto.ilike.*${t}*`).join(","));
  if (uf) q = q.eq("uf_sigla", uf);
  const { data } = await q.limit(300);
  const rows = (data ?? []) as { ni_fornecedor: string | null; nome_fornecedor: string | null; valor_global: number | null; tipo_pessoa: string | null }[];

  // concorrentes: top fornecedores PJ por nº de contratos
  const byForn: Record<string, Concorrente> = {};
  for (const r of rows) {
    if (!r.ni_fornecedor || r.tipo_pessoa === "PF") continue;
    const c = (byForn[r.ni_fornecedor] ??= { ni: r.ni_fornecedor, nome: r.nome_fornecedor, n: 0, valorTotal: 0 });
    c.n++; c.valorTotal += Number(r.valor_global) || 0;
  }
  const concorrentes = Object.values(byForn).sort((a, b) => b.n - a.n).slice(0, 6);

  // faixa de valor praticada → motor de preço (IQR/CV/faixas/inexequibilidade)
  const faixa = motorPreco(rows.map((r) => r.valor_global));

  // contrato/fornecedor ATUAL do órgão deste edital (vencendo)
  let contratoAtual: ContratoAtual[] = [];
  if (cnpjOrgao) {
    const hoje = new Date().toISOString().slice(0, 10);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let qc: any = sb.from("contratos").select("nome_fornecedor, ni_fornecedor, valor_global, data_vigencia_fim, objeto").eq("cnpj_orgao", cnpjOrgao).gte("data_vigencia_fim", hoje);
    if (tokens.length) qc = qc.or(tokens.map((t) => `objeto.ilike.*${t}*`).join(","));
    const { data: ca } = await qc.limit(20);
    const agora = Date.now();
    contratoAtual = ((ca ?? []) as { nome_fornecedor: string | null; ni_fornecedor: string | null; valor_global: number | null; data_vigencia_fim: string | null; objeto: string | null }[])
      .sort((a, b) => (a.data_vigencia_fim ?? "").localeCompare(b.data_vigencia_fim ?? ""))
      .slice(0, 5)
      .map((c) => ({
        nome: c.nome_fornecedor, ni: c.ni_fornecedor, valor: c.valor_global, vigenciaFim: c.data_vigencia_fim, objeto: c.objeto,
        dias: c.data_vigencia_fim ? Math.ceil((new Date(c.data_vigencia_fim + "T00:00:00").getTime() - agora) / 86400000) : null,
      }));
  }

  return { concorrentes, faixa, contratoAtual, amostra: rows.length };
}

// ---- Gasto do ÓRGÃO no NICHO (fonte GOLD: contratos firmados do PNCP, fallback homologados) ----
export type GastoOrgaoNicho = {
  total: number; n: number; ticketMedio: number | null;
  fonte: "contratos" | "homologados" | null; meses: number; temDado: boolean;
};

/** Quanto ESTE órgão gastou no SEU nicho nos últimos `meses` (contratos firmados; fallback homologados).
 *  É a melhor proxy real de "quanto ele compra disso". Sem registro → temDado=false (não forja). */
export async function gastoOrgaoNoNicho(sb: SB, cnpjOrgao: string | null, tokens: string[], meses = 12): Promise<GastoOrgaoNicho> {
  const vazio: GastoOrgaoNicho = { total: 0, n: 0, ticketMedio: null, fonte: null, meses, temDado: false };
  if (!cnpjOrgao || !tokens.length) return vazio;
  const desde = new Date(Date.now() - meses * 30 * 86400000).toISOString().slice(0, 10);
  const orTokens = tokens.map((t) => `objeto.ilike.*${t}*`).join(",");

  // 1) contratos FIRMADOS do órgão no nicho (gold)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: cd } = await (sb.from("contratos").select("valor_global, data_assinatura, data_vigencia_inicio").eq("cnpj_orgao", cnpjOrgao).or(orTokens) as any).limit(500);
  const contratos = ((cd ?? []) as { valor_global: number | null; data_assinatura: string | null; data_vigencia_inicio: string | null }[])
    .filter((r) => { const d = (r.data_assinatura ?? r.data_vigencia_inicio ?? "").slice(0, 10); return d >= desde; });
  if (contratos.length) {
    const total = contratos.reduce((s, r) => s + (Number(r.valor_global) || 0), 0);
    return { total, n: contratos.length, ticketMedio: contratos.length ? Math.round(total / contratos.length) : null, fonte: "contratos", meses, temDado: total > 0 };
  }

  // 2) fallback: editais HOMOLOGADOS do órgão no nicho (proxy de compra adjudicada)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: hd } = await (sb.from("raw_editais").select("valor_homologado, data_publicacao").eq("cnpj_orgao", cnpjOrgao).not("valor_homologado", "is", null).or(orTokens) as any).limit(500);
  const homol = ((hd ?? []) as { valor_homologado: number | null; data_publicacao: string | null }[])
    .filter((r) => (r.data_publicacao ?? "").slice(0, 10) >= desde && (Number(r.valor_homologado) || 0) > 0);
  if (homol.length) {
    const total = homol.reduce((s, r) => s + (Number(r.valor_homologado) || 0), 0);
    return { total, n: homol.length, ticketMedio: Math.round(total / homol.length), fonte: "homologados", meses, temDado: true };
  }
  return vazio;
}

/** Batch: gasto no nicho de VÁRIOS órgãos numa query só (p/ os cards do Radar). Map cnpj → {total, n}. */
export async function gastoOrgaosNoNicho(sb: SB, cnpjs: string[], tokens: string[], meses = 12): Promise<Record<string, { total: number; n: number }>> {
  const out: Record<string, { total: number; n: number }> = {};
  if (!cnpjs.length || !tokens.length) return out;
  const desde = new Date(Date.now() - meses * 30 * 86400000).toISOString().slice(0, 10);
  const orTokens = tokens.map((t) => `objeto.ilike.*${t}*`).join(",");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (sb.from("contratos").select("cnpj_orgao, valor_global, data_assinatura, data_vigencia_inicio").in("cnpj_orgao", cnpjs.slice(0, 60)).or(orTokens) as any).limit(2000);
  for (const r of (data ?? []) as { cnpj_orgao: string | null; valor_global: number | null; data_assinatura: string | null; data_vigencia_inicio: string | null }[]) {
    const d = (r.data_assinatura ?? r.data_vigencia_inicio ?? "").slice(0, 10);
    if (!r.cnpj_orgao || d < desde) continue;
    const o = (out[r.cnpj_orgao] ??= { total: 0, n: 0 });
    o.total += Number(r.valor_global) || 0; o.n++;
  }
  return out;
}
