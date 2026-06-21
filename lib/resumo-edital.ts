// Resumo Executivo determinístico do edital — montado do payload jsonb do PNCP.
// SEM IA. As seções que dependem do TEXTO do edital (habilitação específica, garantias,
// penalidades, análise crítica) ficam marcadas "em ingestão" (precisam do documento — Camada 2).

const PODER: Record<string, string> = { E: "Executivo", L: "Legislativo", J: "Judiciário" };
const ESFERA: Record<string, string> = { F: "Federal", E: "Estadual", M: "Municipal" };

export type ResumoEdital = {
  identificacao: { objeto: string | null; numero_controle: string | null; numero_compra: string | null; processo: string | null; uasg: string | null; unidade: string | null; tipo_instrumento: string | null; portal: string | null };
  orgao: { razao_social: string | null; poder: string | null; esfera: string | null; municipio: string | null; uf: string | null };
  datas: { publicacao: string | null; abertura: string | null; encerramento: string | null };
  modalidade: { modalidade: string | null; modo_disputa: string | null; srp: boolean | null };
  situacao: string | null;
  valores: { estimado: number | null; homologado: number | null };
  amparo_legal: { nome: string | null; descricao: string | null };
  fontes_orcamentarias: string[];
  info_complementar: string | null;
  links: { sistema_origem: string | null; processo_eletronico: string | null };
  /** Seções que exigem o TEXTO do edital (Camada 2 / IA). */
  em_ingestao: string[];
};

export function buildResumo(payload: unknown): ResumoEdital {
  const p = (payload ?? {}) as Record<string, unknown>;
  const oe = (p.orgaoEntidade ?? {}) as Record<string, unknown>;
  const uo = (p.unidadeOrgao ?? {}) as Record<string, unknown>;
  const am = (p.amparoLegal ?? {}) as Record<string, unknown>;
  const fontes = Array.isArray(p.fontesOrcamentarias) ? (p.fontesOrcamentarias as unknown[]) : [];
  const str = (v: unknown) => (v == null || v === "" ? null : String(v));
  const num = (v: unknown) => (typeof v === "number" ? v : v == null ? null : Number(v) || null);

  return {
    identificacao: {
      objeto: str(p.objetoCompra),
      numero_controle: str(p.numeroControlePNCP),
      numero_compra: str(p.numeroCompra),
      processo: str(p.processo),
      uasg: str(uo.codigoUnidade),
      unidade: str(uo.nomeUnidade),
      tipo_instrumento: str(p.tipoInstrumentoConvocatorioNome),
      portal: str(p.linkSistemaOrigem),
    },
    orgao: {
      razao_social: str(oe.razaoSocial),
      poder: oe.poderId ? PODER[String(oe.poderId)] ?? String(oe.poderId) : null,
      esfera: oe.esferaId ? ESFERA[String(oe.esferaId)] ?? String(oe.esferaId) : null,
      municipio: str(uo.municipioNome),
      uf: str(uo.ufSigla),
    },
    datas: {
      publicacao: str(p.dataPublicacaoPncp),
      abertura: str(p.dataAberturaProposta),
      encerramento: str(p.dataEncerramentoProposta),
    },
    modalidade: { modalidade: str(p.modalidadeNome), modo_disputa: str(p.modoDisputaNome), srp: typeof p.srp === "boolean" ? p.srp : null },
    situacao: str(p.situacaoCompraNome),
    valores: { estimado: num(p.valorTotalEstimado), homologado: num(p.valorTotalHomologado) },
    amparo_legal: { nome: str(am.nome), descricao: str(am.descricao) },
    fontes_orcamentarias: fontes.map((f) => (typeof f === "object" && f ? JSON.stringify(f) : String(f))),
    info_complementar: str(p.informacaoComplementar),
    links: { sistema_origem: str(p.linkSistemaOrigem), processo_eletronico: str(p.linkProcessoEletronico) },
    em_ingestao: ["Habilitação específica do edital", "Garantias", "Penalidades e multas", "Prazos detalhados (recurso/impugnação)", "Análise crítica", "Itens"],
  };
}
