"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { encrypt } from "@/lib/crypto";

export type AiConfigView = { provider: string; model: string; hasKey: boolean };

/** Lê config de IA do tenant (sem expor a chave). Server-only (admin client). */
export async function getAiConfig(): Promise<AiConfigView | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const admin = createAdminClient();
  const { data } = await admin
    .from("tenant_ai_config")
    .select("provider, model, api_key_encrypted")
    .eq("tenant_id", user.id)
    .maybeSingle();
  if (!data) return null;
  return { provider: data.provider, model: data.model, hasKey: !!data.api_key_encrypted };
}

export async function saveAiConfig(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const provider = String(formData.get("provider") ?? "anthropic");
  const modelSel = String(formData.get("model") ?? "");
  const modelCustom = String(formData.get("model_custom") ?? "").trim();
  const model = modelCustom || modelSel;
  const apiKey = String(formData.get("apiKey") ?? "").trim();
  if (!provider || !model) return;

  const admin = createAdminClient();
  const row: Record<string, unknown> = {
    tenant_id: user.id, provider, model, atualizado_em: new Date().toISOString(),
  };
  if (apiKey) row.api_key_encrypted = encrypt(apiKey); // só sobrescreve se digitou nova
  await admin.from("tenant_ai_config").upsert(row, { onConflict: "tenant_id" });

  revalidatePath("/configuracoes");
  revalidatePath("/licitacao", "layout");
}
