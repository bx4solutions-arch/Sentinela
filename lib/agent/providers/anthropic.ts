// lib/agent/providers/anthropic.ts
import { createAnthropic } from "@ai-sdk/anthropic";
import type { AIProvider } from "./tipos";
import { criarProviderBase } from "./base";

export const MODELO_PADRAO_ANTHROPIC = "claude-sonnet-4-5";

export function criarProviderAnthropic(apiKey: string, modelo?: string): AIProvider {
  const id = modelo ?? MODELO_PADRAO_ANTHROPIC;
  const anthropic = createAnthropic({ apiKey });
  return criarProviderBase("anthropic", id, anthropic(id));
}
