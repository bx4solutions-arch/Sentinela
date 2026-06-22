// Busca por nicho/objeto (Etapa 1) — expansão de SINÔNIMOS.
// Editais não se chamam "mosquito": se chamam "controle de vetores", "dengue", "endemias",
// "dedetização", "controle de pragas". A semântica de verdade fica para a Etapa 2 (embeddings);
// aqui é o conjunto de termos (OR de ilike). `ilike "mosquito"` sozinho volta vazio mesmo com dado.

// Grupos de sinônimos por nicho. Se o termo digitado casar QUALQUER sinônimo do grupo,
// a busca expande para o grupo inteiro.
const SINONIMOS: string[][] = [
  // controle de vetores / pragas / endemias
  ["vetor", "vetores", "dengue", "endemia", "endemias", "mosquito", "praga", "pragas",
   "dedetiz", "desinsetiz", "desratiz", "descupiniz", "sanitiz", "controle de praga", "controle de vetor"],
  // material hospitalar
  ["hospitalar", "médico-hospitalar", "material médico", "seringa", "cateter", "curativo", "medicamento"],
  // material de expediente
  ["expediente", "escritório", "papel a4", "toner", "cartucho", "almoxarifado"],
];

/** Expande o termo digitado para os ilike a aplicar. Casa por substring nos dois sentidos. */
export function expandirBusca(q: string): string[] {
  const t = (q ?? "").trim().toLowerCase();
  if (!t) return [];
  for (const grupo of SINONIMOS) {
    if (grupo.some((s) => t.includes(s) || s.includes(t))) {
      return Array.from(new Set([t, ...grupo]));
    }
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
