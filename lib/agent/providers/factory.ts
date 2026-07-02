// lib/agent/providers/factory.ts
//
// Seleção de provider por ambiente (Fase A) — e, no futuro, por tenant
// (Painel BX4): getProvider() aceita override explícito, então "provider por
// cliente" vira uma coluna no banco depois, sem refactor.
//
// Variáveis:
//   AI_PROVIDER = anthropic | openai | gemini   (padrão: anthropic)
//   AI_MODEL    = id do modelo                   (padrão por provider)
//   ANTHROPIC_API_KEY / OPENAI_API_KEY / GEMINI_API_KEY
//
// SEGURANÇA: este módulo lê process.env — só pode ser importado server-side.
// Nenhuma chave jamais é retornada/logada.

import type { AIProvider, NomeProvider } from "./tipos";
import { criarProviderAnthropic } from "./anthropic";
import { criarProviderOpenAI } from "./openai";
import { criarProviderGemini } from "./gemini";

const NOMES: NomeProvider[] = ["anthropic", "openai", "gemini"];

interface OverrideProvider {
  provider?: NomeProvider;
  modelo?: string;
}

const cache = new Map<string, AIProvider>();

function chaveEnvDo(nome: NomeProvider): string {
  return nome === "anthropic"
    ? "ANTHROPIC_API_KEY"
    : nome === "openai"
      ? "OPENAI_API_KEY"
      : "GEMINI_API_KEY";
}

export function getProvider(override?: OverrideProvider): AIProvider {
  const nomeBruto = override?.provider ?? process.env.AI_PROVIDER ?? "anthropic";
  if (!NOMES.includes(nomeBruto as NomeProvider)) {
    throw new Error(
      `AI_PROVIDER inválido: "${nomeBruto}". Use um de: ${NOMES.join(" | ")}.`,
    );
  }
  const nome = nomeBruto as NomeProvider;
  const modelo = override?.modelo ?? process.env.AI_MODEL ?? undefined;

  const chaveCache = `${nome}:${modelo ?? "padrao"}`;
  const existente = cache.get(chaveCache);
  if (existente) return existente;

  const envKey = chaveEnvDo(nome);
  const apiKey = process.env[envKey];
  if (!apiKey) {
    throw new Error(
      `Provider "${nome}" selecionado mas ${envKey} não está configurada. ` +
        `Defina a variável no .env.local (dev) ou nas env vars do Vercel (prod).`,
    );
  }

  const provider =
    nome === "anthropic"
      ? criarProviderAnthropic(apiKey, modelo)
      : nome === "openai"
        ? criarProviderOpenAI(apiKey, modelo)
        : criarProviderGemini(apiKey, modelo);

  cache.set(chaveCache, provider);
  return provider;
}
