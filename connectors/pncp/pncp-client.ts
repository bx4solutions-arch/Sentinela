/**
 * Conector PNCP — API de consulta (Lei 14.133).
 * Base pública, sem autenticação. Validado em 2026-06-18.
 * Doc do contrato: docs/fontes.md
 *
 * Núcleo do MVP: 1 fonte (PNCP). Não conectar portais de disputa de pregão.
 */

const BASE = "https://pncp.gov.br/api/consulta/v1";

/** Envelope padrão de toda resposta paginada do PNCP. */
export interface PncpPage<T> {
  data: T[];
  totalRegistros: number;
  totalPaginas: number;
  numeroPagina: number;
  paginasRestantes: number;
  empty: boolean;
}

/** Datas de parâmetro vão no formato AAAAMMDD. */
function ymd(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

async function get<T>(path: string, params: Record<string, string | number>): Promise<PncpPage<T>> {
  const qs = new URLSearchParams(
    Object.entries(params).map(([k, v]) => [k, String(v)]),
  ).toString();
  const res = await fetch(`${BASE}${path}?${qs}`, {
    headers: { "User-Agent": "Sentinela/0.1", Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`PNCP ${path} -> HTTP ${res.status}: ${await res.text()}`);
  }
  return (await res.json()) as PncpPage<T>;
}

/** Contratos publicados num intervalo (incumbente, valor, vigência, órgão, fornecedor). */
export function getContratos(dataInicial: string, dataFinal: string, pagina = 1) {
  return get<Record<string, unknown>>("/contratos", { dataInicial, dataFinal, pagina });
}

/** Editais publicados num intervalo. codigoModalidadeContratacao: 6 = Pregão. */
export function getEditais(
  dataInicial: string,
  dataFinal: string,
  codigoModalidadeContratacao = 6,
  pagina = 1,
) {
  return get<Record<string, unknown>>("/contratacoes/publicacao", {
    dataInicial,
    dataFinal,
    codigoModalidadeContratacao,
    pagina,
  });
}

/** PCA por ano + classe (CATMAT/CATSER). codigoClassificacaoSuperior é obrigatório. */
export function getPca(anoPca: number, codigoClassificacaoSuperior: number, pagina = 1) {
  return get<Record<string, unknown>>("/pca/", { anoPca, codigoClassificacaoSuperior, pagina });
}

/** PCA incremental por data de atualização — usado no monitoramento de célula. */
export function getPcaAtualizacao(
  dataInicio: string,
  dataFim: string,
  codigoClassificacaoSuperior: number,
  pagina = 1,
) {
  return get<Record<string, unknown>>("/pca/atualizacao", {
    dataInicio,
    dataFim,
    codigoClassificacaoSuperior,
    pagina,
  });
}

/**
 * Itera todas as páginas de um endpoint paginado, respeitando rate-limit com backoff simples.
 * Uso: for await (const item of paginate(p => getContratos("20240601","20240605",p))) { ... }
 */
export async function* paginate<T>(
  fetchPage: (pagina: number) => Promise<PncpPage<T>>,
  opts: { delayMs?: number } = {},
): AsyncGenerator<T> {
  const delay = opts.delayMs ?? 250;
  let pagina = 1;
  while (true) {
    const page = await fetchPage(pagina);
    for (const item of page.data) yield item;
    if (page.paginasRestantes <= 0 || page.empty) break;
    pagina += 1;
    await new Promise((r) => setTimeout(r, delay));
  }
}

export { ymd, BASE };
