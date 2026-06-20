// ============================================================================
// Sentinela — DADOS MOCK (ILUSTRATIVOS). Nenhuma ingestão real.
// Célula coerente: Prefeitura de São Luís (MUNICIPAL) × controle de pragas
// (grão ente × objeto — NÃO "cidade inteira via IBGE", que foi o grão errado
// corrigido no F0). Valores/datas são fictícios e plausíveis.
// ============================================================================

export const MOCK_DISCLAIMER =
  "Dados ILUSTRATIVOS (mock). Sem ingestão real — aguardando o F0 justo (ente × objeto).";

// ---------------- Stage engine (esteira canônica) ----------------
export type StageKey =
  | "PCA" | "DFD" | "ETP" | "IRP" | "TR" | "EDITAL" | "CONTRATO" | "VIGENCIA";

export interface StageDef {
  key: StageKey;
  label: string;
  sub: string;
  papel: string;
  heat: "frio" | "morno" | "quente" | "muito-quente" | "iminente" | "publicado" | "execucao" | "recompra";
}

export const STAGES: StageDef[] = [
  { key: "PCA", label: "PCA", sub: "Planejamento", papel: "Intenção (frio)", heat: "frio" },
  { key: "DFD", label: "DFD", sub: "Formalização", papel: "Demanda real (morno)", heat: "morno" },
  { key: "ETP", label: "ETP", sub: "Viabilidade", papel: "Especificação + preço-alvo (quente)", heat: "quente" },
  { key: "IRP", label: "IRP", sub: "Cotação", papel: "Iminência (muito quente)", heat: "muito-quente" },
  { key: "TR", label: "TR", sub: "Especificação", papel: "Quase certo", heat: "iminente" },
  { key: "EDITAL", label: "Edital", sub: "Publicação", papel: "Evento (já é commodity)", heat: "publicado" },
  { key: "CONTRATO", label: "Contrato", sub: "Execução", papel: "Adjudicado", heat: "execucao" },
  { key: "VIGENCIA", label: "Vigência", sub: "Acompanhamento", papel: "Recompra (fecha o ciclo)", heat: "recompra" },
];

export const stageIndex = (k: StageKey) => STAGES.findIndex((s) => s.key === k);

export type Iminencia = "ALTA" | "MÉDIA" | "BAIXA";

/** Iminência derivada do estágio atual (PCA frio → TR/IRP iminente). */
export function iminenciaFromStage(k: StageKey): Iminencia {
  const i = stageIndex(k);
  if (i >= stageIndex("IRP") && i <= stageIndex("EDITAL")) return "ALTA";
  if (i >= stageIndex("ETP")) return "MÉDIA";
  return "BAIXA";
}

// ---------------- Tipos de domínio ----------------
export interface StageEvent {
  stage: StageKey;
  date: string | null; // ISO ou null (pendente)
  source: string;
  status: "COMPLETO" | "PENDENTE";
}

export interface DocItem {
  id: string;
  stage: StageKey;
  tipo: string;
  publicado: string; // ISO
  fonte: "PNCP" | "Compras.gov" | "Diário Oficial";
}

export interface ContractHistory {
  ano: number;
  fornecedor: string;
  cnpj: string;
  valor: number;
  vigenciaMeses: number;
  aditivos: number;
  aditivoPct?: number;
  nota?: string;
}

export interface PriceIntel {
  alvoMin: number;
  alvoMax: number;
  medioHistorico: number;
  menorVencedor: number;
  faixaLancesMin: number;
  faixaLancesMax: number;
  margem: Iminencia;
}

export interface Competition {
  participantesMedia: number;
  gap1e2Pct: number;
  analise: string;
  incumbente: string;
  incumbenteSancao: boolean;
  incumbenteOrgaosAtivos: number;
}

export interface Organization {
  id: string;
  cnpj: string;
  nome: string;
  unidade: string;
  cidade: string;
  uf: string;
  esfera: "MUNICIPAL" | "ESTADUAL" | "FEDERAL";
  capacidadePagamento: Iminencia;
  prazoPagamentoDias: number;
  recorrencia: Iminencia;
  recorrenciaNota: string;
}

export interface DecisionMaker {
  funcao: string;
  cargo: string;
  emailInstitucional: string; // só institucional (LGPD)
}

