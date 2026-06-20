"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function addDocLicitacao(formData: FormData) {
  const licitacao_id = String(formData.get("licitacao_id") ?? "");
  const nome = String(formData.get("nome") ?? "").trim();
  const tipo = String(formData.get("tipo") ?? "anexo").trim() || "anexo";
  if (!licitacao_id || !nome) return;
  const supabase = await createClient();
  await supabase.from("documento").insert({
    escopo: "licitacao",
    licitacao_id,
    tipo,
    tipo_label: nome,
  });
  revalidatePath(`/licitacao/${licitacao_id}`);
}

export async function deleteDocLicitacao(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const licitacao_id = String(formData.get("licitacao_id") ?? "");
  if (!id) return;
  const supabase = await createClient();
  await supabase.from("documento").delete().eq("id", id);
  revalidatePath(`/licitacao/${licitacao_id}`);
}

export async function excluirLicitacao(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const supabase = await createClient();
  await supabase.from("licitacao").delete().eq("id", id); // cascade nos documentos do processo
  revalidatePath("/radar");
  redirect("/radar");
}
