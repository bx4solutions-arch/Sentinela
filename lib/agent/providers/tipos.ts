// lib/agent/providers/tipos.ts
//
// Interface ÚNICA de provider de IA (Fase A — camada multi-provider).
// O Sentinela inteiro depende SÓ deste contrato: trocar Claude↔OpenAI↔Gemini
// é variável de ambiente; remover o driver interno (Vercel AI SDK) é trocar o
// miolo dos 3 arquivos de provider, nada mais.
//
// Fluxo obrigatório (nunca pular camada):
//   UI → route handler → runtime → AIProvider → modelo
//   Tools NUNCA chamam provider; provider NUNCA conhece tools (recebe specs).

import type { z } from "zod";

export type NomeProvider = "anthropic" | "openai" | "gemini";

export interface AIMessage {
  role: "user" | "assistant";
  content: string;
}

/** Resultado de tool executada pelo runtime, devolvido ao modelo na iteração seguinte. */
export interface ToolResultado {
  toolCallId: string;
  nome: string;
  /** JSON-serializável. Erros vão como { erro: string } — o modelo decide como reagir. */
  output: unknown;
}

/** Spec de tool para o modelo (derivada do registry — o provider não conhece o handler). */
export interface ToolSpec {
  nome: string;
  descricao: string;
  inputSchema: z.ZodTypeAny;
}

export interface ToolCall {
  id: string;
  nome: string;
  input: unknown;
}

export interface AIRequest {
  system: string;
  mensagens: AIMessage[];
  tools?: ToolSpec[];
  /** Resultados de tools da iteração anterior (loop do runtime). */
  toolResultados?: { chamada: ToolCall; resultado: ToolResultado }[];
  maxTokens?: number;
  temperatura?: number;
}

export interface AIUso {
  tokensEntrada: number;
  tokensSaida: number;
  custoUSD: number;
}

export type MotivoParada = "fim" | "tool_use" | "max_tokens" | "outro";

export interface AIResponse {
  texto: string | null;
  toolCalls: ToolCall[];
  uso: AIUso;
  parada: MotivoParada;
}

export type AIStreamEvent =
  | { tipo: "texto"; delta: string }
  | { tipo: "tool_call"; chamada: ToolCall }
  | { tipo: "uso"; uso: AIUso }
  | { tipo: "fim"; parada: MotivoParada };

export interface AIProvider {
  readonly nome: NomeProvider;
  readonly modelo: string;
  gerar(req: AIRequest): Promise<AIResponse>;
  gerarStream(req: AIRequest): AsyncIterable<AIStreamEvent>;
}
