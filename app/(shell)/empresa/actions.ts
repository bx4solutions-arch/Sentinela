"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { consultarBrasilApi, raioxToCompanyRow } from "@/lib/brasilapi";

const slug = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 40);

/** Cadastra/atualiza um documento (escopo company). Tipo conhecido (slug) ou custom ("Outro…"). */
export async function addDocumento(formData: FormData): Promise<void> {
  let tipo = String(formData.get("tipo") ?? "");
  let tipo_label: string | null = null;
  if (tipo === "__outro__") {
    const custom = String(formData.get("tipo_custom") ?? "").trim();
    if (!custom) return;
    tipo = "custom_" + slug(custom);
    tipo_label = custom;
  }
  const vencimento = String(formData.get("vencimento") ?? "").trim();
  const emissao = String(formData.get("emissao") ?? "").trim() || null;
  const numero = String(formData.get("numero") ?? "").trim() || null;
  if (!tipo || !vencimento) return;

  const supabase = await createClient();
  const { data: company } = await supabase.from("company").select("id").maybeSingle();
  if (!company) return;

  await supabase
    .from("documento")
    .upsert(
      { company_id: company.id, escopo: "company", tipo, tipo_label, vencimento, emissao, numero },
      { onConflict: "company_id,tipo" }
    );
  revalidatePath("/empresa");
}

export async function deleteDocumento(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const supabase = await createClient();
  await supabase.from("documento").delete().eq("id", id);
  revalidatePath("/empresa");
}

/** "Atualizar": re-consulta a BrasilAPI pelo MESMO CNPJ (não perde nada). */
export async function atualizarEmpresa(): Promise<void> {
  const supabase = await createClient();
  const { data: company } = await supabase.from("company").select("cnpj").maybeSingle();
  if (!company?.cnpj) return;
  const res = await consultarBrasilApi(company.cnpj);
  if (!res.ok) return;
  await supabase
    .from("company")
    .update({ ...raioxToCompanyRow(res.data), atualizado_em: new Date().toISOString() })
    .eq("cnpj", company.cnpj);
  revalidatePath("/empresa");
}
