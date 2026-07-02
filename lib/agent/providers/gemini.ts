// lib/agent/providers/gemini.ts
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import type { AIProvider } from "./tipos";
import { criarProviderBase } from "./base";

export const MODELO_PADRAO_GEMINI = "gemini-2.5-pro";

export function criarProviderGemini(apiKey: string, modelo?: string): AIProvider {
  const id = modelo ?? MODELO_PADRAO_GEMINI;
  const google = createGoogleGenerativeAI({ apiKey });
  return criarProviderBase("gemini", id, google(id));
}
