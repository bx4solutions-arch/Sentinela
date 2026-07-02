// components/widgets/registry.ts
//
// Registry de widgets da UI generativa (princípio 3: nunca só texto).
// Na Fase B, a resposta do agente vem como blocos { widget, props } e o chat
// resolve cada bloco AQUI. Mesmo padrão do registry de tools: fechado,
// adicionar widget = adicionar import + entrada.

import type { ComponentType } from "react";
import { AlvoCard } from "./alvo-card";
import { LicitacaoCard } from "./licitacao-card";
import { TabelaLicitacoes } from "./tabela-licitacoes";
import { MetricCard } from "./metric-card";
import { Gauge, SubScore, EixoReal } from "./score-semaforo";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const WIDGETS: Record<string, ComponentType<any>> = {
  alvo: AlvoCard,
  licitacao_card: LicitacaoCard,
  tabela_licitacoes: TabelaLicitacoes,
  metric: MetricCard,
  gauge: Gauge,
  sub_score: SubScore,
  eixo_real: EixoReal,
};

export type TipoWidget = keyof typeof WIDGETS;

export interface BlocoWidget {
  widget: TipoWidget;
  props: Record<string, unknown>;
}
