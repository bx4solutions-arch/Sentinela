// lib/agent/providers/openai.ts
import { createOpenAI } from "@ai-sdk/openai";
import type { AIProvider } from "./tipos";
import { criarProviderBase } from "./base";

export const MODELO_PADRAO_OPENAI = "gpt-5";

export function criarProviderOpenAI(apiKey: string, modelo?: string): AIProvider {
  const id = modelo ?? MODELO_PADRAO_OPENAI;
  const openai = createOpenAI({ apiKey });
  return criarProviderBase("openai", id, openai(id));
}
