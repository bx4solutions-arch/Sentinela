// Siconfi/Tesouro — orçamento REAL do município por código IBGE (API pública, sem chave).
// Fonte: RREO Anexo 01 (Balanço Orçamentário) — apidatalake.tesouro.gov.br/ords/siconfi/tt/rreo.
// Cache POR MUNICÍPIO em memória (dado anual/periódico — não rebate a cada acesso). Não forja: sem
// dado no Siconfi → retorna null ("sem registro"). A nota CAPAG vive noutro dataset → fica "em ingestão".

const BASE = "https://apidatalake.tesouro.gov.br/ords/siconfi/tt/rreo";
const UA = { "User-Agent": "sentinela/1.0 (+licitacoes)" };
const TTL_OK = 7 * 24 * 3600 * 1000;  // 7 dias (dado periódico)
const TTL_NULL = 60 * 60 * 1000;      // 1h p/ negativo (município sem registro / falha transitória)

export type OrcamentoMunicipio = {
  instituicao: string; uf: string | null; populacao: number | null;
  exercicio: number; periodo: number;
  receitaPrevista: number | null; receitaRealizada: number | null; execucaoReceitaPct: number | null;
  despesaDotacao: number | null; despesaLiquidada: number | null;
  porte: "pequeno" | "médio" | "grande" | null;
  fonte: string; consultadoEm: string;
};

type SiconfiItem = { instituicao?: string; uf?: string; populacao?: number; exercicio?: number; periodo?: number; conta?: string; coluna?: string; valor?: number };
const cache = new Map<string, { data: OrcamentoMunicipio | null; at: number }>();

function parseAnexo01(items: SiconfiItem[]): OrcamentoMunicipio | null {
  if (!items.length) return null;
  const find = (contaRe: RegExp, colRe: RegExp): number | null => {
    const it = items.find((x) => contaRe.test(x.conta || "") && colRe.test(x.coluna || ""));
    return it && it.valor != null ? Number(it.valor) : null;
  };
  const receitaPrevista = find(/TOTAL DAS RECEITAS \(V\)/i, /PREVIS[ÃA]O ATUALIZADA/i) ?? find(/TOTAL DAS RECEITAS \(V\)/i, /PREVIS[ÃA]O INICIAL/i);
  const receitaRealizada = find(/TOTAL DAS RECEITAS \(V\)/i, /Até o Bimestre \(c\)/i);
  const despesaDotacao = find(/TOTAL DAS DESPESAS/i, /DOTA[ÇC][ÃA]O ATUALIZADA/i) ?? find(/TOTAL DAS DESPESAS/i, /DOTA[ÇC][ÃA]O INICIAL/i);
  const despesaLiquidada = find(/TOTAL DAS DESPESAS/i, /LIQUIDADAS ATÉ O BIMESTRE \(h\)/i);
  if (receitaPrevista == null && receitaRealizada == null) return null; // anexo sem as linhas esperadas
  const meta = items[0];
  const execucaoReceitaPct = receitaPrevista && receitaRealizada ? Math.round((receitaRealizada / receitaPrevista) * 100) : null;
  const porteRef = receitaPrevista ?? receitaRealizada ?? 0;
  const porte = porteRef >= 1_000_000_000 ? "grande" : porteRef >= 100_000_000 ? "médio" : porteRef > 0 ? "pequeno" : null;
  return {
    instituicao: meta.instituicao ?? "—", uf: meta.uf ?? null, populacao: meta.populacao ?? null,
    exercicio: Number(meta.exercicio), periodo: Number(meta.periodo),
    receitaPrevista, receitaRealizada, execucaoReceitaPct, despesaDotacao, despesaLiquidada, porte,
    fonte: `Siconfi/Tesouro · RREO Anexo 01 · exercício ${meta.exercicio} (${meta.periodo}º bim.)`,
    consultadoEm: new Date().toISOString(),
  };
}

async function fetchAno(ibge: string, ano: number): Promise<OrcamentoMunicipio | null> {
  const url = `${BASE}?an_exercicio=${ano}&nr_periodo=6&co_tipo_demonstrativo=RREO&no_anexo=${encodeURIComponent("RREO-Anexo 01")}&id_ente=${ibge}`;
  try {
    const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(9000) });
    if (!r.ok) return null;
    const j = await r.json().catch(() => null) as { items?: SiconfiItem[] } | null;
    return parseAnexo01(j?.items ?? []);
  } catch { return null; }
}

/** Orçamento real do município (cacheado por IBGE). null = sem registro no Siconfi. */
export async function orcamentoMunicipio(codigoIbge: string | null | undefined): Promise<OrcamentoMunicipio | null> {
  const ibge = (codigoIbge ?? "").trim();
  if (!/^\d{7}$/.test(ibge)) return null;
  const hit = cache.get(ibge);
  const ttl = hit?.data ? TTL_OK : TTL_NULL;
  if (hit && Date.now() - hit.at < ttl) return hit.data;

  // Último exercício completo primeiro (estável), depois recuos. Comumente 1 fetch.
  const cy = new Date().getFullYear();
  let data: OrcamentoMunicipio | null = null;
  for (const ano of [cy - 1, cy - 2, cy]) {
    data = await fetchAno(ibge, ano);
    if (data) break;
  }
  cache.set(ibge, { data, at: Date.now() });
  return data;
}