export interface Demand {
  id: string;
  titulo: string;
  objeto: string;
  org: Organization;
  estagioAtual: StageKey;
  ganho?: boolean; // p/ contratos acompanhados (ganho/perdido)
  // Score = PRIORIDADE (0-100) + porquês. NÃO é "% de chance" (espera backtest).
  prioridade: number;
  porques: string[];
  indices: { iminencia: Iminencia; chance: number };
  financeiro: { valorPrevisto: number; janelaInicio: string; janelaFim: string };
  esteira: StageEvent[];
  docs: DocItem[];
  historico: ContractHistory[];
  preco: PriceIntel;
  concorrencia: Competition;
  decisores: DecisionMaker[];
  planoAcao: { exigencias: string[]; minhasCertidoes: string };
  porqueApareceu: string;
  acaoDeHoje: string;
  diasParaVencer?: number;
  alerta?: string;
}

export interface Certificate {
  tipo: string;
  status: "ATIVO" | "A_RENOVAR" | "VENCIDO";
  emissao: string;
  validade: string;
  fonte: "AUTO" | "MANUAL";
  alertaDiasAntes: number;
}

export interface Company {
  cnpj: string;
  razaoSocial: string;
  cidade: string;
  uf: string;
  cnaes: string[];
  recorte: { setor: string; regiao: string };
  certidoes: Certificate[];
}

export interface NotificationItem {
  id: string;
  tipo: "NOVO_DOC" | "AVANCO_ESTAGIO" | "CONTRATO_VENCENDO" | "CERT_VENCENDO";
  mensagem: string;
  quando: string; // ISO
  lida: boolean;
  href: string;
}

// ---------------- Seed ----------------
const PREF_SL: Organization = {
  id: "org-pref-sl",
  cnpj: "06307102000130",
  nome: "Prefeitura de São Luís",
  unidade: "Secretaria Municipal de Educação (SEMED)",
  cidade: "São Luís",
  uf: "MA",
  esfera: "MUNICIPAL",
  capacidadePagamento: "MÉDIA",
  prazoPagamentoDias: 45,
  recorrencia: "ALTA",
  recorrenciaNota: "Contrata controle de pragas para a rede escolar todo ano.",
};
const PREF_SL_SAUDE: Organization = {
  ...PREF_SL,
  id: "org-pref-sl-saude",
  unidade: "Secretaria Municipal de Saúde (SEMUS)",
  recorrenciaNota: "Dedetização de unidades de saúde — recompra anual.",
};
const CAMARA_SL: Organization = {
  id: "org-camara-sl",
  cnpj: "05495676000117",
  nome: "Câmara Municipal de São Luís",
  unidade: "Diretoria Administrativa",
  cidade: "São Luís",
  uf: "MA",
  esfera: "MUNICIPAL",
  capacidadePagamento: "ALTA",
  prazoPagamentoDias: 30,
  recorrencia: "MÉDIA",
  recorrenciaNota: "Sanitização do prédio legislativo, contrato bienal.",
};

function esteiraAte(atual: StageKey, base: string): StageEvent[] {
  const iAtual = stageIndex(atual);
  return STAGES.map((s, i) => ({
    stage: s.key,
    status: i <= iAtual ? "COMPLETO" : "PENDENTE",
    date:
      i <= iAtual
        ? new Date(new Date(base).getTime() - (iAtual - i) * 18 * 864e5).toISOString()
        : null,
    source: i <= iAtual ? (i >= stageIndex("EDITAL") ? "PNCP" : "Compras.gov") : "—",
  }));
}

function docsPara(atual: StageKey): DocItem[] {
  const iAtual = stageIndex(atual);
  const tipos: Partial<Record<StageKey, string>> = {
    PCA: "Plano de Contratação Anual",
    DFD: "Documento de Formalização da Demanda",
    ETP: "Estudo Técnico Preliminar",
    IRP: "Pesquisa de Preços (IRP)",
    TR: "Termo de Referência",
    EDITAL: "Edital de Licitação",
    CONTRATO: "Contrato",
  };
  const out: DocItem[] = [];
  STAGES.forEach((s, i) => {
    if (i <= iAtual && tipos[s.key]) {
      out.push({
        id: `doc-${s.key}`,
        stage: s.key,
        tipo: tipos[s.key]!,
        publicado: new Date(Date.now() - (iAtual - i) * 18 * 864e5).toISOString(),
        fonte: i >= stageIndex("EDITAL") ? "PNCP" : "Compras.gov",
      });
    }
  });
  return out;
}

const decisoresSEMED: DecisionMaker[] = [
  { funcao: "Agente de Contratação", cargo: "Pregoeiro/SEMED", emailInstitucional: "licitacao@semed.saoluis.ma.gov.br" },
  { funcao: "Comissão de Contratação", cargo: "CPL", emailInstitucional: "cpl@saoluis.ma.gov.br" },
];

