// Dashboard (command center) — DADOS MOCK ILUSTRATIVOS. Sem ingestão real.
// Reusa DEMANDS (lib/mock) para "Atacar Hoje". Aqui ficam KPIs, séries e listas.

export type DeltaTone = "up" | "warn" | "down";

export interface Kpi {
  key: string;
  label: string;
  value: string;
  delta: number; // %
  tone: DeltaTone; // cor da seta
  icon: "pipeline" | "fogo" | "edital" | "relogio" | "alerta";
}

export const KPIS: Kpi[] = [
  { key: "pipeline", label: "Pipeline Monitorado", value: "R$ 4,8 Mi", delta: 18, tone: "up", icon: "pipeline" },
  { key: "quentes", label: "Oportunidades Quentes", value: "12", delta: 20, tone: "up", icon: "fogo" },
  { key: "editais90", label: "Editais Prováveis 90 dias", value: "7", delta: 40, tone: "up", icon: "edital" },
  { key: "vencendo", label: "Contratos Vencendo", value: "18", delta: 12, tone: "up", icon: "relogio" },
  { key: "urgentes", label: "Ações Urgentes", value: "5", delta: 25, tone: "warn", icon: "alerta" },
];

// Cores de chart (navy primary + apoio). recharts aceita hsl(var(--x)) e hex.
export const CHART = {
  primary: "hsl(224 85% 29%)",
  secondary: "hsl(224 71% 45%)",
  teal: "hsl(190 80% 38%)",
  amber: "hsl(38 92% 50%)",
  emerald: "hsl(142 64% 38%)",
  slate: "hsl(215 16% 60%)",
  grid: "hsl(214 32% 91%)",
};

export interface Segmento { nome: string; valor: number; pct: number; cor: string }
export const SEGMENTOS: Segmento[] = [
  { nome: "Serviços Gerais", valor: 1.64, pct: 34, cor: CHART.primary },
  { nome: "Manutenção Predial", valor: 1.12, pct: 23, cor: CHART.secondary },
  { nome: "T.I. e Telecom", valor: 0.86, pct: 18, cor: CHART.teal },
  { nome: "Segurança", valor: 0.62, pct: 13, cor: CHART.amber },
  { nome: "Saúde", valor: 0.34, pct: 7, cor: CHART.emerald },
  { nome: "Outros", valor: 0.24, pct: 5, cor: CHART.slate },
];
export const SEGMENTO_TOTAL = "R$ 4,82 Mi";

export interface TendPonto { mes: string; identificadas: number; publicados: number }
export const TENDENCIA: TendPonto[] = [
  { mes: "Dez/25", identificadas: 12, publicados: 6 },
  { mes: "Jan/26", identificadas: 19, publicados: 9 },
  { mes: "Fev/26", identificadas: 24, publicados: 11 },
  { mes: "Mar/26", identificadas: 31, publicados: 14 },
  { mes: "Abr/26", identificadas: 38, publicados: 17 },
  { mes: "Mai/26", identificadas: 46, publicados: 19 },
];

export interface PipelineBucket { nome: string; count: number; valor: string; pct: number; cor: string }
export const PIPELINE: PipelineBucket[] = [
  { nome: "Novas", count: 34, valor: "R$ 760 mil", pct: 12, cor: CHART.slate },
  { nome: "Qualificadas", count: 28, valor: "R$ 980 mil", pct: 15, cor: CHART.teal },
  { nome: "Preparar Agora", count: 16, valor: "R$ 1,25 Mi", pct: 20, cor: CHART.amber },
  { nome: "Aguardando Edital", count: 10, valor: "R$ 920 mil", pct: 14, cor: CHART.secondary },
  { nome: "Edital Publicado", count: 8, valor: "R$ 610 mil", pct: 10, cor: CHART.primary },
  { nome: "Participando", count: 6, valor: "R$ 1,29 Mi", pct: 29, cor: CHART.emerald },
];

export type SinalCor = "emerald" | "amber" | "primary" | "destructive" | "slate" | "teal";
export interface Sinal { cor: SinalCor; texto: string; quando: string }
export const SINAIS: Sinal[] = [
  { cor: "emerald", texto: "PCA publicado — Prefeitura de São Luís incluiu controle de pragas", quando: "Hoje, 09:32" },
  { cor: "amber", texto: "Contrato anterior vence em 74 dias (dedetização de escolas)", quando: "Hoje, 08:41" },
  { cor: "primary", texto: "ETP detectado para controle de vetores (SEMUS)", quando: "Ontem, 17:26" },
  { cor: "teal", texto: "IRP aberta — janela muito próxima", quando: "Ontem, 14:05" },
  { cor: "destructive", texto: "Licitação fracassada — possível republicação", quando: "Ontem, 10:12" },
  { cor: "slate", texto: "Concorrente sancionado no CEIS/CNEP", quando: "Anteontem, 16:48" },
];

export type Prioridade = "Alta" | "Média" | "Baixa";
export interface Tarefa { titulo: string; prioridade: Prioridade; prazo: string }
export const TAREFAS: Tarefa[] = [
  { titulo: "Atualizar CND Federal", prioridade: "Alta", prazo: "vence em 8 dias" },
  { titulo: "Preparar atestado técnico — São Luís/MA", prioridade: "Alta", prazo: "até 18/06" },
  { titulo: "Revisar preço mínimo — dedetização escolas", prioridade: "Média", prazo: "até 19/06" },
  { titulo: "Analisar edital anterior — SEMUS", prioridade: "Média", prazo: "até 20/06" },
  { titulo: "Monitorar IRP aberta até sexta-feira", prioridade: "Baixa", prazo: "até 16/06" },
];
