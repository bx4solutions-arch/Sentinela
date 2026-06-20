"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { consultarBrasilApi, raioxToCompanyRow } from "@/lib/brasilapi";

/** Cadastra/atualiza uma certidão (um documento por tipo por empresa). */
export async function addCertidao(formData: FormData): Promise<void> {
  const tipo = String(formData.get("tipo") ?? "");
  const vencimento = String(formData.get("vencimento") ?? "").trim();
  const emissao = String(formData.get("emissao") ?? "").trim() || null;
  const numero = String(formData.get("numero") ?? "").trim() || null;
  if (!tipo || !vencimento) return;

  const supabase = await createClient();
  const { data: company } = await supabase.from("company").select("id").maybeSingle();
  if (!company) return;

  await supabase
    .from("certidao")
    .upsert({ company_id: company.id, tipo, vencimento, emissao, numero }, { onConflict: "company_id,tipo" });
  revalidatePath("/empresa");
}

export async function deleteCertidao(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const supabase = await createClient();
  await supabase.from("certidao").delete().eq("id", id);
  revalidatePath("/empresa");
}

/** Botão "Atualizar": re-consulta a BrasilAPI pelo CNPJ salvo e atualiza a ficha. */
export async function atualizarEmpresa(): Promise<void> {
  const supabase = await createClient();
  const { data: company } = await supabase.from("company").select("cnpj, segmentos").maybeSingle();
  if (!company?.cnpj) return;

  const res = await consultarBrasilApi(company.cnpj);
  if (!res.ok) return;

  await supabase
    .from("company")
    .update({ ...raioxToCompanyRow(res.data), atualizado_em: new Date().toISOString() })
    .eq("cnpj", company.cnpj);
  revalidatePath("/empresa");
}
