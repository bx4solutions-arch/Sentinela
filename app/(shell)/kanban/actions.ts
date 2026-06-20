"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const STAGES = ["nova", "monitorando", "preparacao", "edital", "resultado"];

export async function moverStage(formData: FormData) {
  const numero = String(formData.get("numero") ?? "");
  const stage = String(formData.get("stage") ?? "");
  if (!numero || !STAGES.includes(stage)) return;
  const supabase = await createClient();
  await supabase
    .from("oportunidade")
    .update({ stage, atualizado_em: new Date().toISOString() })
    .eq("numero_controle_pncp", numero);
  revalidatePath("/kanban");
}

export async function descartarCard(formData: FormData) {
  const numero = String(formData.get("numero") ?? "");
  if (!numero) return;
  const supabase = await createClient();
  await supabase
    .from("oportunidade")
    .update({ stage: "descartado", atualizado_em: new Date().toISOString() })
    .eq("numero_controle_pncp", numero);
  revalidatePath("/kanban");
}
