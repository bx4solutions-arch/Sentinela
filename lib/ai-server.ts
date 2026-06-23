import "server-only";
// IA INCLUSA — chave NOSSA, server-side. A chave vive só no env do servidor (SENTINELA_AI_*),
// JAMAIS vai pro client (este módulo é server-only) e JAMAIS é commitada (.gitignore).
// Não é BYOK: o cliente não cadastra chave. Reusa lib/llm (adapters) — só troca a ORIGEM da chave.
import { complete, type Provider } from "@/lib/llm";

export type AIConfig = { provider: Provider; model: string; key: string };

/** Config da IA a partir do env do servidor. null = IA indisponível → degrada pro determinístico. */
export function aiConfig(): AIConfig | null {
  const provider = (process.env.SENTINELA_AI_PROVIDER || "").trim() as Provider;
  const model = (process.env.SENTINELA_AI_MODEL || "").trim();
  const key = (process.env.SENTINELA_AI_KEY || "").trim();
  if (!provider || !model || !key) return null;
  return { provider, model, key };
}

/** A IA está ligada (chave nossa no env)? */
export function temIA(): boolean {
  return aiConfig() !== null;
}

/** Rótulo do modelo p/ logs/UI (sem expor a chave). */
export function modeloLabel(): string {
  const c = aiConfig();
  return c ? `${c.provider}:${c.model}` : "determinístico";
}

/** Chamada à IA — a chave nunca sai daqui (não é argumento, não vai pro client). */
export async function chamarIA(args: { system?: string; prompt: string; maxTokens?: number }): Promise<string> {
  const c = aiConfig();
  if (!c) throw new Error("IA_INDISPONIVEL");
  return complete({ provider: c.provider, model: c.model, apiKey: c.key, ...args });
}
