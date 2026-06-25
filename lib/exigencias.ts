// Checklist Inteligente (anti-desclassificação) — classifica cada exigência ESPECÍFICA extraída do
// edital (texto livre do Resumo Profundo) numa CLASSE acionável, cruzando com o que sabemos gerar/ter.
// Honesto: o que não dá pra classificar com segurança → "verificar" (não inventa estado).
import { DECLARACOES_TIPICAS } from "@/lib/proposta";

export type ClasseExig = "declaracao" | "certidao" | "atestado" | "indice" | "vistoria" | "amostra" | "outro";

export type ExigClassificada = {
  texto: string;
  classe: ClasseExig;
  geravel: boolean;       // dá pra montar como declaração no Gerador (Sala de Documentos)
  declId: string | null;  // id em DECLARACOES_TIPICAS quando casa uma declaração típica
  acao: string;           // o que o usuário faz: gerar / conferir no cofre / providenciar / verificar
};

export const CLASSE_META: Record<ClasseExig, { label: string; acao: string }> = {
  declaracao: { label: "declaração", acao: "Gerar no documento" },
  certidao: { label: "certidão", acao: "Conferir no cofre" },
  atestado: { label: "atestado", acao: "Providenciar atestado" },
  indice: { label: "índice contábil", acao: "Conferir no balanço" },
  vistoria: { label: "vistoria", acao: "Agendar vistoria" },
  amostra: { label: "amostra/prova", acao: "Preparar amostra" },
  outro: { label: "exigência", acao: "Verificar no edital" },
};

// Casa uma exigência de declaração com uma das declarações típicas (Lei 14.133 / LC 123).
function declaracaoTipica(t: string): string | null {
  const s = t.toLowerCase();
  if (/menor|art\.?\s*7|xxxiii|trabalho noturno/.test(s)) return "menor";
  if (/me\/epp|micro\s?empresa|pequeno porte|lc\s?123|enquadr/.test(s)) return "meepp";
  if (/idoneidade|fato (superveniente )?impeditivo|inexist[êe]ncia de fato/.test(s)) return "idoneidade";
  if (/requisitos de habilita|plenamente|art\.?\s*63/.test(s)) return "requisitos";
  return null;
}

/** Classifica uma exigência específica (texto livre) numa classe acionável. */
export function classificarExigencia(texto: string): ExigClassificada {
  const s = texto.toLowerCase();
  let classe: ClasseExig = "outro";
  if (/declara[çc][ãa]o|declarar|sob as penas/.test(s)) classe = "declaracao";
  else if (/atestado|capacidade t[ée]cnica|aptid[ãa]o|comprova[çc][ãa]o de fornecimento/.test(s)) classe = "atestado";
  else if (/[íi]ndice|liquidez|solv[êe]ncia|endividamento|patrim[ôo]nio l[íi]quido|capital social|balan[çc]o/.test(s)) classe = "indice";
  else if (/vistoria|visita t[ée]cnica/.test(s)) classe = "vistoria";
  else if (/amostra|prova de conceito|demonstra[çc][ãa]o|prot[óo]tipo/.test(s)) classe = "amostra";
  else if (/certid[ãa]o|regularidade|cnd|crf|fgts|cndt|fal[êe]ncia|recupera[çc][ãa]o judicial/.test(s)) classe = "certidao";
  const declId = classe === "declaracao" ? declaracaoTipica(texto) : null;
  return { texto, classe, geravel: classe === "declaracao", declId, acao: CLASSE_META[classe].acao };
}

/** Classifica a lista de exigências do edital (até 30). Mantém ordem do edital. */
export function classificarExigencias(lista: string[] | null | undefined): ExigClassificada[] {
  return (lista ?? []).map(classificarExigencia);
}

/** Declarações típicas que o edital EXIGE (casadas) — para amarrar checklist → gerador. */
export function declaracoesExigidas(classificadas: ExigClassificada[]): { id: string; titulo: string }[] {
  const ids = new Set(classificadas.map((c) => c.declId).filter(Boolean) as string[]);
  return DECLARACOES_TIPICAS.filter((d) => ids.has(d.id)).map((d) => ({ id: d.id, titulo: d.titulo }));
}
