// lib/agent/providers/base.ts
//
// Implementação compartilhada dos 3 providers. O Vercel AI SDK é usado aqui
// como DRIVER interno (normaliza streaming SSE e tool-calling de
// Anthropic/OpenAI/Google). Nada fora de lib/agent/providers importa "ai" —
// o resto do Sentinela só conhece a interface AIProvider (tipos.ts).

import { generateText, streamText, tool as aiTool, type ModelMessage, type ToolSet } from "ai";
import type { LanguageModel } from "ai";
import type {
  AIProvider,
  AIRequest,
  AIResponse,
  AIStreamEvent,
  MotivoParada,
  NomeProvider,
  ToolCall,
} from "./tipos";
import { calcularCustoUSD } from "./custos";

function mapearTools(req: AIRequest): ToolSet | undefined {
  if (!req.tools || req.tools.length === 0) return undefined;
  const set: ToolSet = {};
  for (const t of req.tools) {
    // SEM execute: o modelo devolve tool calls e o RUNTIME executa via
    // registry (princípio: provider nunca conhece handlers).
    set[t.nome] = aiTool({ description: t.descricao, inputSchema: t.inputSchema });
  }
  return set;
}

function mapearMensagens(req: AIRequest): ModelMessage[] {
  const msgs: ModelMessage[] = req.mensagens.map((m) => ({ role: m.role, content: m.content }));

  // Resultados de tools da iteração anterior do loop do runtime:
  // assistant(tool-call) + tool(tool-result), no formato do AI SDK.
  if (req.toolResultados && req.toolResultados.length > 0) {
    msgs.push({
      role: "assistant",
      content: req.toolResultados.map(({ chamada }) => ({
        type: "tool-call" as const,
        toolCallId: chamada.id,
        toolName: chamada.nome,
        input: chamada.input,
      })),
    });
    msgs.push({
      role: "tool",
      content: req.toolResultados.map(({ resultado }) => ({
        type: "tool-result" as const,
        toolCallId: resultado.toolCallId,
        toolName: resultado.nome,
        output: { type: "json" as const, value: resultado.output as never },
      })),
    });
  }
  return msgs;
}

function mapearParada(finishReason: string): MotivoParada {
  if (finishReason === "stop") return "fim";
  if (finishReason === "tool-calls") return "tool_use";
  if (finishReason === "length") return "max_tokens";
  return "outro";
}

export function criarProviderBase(
  nome: NomeProvider,
  modeloId: string,
  model: LanguageModel,
): AIProvider {
  return {
    nome,
    modelo: modeloId,

    async gerar(req: AIRequest): Promise<AIResponse> {
      const resultado = await generateText({
        model,
        system: req.system,
        messages: mapearMensagens(req),
        tools: mapearTools(req),
        maxOutputTokens: req.maxTokens ?? 2048,
        temperature: req.temperatura,
      });

      const tokensEntrada = resultado.usage.inputTokens ?? 0;
      const tokensSaida = resultado.usage.outputTokens ?? 0;

      const toolCalls: ToolCall[] = resultado.toolCalls.map((tc) => ({
        id: tc.toolCallId,
        nome: tc.toolName,
        input: tc.input,
      }));

      return {
        texto: resultado.text || null,
        toolCalls,
        uso: {
          tokensEntrada,
          tokensSaida,
          custoUSD: calcularCustoUSD(modeloId, tokensEntrada, tokensSaida),
        },
        parada: mapearParada(resultado.finishReason),
      };
    },

    async *gerarStream(req: AIRequest): AsyncIterable<AIStreamEvent> {
      const resultado = streamText({
        model,
        system: req.system,
        messages: mapearMensagens(req),
        tools: mapearTools(req),
        maxOutputTokens: req.maxTokens ?? 2048,
        temperature: req.temperatura,
      });

      for await (const parte of resultado.fullStream) {
        if (parte.type === "text-delta") {
          yield { tipo: "texto", delta: parte.text };
        } else if (parte.type === "tool-call") {
          yield {
            tipo: "tool_call",
            chamada: { id: parte.toolCallId, nome: parte.toolName, input: parte.input },
          };
        } else if (parte.type === "finish") {
          const tokensEntrada = parte.totalUsage?.inputTokens ?? 0;
          const tokensSaida = parte.totalUsage?.outputTokens ?? 0;
          yield {
            tipo: "uso",
            uso: {
              tokensEntrada,
              tokensSaida,
              custoUSD: calcularCustoUSD(modeloId, tokensEntrada, tokensSaida),
            },
          };
          yield { tipo: "fim", parada: mapearParada(parte.finishReason) };
        }
      }
    },
  };
}
