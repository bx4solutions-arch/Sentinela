// Busca por nicho/objeto (Etapa 1) — expansão de SINÔNIMOS.
// Editais não se chamam "mosquito": se chamam "controle de vetores", "dengue", "endemias",
// "dedetização", "controle de pragas". A semântica de verdade fica para a Etapa 2 (embeddings);
// aqui é o conjunto de termos (OR de ilike). `ilike "mosquito"` sozinho volta vazio mesmo com dado.

// Tokens por nicho (segmento) — DISTINTOS (substrings), sem plural/multi-palavra redundante:
// "vetor" já casa "controle de vetores"/"vetores"; "praga" casa "pragas".
// Menos termos = menos OR de ilike = busca rápida (cada termo é um bitmap no índice trigram).
export const NICHO_TOKENS: Record<string, string[]> = {
  "controle-de-pragas": ["vetor", "dengue", "endemia", "mosquito", "praga", "dedetiz", "desinsetiz", "desratiz", "descupiniz", "sanitiz"],
  "material-hospitalar": ["hospitalar", "seringa", "cateter", "curativo", "medicamento", "odontolog"],
  "material-de-expediente": ["expediente", "escritório", "papel a4", "toner", "cartucho", "almoxarifado"],
};
const SINONIMOS: string[][] = Object.values(NICHO_TOKENS);

/** Tokens de objeto para o(s) segmento(s) da empresa — p/ filtrar tabelas sem coluna `segmentos` (contratos). */
export function tokensDosSegmentos(segs: string[]): string[] {
  return Array.from(new Set(segs.flatMap((s) => NICHO_TOKENS[s] ?? [])));
}

/** Expande o termo digitado para os ilike a aplicar. Se casar um grupo, usa só o grupo (tight). */
export function expandirBusca(q: string): string[] {
  const t = (q ?? "").trim().toLowerCase();
  if (!t) return [];
  for (const grupo of SINONIMOS) {
    if (grupo.some((s) => t.includes(s) || s.includes(t))) return grupo;
  }
  return [t];
}

// UF por nome (acento-insensível) — permite "no Piauí" virar PI no texto da busca.
const UF_POR_NOME: Record<string, string> = {
  acre: "AC", alagoas: "AL", amapa: "AP", amazonas: "AM", bahia: "BA", ceara: "CE",
  "distrito federal": "DF", "espirito santo": "ES", goias: "GO", maranhao: "MA",
  "mato grosso": "MT", "mato grosso do sul": "MS", "minas gerais": "MG", para: "PA",
  paraiba: "PB", parana: "PR", pernambuco: "PE", piaui: "PI", "rio de janeiro": "RJ",
  "rio grande do norte": "RN", "rio grande do sul": "RS", rondonia: "RO", roraima: "RR",
  "santa catarina": "SC", "sao paulo": "SP", sergipe: "SE", tocantins: "TO",
};
const SIGLAS = new Set(Object.values(UF_POR_NOME));

const semAcento = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Detecta uma UF mencionada no texto (nome por extenso ou sigla). null se não achar. */
export function ufDoTexto(q: string): string | null {
  const t = semAcento(q ?? "");
  // nomes compostos primeiro (mato grosso do sul antes de mato grosso)
  const nomes = Object.keys(UF_POR_NOME).sort((a, b) => b.length - a.length);
  for (const nome of nomes) {
    if (t.includes(semAcento(nome))) return UF_POR_NOME[nome];
  }
  const m = (q ?? "").toUpperCase().match(/\b([A-Z]{2})\b/);
  if (m && SIGLAS.has(m[1])) return m[1];
  return null;
}
