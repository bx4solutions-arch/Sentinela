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

// Campos de Identidade Visual da empresa (marca/cabeçalho/assinatura p/ propostas e documentos).
const IDENTIDADE_TEXT = [
  "logo_url", "cor_primaria", "cor_secundaria", "cor_texto", "tipografia",
  "cabecalho_linha1", "cabecalho_linha2", "cabecalho_linha3", "cabecalho_linha4",
  "rodape_padrao", "rodape_texto_extra", "papel", "numeracao_formato", "formato_data",
  "assinante_padrao_nome", "assinante_padrao_cargo",
  "responsavel_nome", "responsavel_cargo", "responsavel_email", "responsavel_telefone",
] as const;

/** Salva a Identidade Visual na company do tenant (RLS company_update). Revalida empresa e configurações. */
export async function salvarIdentidade(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const patch: Record<string, unknown> = { atualizado_em: new Date().toISOString() };
  for (const k of IDENTIDADE_TEXT) {
    const v = formData.get(k);
    if (v !== null) patch[k] = String(v).trim() || null;
  }
  // toggles (checkbox ausente = false)
  patch.usar_logo_no_cabecalho = formData.get("usar_logo_no_cabecalho") != null;
  patch.rodape_mostrar_gerado = formData.get("rodape_mostrar_gerado") != null;

  await supabase.from("company").update(patch).eq("tenant_id", user.id);

  revalidatePath("/configuracoes");
  revalidatePath("/empresa");
}
