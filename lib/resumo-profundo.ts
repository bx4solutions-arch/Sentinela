// Resumo Profundo (Tela 2) — schema de 18 seções extraídas do PDF do edital pela IA.
// HONESTIDADE: cada campo = valor real do texto OU "Não informado". NUNCA forja.
// Funções puras (sem server-only) — a chamada à IA vive no server action (lib/ai-server).
import type { ResumoEdital } from "@/lib/resumo-edital";

export const NAO_INFO = "Não informado";

export type SecaoMeta = { key: string; titulo: string; tom?: "vermelho" | "ambar" };
export const SECOES: SecaoMeta[] = [
  { key: "identificacao", titulo: "1. Identificação" },
  { key: "sessao", titulo: "2. Sessão pública" },
  { key: "orgao_capag", titulo: "3. Órgão & capacidade fiscal (CAPAG)" },
  { key: "detalhes", titulo: "4. Detalhes do objeto" },
  { key: "garantia", titulo: "5. Garantia (proposta/contratual)" },
  { key: "entrega", titulo: "6. Entrega / execução" },
  { key: "prazos", titulo: "7. Prazos (impugnação, recurso, vigência)" },
  { key: "criterios", titulo: "8. Critérios de julgamento" },
  { key: "itens", titulo: "9. Itens / lotes" },
  { key: "habilitacao", titulo: "10. Habilitação exigida" },
  { key: "atestado", titulo: "11. Atestado de capacidade técnica" },
  { key: "legislacao", titulo: "12. Legislação aplicável" },
  { key: "anexos", titulo: "13. Anexos" },
  { key: "outras", titulo: "14. Outras condições" },
  { key: "pagamento", titulo: "15. Condições de pagamento" },
  { key: "penalidades", titulo: "16. Penalidades e multas", tom: "vermelho" },
  { key: "analise_critica", titulo: "17. Análise crítica (pegadinhas)", tom: "ambar" },
  { key: "consideracoes", titulo: "18. Considerações ao licitante", tom: "ambar" },
];

export type ResumoProfundo = {
  secoes: Record<string, string>;
  exigencias_especificas: string[]; // ligam nas "Exigências específicas do edital"
  fonte: "ia" | "cache" | "deterministico";
  modelo: string;
  arquivo: string | null;
  aviso?: string;
};

const SYSTEM = "Você é um analista de licitações públicas brasileiro (Lei 14.133/2021). Extraia o conteúdo do EDITAL para JSON. Regra inviolável de honestidade: para CADA campo, use SOMENTE o que está escrito no texto; se o texto não mencionar, escreva exatamente \"Não informado\". NUNCA invente valores, atestados, prazos ou penalidades. Responda SOMENTE com JSON válido, sem markdown.";

/** Monta o prompt do Resumo Profundo a partir do texto do edital + âncora determinística. */
export function buildPromptProfundo(textoEdital: string, ancora: { objeto: string | null; orgao: string | null; numero: string | null }): { system: string; prompt: string } {
  const keys = SECOES.map((s) => `"${s.key}"`).join(", ");
  const prompt = `Extraia este EDITAL para um JSON com EXATAMENTE estas chaves de seção (cada uma um texto curto e objetivo, ou "Não informado"):
{ ${keys}, "exigencias_especificas": [string] }

Diretrizes:
- "exigencias_especificas" = lista das exigências de habilitação/atestado ESPECÍFICAS deste edital (ex.: "atestado de capacidade técnica ≥ 100.000 m²", "índice de liquidez ≥ 1,0", "vistoria técnica obrigatória"). Só o que o texto disser. [] se não houver.
- "penalidades" = multas e sanções previstas (cite percentuais/prazos se houver).
- "analise_critica" = pontos de atenção/pegadinhas para o licitante (prazos curtos, exigências restritivas, cláusulas atípicas). É análise, não parecer jurídico.
- "orgao_capag" = dados do órgão; NÃO invente nota de capacidade fiscal.
- Onde o texto não disser, "Não informado".

ÂNCORA (metadados já conhecidos, use para a Identificação): objeto="${ancora.objeto ?? "—"}"; órgão="${ancora.orgao ?? "—"}"; nº PNCP="${ancora.numero ?? "—"}".

TEXTO DO EDITAL (pode estar truncado):
"""
${textoEdital}
"""`;
  return { system: SYSTEM, prompt };
}

/** Faz o parse robusto do JSON da IA e coage para o schema honesto (faltou campo → "Não informado"). */
export function parseProfundo(jsonText: string): { secoes: Record<string, string>; exigencias_especificas: string[] } | null {
  let obj: Record<string, unknown>;
  try { obj = JSON.parse(jsonText.replace(/```json|```/g, "").trim()); }
  catch {
    const m = jsonText.match(/\{[\s\S]*\}/);
    if (!m) return null;
    try { obj = JSON.parse(m[0]); } catch { return null; }
  }
  const secoes: Record<string, string> = {};
  for (const s of SECOES) {
    const v = obj[s.key];
    secoes[s.key] = typeof v === "string" && v.trim() ? v.trim() : NAO_INFO;
  }
  const ex = obj.exigencias_especificas;
  const exigencias_especificas = Array.isArray(ex) ? ex.map((x) => String(x).trim()).filter(Boolean).slice(0, 30) : [];
  return { secoes, exigencias_especificas };
}

/** Seed determinístico (sem IA): preenche o que já sabemos do payload PNCP; resto = baixar documento. */
export function profundoDeterministico(r: ResumoEdital | null): Record<string, string> {
  const s: Record<string, string> = {};
  for (const sec of SECOES) s[sec.key] = NAO_INFO;
  if (r) {
    s.identificacao = [r.identificacao.objeto && `Objeto: ${r.identificacao.objeto}`, r.identificacao.numero_controle && `Nº PNCP: ${r.identificacao.numero_controle}`, r.identificacao.numero_compra && `Nº compra: ${r.identificacao.numero_compra}`].filter(Boolean).join(" · ") || NAO_INFO;
    s.sessao = [r.datas.abertura && `Sessão/abertura: ${r.datas.abertura.slice(0, 10)}`, r.datas.encerramento && `Encerramento: ${r.datas.encerramento.slice(0, 10)}`].filter(Boolean).join(" · ") || NAO_INFO;
    s.orgao_capag = r.orgao.razao_social ? `${r.orgao.razao_social}${r.orgao.municipio ? ` — ${r.orgao.municipio}/${r.orgao.uf}` : ""}` : NAO_INFO;
    s.criterios = r.modalidade.modo_disputa ? `Modo de disputa: ${r.modalidade.modo_disputa}` : NAO_INFO;
    s.legislacao = r.amparo_legal.nome || NAO_INFO;
  }
  return s;
}
