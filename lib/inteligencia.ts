// Inteligência Comercial & de Mercado (Bloco 2) — Sala de Guerra.
// Só o que TEM dado: contratos (quem ganhou/fornecedor atual/valor) + homologados (faixa).
// nº médio de participantes/lances = DEFERIDO (endpoint de resultado rate-limited) → "em ingestão".
import type { createClient } from "@/lib/supabase/server";

type SB = Awaited<ReturnType<typeof createClient>>;

export type Concorrente = { ni: string; nome: string | null; n: number; valorTotal: number };
export type ContratoAtual = { nome: string | null; ni: string | null; valor: number | null; vigenciaFim: string | null; dias: number | null; objeto: string | null };
export type MercadoIntel = {
  concorrentes: Concorrente[];
  faixa: { min: number; mediana: number; max: number; n: number } | null;
  contratoAtual: ContratoAtual[];
  amostra: number;
};

const mediana = (xs: number[]) => xs.length ? xs[Math.floor((xs.length - 1) / 2)] : 0;

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

  // faixa de valor praticada (contratos com valor > 0)
  const valores = rows.map((r) => Number(r.valor_global)).filter((v) => v > 0).sort((a, b) => a - b);
  const faixa = valores.length ? { min: valores[0], max: valores[valores.length - 1], mediana: mediana(valores), n: valores.length } : null;

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
