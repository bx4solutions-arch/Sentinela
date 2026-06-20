import { mapCnaeToSegmentos } from "@/lib/segmentos";

export type Socio = { nome: string; qualificacao: string | null; entrada: string | null };

export type RaioX = {
  cnpj: string;
  razaoSocial: string | null;
  nomeFantasia: string | null;
  matrizFilial: string | null;
  situacaoCadastral: string | null;
  situacaoData: string | null;
  dataInicioAtividade: string | null;
  naturezaJuridica: string | null;
  porte: string | null;
  capitalSocial: number | null;
  optanteSimples: boolean | null;
  optanteMei: boolean | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  municipio: string | null;
  uf: string | null;
  cep: string | null;
  telefone: string | null;
  email: string | null;
  cnaePrincipal: string | null;
  cnaePrincipalDesc: string | null;
  cnaesSecundarios: { codigo: string; descricao: string }[];
  qsa: Socio[];
  segmentosSugeridos: string[];
  raw: unknown;
};

export type ConsultaResult = { ok: true; data: RaioX } | { ok: false; error: string };

const PORTE_LABEL: Record<string, string> = {
  "MICRO EMPRESA": "Microempresa (ME)",
  ME: "Microempresa (ME)",
  "PEQUENO PORTE": "Empresa de Pequeno Porte (EPP)",
  EPP: "Empresa de Pequeno Porte (EPP)",
  DEMAIS: "Demais (médio/grande)",
};

function fmtTelefone(t: string | null | undefined): string | null {
  const d = String(t ?? "").replace(/\D/g, "");
  if (d.length < 10) return t || null;
  const ddd = d.slice(0, 2);
  const rest = d.slice(2);
  return rest.length === 9 ? `(${ddd}) ${rest.slice(0, 5)}-${rest.slice(5)}` : `(${ddd}) ${rest.slice(0, 4)}-${rest.slice(4)}`;
}

function fmtCep(c: string | null | undefined): string | null {
  const d = String(c ?? "").replace(/\D/g, "");
  return d.length === 8 ? `${d.slice(0, 5)}-${d.slice(5)}` : c || null;
}

/** Consulta a BrasilAPI (pública) e mapeia a ficha completa. */
export async function consultarBrasilApi(cnpjRaw: string): Promise<ConsultaResult> {
  const cnpj = String(cnpjRaw ?? "").replace(/\D/g, "");
  if (cnpj.length !== 14) return { ok: false, error: "CNPJ deve ter 14 dígitos." };

  let j: Record<string, any>;
  try {
    const r = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`, {
      headers: { "User-Agent": "sentinela/1.0" },
      cache: "no-store",
    });
    if (r.status === 404) return { ok: false, error: "CNPJ não encontrado na Receita Federal." };
    if (r.status === 429) return { ok: false, error: "Muitas consultas seguidas. Aguarde alguns segundos." };
    if (!r.ok) return { ok: false, error: `Falha na consulta (HTTP ${r.status}).` };
    j = await r.json();
  } catch {
    return { ok: false, error: "Não foi possível consultar a BrasilAPI agora. Tente novamente." };
  }

  const sec = (j.cnaes_secundarios as { codigo: number; descricao: string }[] | undefined) ?? [];
  const cnaesSecundarios = sec
    .filter((c) => c && c.codigo)
    .map((c) => ({ codigo: String(c.codigo), descricao: c.descricao }));
  const cnaePrincipal = j.cnae_fiscal != null ? String(j.cnae_fiscal) : null;
  const porte = (j.porte as string | null) ?? null;
  const qsa: Socio[] = ((j.qsa as any[] | undefined) ?? []).map((s) => ({
    nome: s.nome_socio ?? "—",
    qualificacao: s.qualificacao_socio ?? null,
    entrada: s.data_entrada_sociedade ?? null,
  }));

  const data: RaioX = {
    cnpj,
    razaoSocial: j.razao_social ?? null,
    nomeFantasia: j.nome_fantasia || null,
    matrizFilial: j.descricao_identificador_matriz_filial ?? null,
    situacaoCadastral: j.descricao_situacao_cadastral ?? null,
    situacaoData: j.data_situacao_cadastral ?? null,
    dataInicioAtividade: j.data_inicio_atividade ?? null,
    naturezaJuridica: j.natureza_juridica ?? null,
    porte: porte ? PORTE_LABEL[porte] ?? porte : null,
    capitalSocial: typeof j.capital_social === "number" ? j.capital_social : Number(j.capital_social) || null,
    optanteSimples: typeof j.opcao_pelo_simples === "boolean" ? j.opcao_pelo_simples : null,
    optanteMei: typeof j.opcao_pelo_mei === "boolean" ? j.opcao_pelo_mei : null,
    logradouro: j.logradouro ?? null,
    numero: j.numero ?? null,
    complemento: j.complemento || null,
    bairro: j.bairro ?? null,
    municipio: j.municipio ?? null,
    uf: j.uf ?? null,
    cep: fmtCep(j.cep),
    telefone: fmtTelefone(j.ddd_telefone_1),
    email: j.email || null,
    cnaePrincipal,
    cnaePrincipalDesc: j.cnae_fiscal_descricao ?? null,
    cnaesSecundarios,
    qsa,
    segmentosSugeridos: mapCnaeToSegmentos([cnaePrincipal, ...cnaesSecundarios.map((c) => c.codigo)]),
    raw: j,
  };
  return { ok: true, data };
}

/** Converte o Raio-X em linha da tabela `company` (sem tenant_id/segmentos, definidos por quem chama). */
export function raioxToCompanyRow(p: RaioX) {
  return {
    cnpj: p.cnpj,
    razao_social: p.razaoSocial,
    nome_fantasia: p.nomeFantasia,
    matriz_filial: p.matrizFilial,
    situacao_cadastral: p.situacaoCadastral,
    situacao_data: p.situacaoData,
    data_inicio_atividade: p.dataInicioAtividade,
    natureza_juridica: p.naturezaJuridica,
    porte: p.porte,
    capital_social: p.capitalSocial,
    opcao_simples: p.optanteSimples,
    opcao_mei: p.optanteMei,
    logradouro: p.logradouro,
    numero: p.numero,
    complemento: p.complemento,
    bairro: p.bairro,
    cep: p.cep,
    telefone: p.telefone,
    email: p.email,
    cnae_principal: p.cnaePrincipal,
    cnae_principal_desc: p.cnaePrincipalDesc,
    cnaes_secundarios: p.cnaesSecundarios,
    qsa: p.qsa,
    raw: p.raw,
  };
}