function demand(p: Partial<Demand> & Pick<Demand, "id" | "titulo" | "org" | "estagioAtual">): Demand {
  const base = "2026-06-19";
  const im = iminenciaFromStage(p.estagioAtual);
  return {
    objeto: "Controle de pragas / dedetização",
    prioridade: 62,
    porques: ["recorrência anual do órgão", "histórico de contrato local"],
    indices: { iminencia: im, chance: 62 },
    financeiro: { valorPrevisto: 520000, janelaInicio: "2026-09-01", janelaFim: "2026-10-31" },
    esteira: esteiraAte(p.estagioAtual, base),
    docs: docsPara(p.estagioAtual),
    historico: [
      { ano: 2024, fornecedor: "DedetMaster Serviços", cnpj: "11222333000144", valor: 480000, vigenciaMeses: 12, aditivos: 1, aditivoPct: 25, nota: "Mesmo fornecedor há 4 anos." },
      { ano: 2022, fornecedor: "DedetMaster Serviços", cnpj: "11222333000144", valor: 445000, vigenciaMeses: 12, aditivos: 0 },
    ],
    preco: { alvoMin: 510000, alvoMax: 540000, medioHistorico: 445000, menorVencedor: 480000, faixaLancesMin: 470000, faixaLancesMax: 560000, margem: "MÉDIA" },
    concorrencia: { participantesMedia: 2, gap1e2Pct: 4, analise: "Disputa rasa: 2 participantes e gap de 4% entre 1º e 2º. Incumbente forte por atestado e logística local.", incumbente: "DedetMaster Serviços", incumbenteSancao: false, incumbenteOrgaosAtivos: 5 },
    decisores: decisoresSEMED,
    planoAcao: { exigencias: ["Licença sanitária vigente", "Responsável técnico (biólogo/agrônomo)", "Atestado de capacidade ≥ R$ 300 mil"], minhasCertidoes: "3 ok · 2 a renovar (CND estadual, CNDT)" },
    porqueApareceu: "ETP publicado e contrato do incumbente vence em 74 dias.",
    acaoDeHoje: "Conferir atestado de capacidade e renovar CND estadual.",
    diasParaVencer: 74,
    ...p,
  };
}

export const DEMANDS: Demand[] = [
  demand({
    id: "dem-semed-escolas",
    titulo: "Dedetização das escolas municipais",
    org: PREF_SL,
    estagioAtual: "ETP",
    prioridade: 89,
    porques: ["contrato do incumbente vence em 74 dias", "recorrência anual da rede escolar", "ETP publicado — preço-alvo já visível"],
    indices: { iminencia: "MÉDIA", chance: 68 },
    alerta: "Contrato do incumbente vence em 74 dias",
  }),
  demand({
    id: "dem-semus-saude",
    titulo: "Controle de vetores em unidades de saúde",
    org: PREF_SL_SAUDE,
    estagioAtual: "IRP",
    prioridade: 82,
    porques: ["IRP aberta — janela muito próxima", "recorrência anual em saúde", "preço-alvo já no ETP"],
    indices: { iminencia: "ALTA", chance: 71 },
    financeiro: { valorPrevisto: 310000, janelaInicio: "2026-08-01", janelaFim: "2026-09-15" },
    porqueApareceu: "IRP aberta (cotação) — janela muito próxima.",
    acaoDeHoje: "Preparar proposta-base; preço-alvo já visível no ETP.",
    diasParaVencer: 41,
    alerta: "IRP aberta — muito quente",
  }),
  demand({
    id: "dem-camara-sanitiza",
    titulo: "Sanitização do prédio da Câmara",
    org: CAMARA_SL,
    estagioAtual: "TR",
    prioridade: 76,
    porques: ["TR publicado — edital quase certo", "prédio único, baixa concorrência"],
    indices: { iminencia: "ALTA", chance: 58 },
    financeiro: { valorPrevisto: 180000, janelaInicio: "2026-07-15", janelaFim: "2026-08-20" },
    porqueApareceu: "TR publicado — edital quase certo.",
    acaoDeHoje: "Edital iminente: revisar exigências do TR.",
    diasParaVencer: 22,
  }),
  demand({
    id: "dem-semed-2025",
    titulo: "Desratização — recompra escolar 2025",
    org: PREF_SL,
    estagioAtual: "VIGENCIA",
    ganho: false,
    prioridade: 64,
    porques: ["contrato do concorrente vence em 151 dias", "sua próxima janela de recompra"],
    indices: { iminencia: "MÉDIA", chance: 64 },
    porqueApareceu: "Contrato vigente do concorrente — sua próxima janela de recompra.",
    acaoDeHoje: "Monitorar vencimento (recompra) — vence em ~5 meses.",
    diasParaVencer: 151,
    alerta: "Contrato do concorrente — recompra em 151 dias",
  }),
  demand({
    id: "dem-semus-pca",
    titulo: "Imunização — intenção no PCA 2026",
    org: PREF_SL_SAUDE,
    estagioAtual: "PCA",
    prioridade: 49,
    porques: ["aparece no PCA (intenção)", "sinal frio — radar antecipado"],
    indices: { iminencia: "BAIXA", chance: 49 },
    porqueApareceu: "Aparece no PCA do órgão (intenção) — sinal frio, mas é o seu radar antecipado.",
    acaoDeHoje: "Acompanhar evolução para DFD/ETP.",
  }),
  demand({
    id: "dem-semed-contrato",
    titulo: "Dedetização creches — contrato vigente (ganho)",
    org: PREF_SL,
    estagioAtual: "CONTRATO",
    ganho: true,
    prioridade: 55,
    porques: ["contrato ganho em execução", "monitorar aditivos e vencimento (recompra)"],
    indices: { iminencia: "MÉDIA", chance: 100 },
    porqueApareceu: "Você venceu — contrato em execução.",
    acaoDeHoje: "Acompanhar aditivos e vencimento para a próxima recompra.",
    diasParaVencer: 208,
  }),
];

