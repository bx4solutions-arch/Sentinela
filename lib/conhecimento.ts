import "server-only";
import { createClient } from "@/lib/supabase/server";
import { embed } from "@/lib/embeddings";

export type LexiaHit = {
  title: string; content: string; url: string | null; type: string; source: string; similarity?: number;
};

/** Totais do corpus federal (lexia_corpus) + quantos já têm embedding. */
export async function statsConhecimento(): Promise<{ total: number; comEmbedding: number }> {
  const sb = await createClient();
  const { count: total } = await sb.from("lexia_corpus").select("id", { count: "exact", head: true });
  const { count: comEmbedding } = await sb.from("lexia_corpus").select("id", { count: "exact", head: true }).not("embedding", "is", null);
  return { total: total ?? 0, comEmbedding: comEmbedding ?? 0 };
}

/** Lista as fontes federais (a legislação seedada). */
export async function listarFontes(): Promise<{ title: string; type: string; url: string | null }[]> {
  const sb = await createClient();
  const { data } = await sb.from("lexia_corpus").select("title, type, url").order("title").limit(60);
  return (data ?? []) as { title: string; type: string; url: string | null }[];
}

/**
 * Busca na base de conhecimento. Semântica (match_lexia) quando há embeddings;
 * caso contrário, busca TEXTUAL (ilike) — estado honesto, sem fingir semântica.
 */
export async function buscarConhecimento(termo: string): Promise<{ modo: "semantica" | "textual"; hits: LexiaHit[] }> {
  const sb = await createClient();
  const t = termo.trim();
  const { comEmbedding } = await statsConhecimento();
  if (!t) return { modo: comEmbedding > 0 ? "semantica" : "textual", hits: [] };

  if (comEmbedding > 0) {
    const emb = await embed(t);
    if (emb) {
      const { data } = await sb.rpc("match_lexia", { query_embedding: emb, match_count: 6 });
      if (Array.isArray(data)) return { modo: "semantica", hits: data as LexiaHit[] };
    }
  }
  // Fallback textual (sem custo de IA): casa título/conteúdo.
  const { data } = await sb.from("lexia_corpus")
    .select("title, content, url, type, source")
    .or(`title.ilike.%${t}%,content.ilike.%${t}%`)
    .limit(6);
  return { modo: "textual", hits: (data ?? []) as LexiaHit[] };
}
