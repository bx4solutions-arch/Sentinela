import "server-only";

// Embeddings via OpenAI (text-embedding-3-small, 1536) usando a chave server-side
// SENTINELA_AI_KEY. NUNCA exposta ao cliente. Retorna null se não houver chave ou
// se a chave não for compatível (mantém a busca em estado honesto = textual).
const KEY = process.env.SENTINELA_AI_KEY;
const MODEL = "text-embedding-3-small";

export function temChaveEmbedding(): boolean {
  return !!KEY;
}

/** Gera o embedding de um texto. null = sem chave ou falha (fallback honesto). */
export async function embed(text: string): Promise<number[] | null> {
  if (!KEY) return null;
  try {
    const r = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: MODEL, input: text.slice(0, 8000) }),
    });
    if (!r.ok) return null;
    const j = await r.json();
    const v = j?.data?.[0]?.embedding;
    return Array.isArray(v) && v.length === 1536 ? v : null;
  } catch {
    return null;
  }
}

/** Valida a chave para embeddings sem expor o segredo: embeda um texto curto. */
export async function validarChaveEmbedding(): Promise<{ ok: boolean; dims: number }> {
  const v = await embed("teste de compatibilidade de embedding");
  return { ok: !!v, dims: v?.length ?? 0 };
}
