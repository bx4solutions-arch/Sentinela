"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function setStage(numero: string, stage: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !numero) return;
  await supabase.from("oportunidade").upsert(
    {
      tenant_id: user.id,
      numero_controle_pncp: numero,
      stage,
      atualizado_em: new Date().toISOString(),
    },
    { onConflict: "tenant_id,numero_controle_pncp" }
  );
  revalidatePath("/radar");
}

export async function monitorar(formData: FormData) {
  await setStage(String(formData.get("numero") ?? ""), "monitorando");
}

export async function descartar(formData: FormData) {
  await setStage(String(formData.get("numero") ?? ""), "descartado");
}

export async function reverter(formData: FormData) {
  const numero = String(formData.get("numero") ?? "");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !numero) return;
  await supabase.from("oportunidade").delete().eq("numero_controle_pncp", numero);
  revalidatePath("/radar");
}
