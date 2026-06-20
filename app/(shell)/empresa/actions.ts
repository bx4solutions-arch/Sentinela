"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function addCertidao(formData: FormData): Promise<void> {
  const tipo = String(formData.get("tipo") ?? "");
  const descricao = String(formData.get("descricao") ?? "").trim() || null;
  const numero = String(formData.get("numero") ?? "").trim() || null;
  const emissao = String(formData.get("emissao") ?? "").trim() || null;
  const vencimento = String(formData.get("vencimento") ?? "").trim();
  if (!tipo || !vencimento) return;

  const supabase = await createClient();
  const { data: company } = await supabase.from("company").select("id").maybeSingle();
  if (!company) return;

  await supabase.from("certidao").insert({
    company_id: company.id,
    tipo,
    descricao,
    numero,
    emissao,
    vencimento,
  });
  revalidatePath("/empresa");
}

export async function deleteCertidao(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const supabase = await createClient();
  await supabase.from("certidao").delete().eq("id", id);
  revalidatePath("/empresa");
}
