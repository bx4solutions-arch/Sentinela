// Adapter unificado de LLM (BYOK). Roteia para Anthropic / OpenAI / Google / mock.
// Extensível: adicione um case em complete() + endpointFor() e uma entrada em PROVIDERS.

export type Provider = "anthropic" | "openai" | "google" | "mock";

export const PROVIDERS: { key: Provider; label: string; models: string[] }[] = [
  { key: "anthropic", label: "Anthropic (Claude)", models: ["claude-opus-4-8", "claude-sonnet-4-6", "claude-haiku-4-5-20251001"] },
  { key: "openai", label: "OpenAI (GPT)", models: ["gpt-4.1", "gpt-4o", "gpt-4o-mini"] },
  { key: "google", label: "Google (Gemini)", models: ["gemini-2.0-flash", "gemini-1.5-pro"] },
  { key: "mock", label: "Mock (teste, sem custo)", models: ["mock-1"] },
];

export const DEFAULT_PROVIDER: Provider = "anthropic";
export const DEFAULT_MODEL = "claude-haiku-4-5-20251001";

/** Host de destino por provedor — usado em teste pra confirmar roteamento. */
export function endpointFor(provider: Provider, model: string): string {
  switch (provider) {
    case "anthropic": return "https://api.anthropic.com/v1/messages";
    case "openai": return "https://api.openai.com/v1/chat/completions";
    case "google": return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
    case "mock": return "mock://local";
  }
}

export type CompleteArgs = { provider: Provider; model: string; apiKey: string; system?: string; prompt: string; maxTokens?: number };

// Teto de tempo da chamada à IA. Sem isto, um provedor que pendura travava a server action
// indefinidamente (ex.: Resumo Profundo nunca renderizava). Estoura → throw → o chamador degrada.
const AI_TIMEOUT_MS = 60_000;

export async function complete({ provider, model, apiKey, system, prompt, maxTokens = 1500 }: CompleteArgs): Promise<string> {
  if (provider === "mock") {
    return JSON.stringify({
      resumo: `Resumo executivo (mock, ${model}). Objeto e exigências extraídos do edital.`,
      riscos: [{ nivel: "amarelo", texto: "Prazo de proposta curto (mock)." }],
      veredito: { recomendacao: "Avaliar com atenção", probabilidade: "média", justificativa: "Análise simulada para teste, sem custo.", prontidao_pct: 50 },
      empresa_edital: { status: "ressalvas", faltam: ["Atestado de capacidade técnica (mock)"] },
    });
  }
  if (provider === "anthropic") {
    const r = await fetch(endpointFor(provider, model), {
      method: "POST",
      headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model, max_tokens: maxTokens, system, messages: [{ role: "user", content: prompt }] }),
      signal: AbortSignal.timeout(AI_TIMEOUT_MS),
    });
    if (!r.ok) throw new Error(`Anthropic ${r.status}: ${(await r.text()).slice(0, 200)}`);
    const j = await r.json();
    return j.content?.[0]?.text ?? "";
  }
  if (provider === "openai") {
    const r = await fetch(endpointFor(provider, model), {
      method: "POST",
      headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({ model, max_tokens: maxTokens, messages: [...(system ? [{ role: "system", content: system }] : []), { role: "user", content: prompt }] }),
      signal: AbortSignal.timeout(AI_TIMEOUT_MS),
    });
    if (!r.ok) throw new Error(`OpenAI ${r.status}: ${(await r.text()).slice(0, 200)}`);
    const j = await r.json();
    return j.choices?.[0]?.message?.content ?? "";
  }
  // google
  const r = await fetch(`${endpointFor(provider, model)}?key=${apiKey}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ systemInstruction: system ? { parts: [{ text: system }] } : undefined, contents: [{ parts: [{ text: prompt }] }] }),
    signal: AbortSignal.timeout(AI_TIMEOUT_MS),
  });
  if (!r.ok) throw new Error(`Google ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const j = await r.json();
  return j.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}