export const getDemand = (id: string) => DEMANDS.find((d) => d.id === id);

export const COMPANY: Company = {
  cnpj: "11999888000177",
  razaoSocial: "Dedetizadora Maranhense Ltda",
  cidade: "São Luís",
  uf: "MA",
  cnaes: ["8122-2/00 Imunização e controle de pragas urbanas", "8129-0/00 Limpeza em prédios"],
  recorte: { setor: "Controle de pragas / dedetização", regiao: "São Luís/MA (municipal)" },
  certidoes: [
    { tipo: "CND Federal (RFB/PGFN)", status: "ATIVO", emissao: "2026-04-01", validade: "2026-10-01", fonte: "AUTO", alertaDiasAntes: 30 },
    { tipo: "CND Estadual (SEFAZ-MA)", status: "A_RENOVAR", emissao: "2025-12-10", validade: "2026-06-30", fonte: "AUTO", alertaDiasAntes: 30 },
    { tipo: "CNDT (Trabalhista)", status: "A_RENOVAR", emissao: "2025-12-20", validade: "2026-07-05", fonte: "AUTO", alertaDiasAntes: 30 },
    { tipo: "FGTS (CRF)", status: "ATIVO", emissao: "2026-05-15", validade: "2026-08-15", fonte: "AUTO", alertaDiasAntes: 30 },
    { tipo: "Licença Sanitária Municipal", status: "ATIVO", emissao: "2026-01-10", validade: "2027-01-10", fonte: "MANUAL", alertaDiasAntes: 45 },
    { tipo: "Atestado de Capacidade Técnica", status: "ATIVO", emissao: "2025-08-01", validade: "2027-08-01", fonte: "MANUAL", alertaDiasAntes: 60 },
  ],
};

export const NOTIFICATIONS: NotificationItem[] = [
  { id: "n1", tipo: "NOVO_DOC", mensagem: "SEMED publicou um ETP de dedetização. Quer acessar?", quando: "2026-06-19T09:12:00", lida: false, href: "/dossie/dem-semed-escolas" },
  { id: "n2", tipo: "AVANCO_ESTAGIO", mensagem: "Sanitização da Câmara avançou para TR — edital quase certo.", quando: "2026-06-18T16:40:00", lida: false, href: "/esteira/dem-camara-sanitiza" },
  { id: "n3", tipo: "CONTRATO_VENCENDO", mensagem: "Recompra: contrato do concorrente vence em 151 dias.", quando: "2026-06-17T11:05:00", lida: true, href: "/dossie/dem-semed-2025" },
  { id: "n4", tipo: "CERT_VENCENDO", mensagem: "Sua CND Estadual vence em 11 dias — renove.", quando: "2026-06-19T07:30:00", lida: false, href: "/empresa" },
];

export const SOURCES = [
  { label: "PNCP", href: "https://pncp.gov.br" },
  { label: "Compras.gov", href: "https://compras.gov.br" },
  { label: "Transparência", href: "https://portaldatransparencia.gov.br" },
  { label: "Siconfi", href: "https://siconfi.tesouro.gov.br" },
];
