"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { consultarBrasilApi, raioxToCompanyRow, type RaioX, type ConsultaResult } from "@/lib/brasilapi";

export type ConsultaState = ConsultaResult | { ok: false; error?: undefined };

export async function consultarCnpjAction(_prev: ConsultaState, formData: FormData): Promise<ConsultaState> {
  return consultarBrasilApi(String(formData.get("cnpj") ?? ""));
}

export async function concluirOnboarding(formData: FormData) {
  let raiox: RaioX;
  let certs: { tipo: string; vencimento: string; emissao?: string | null }[];
  try {
    raiox = JSON.parse(String(formData.get("raiox") ?? "{}")) as RaioX;
    certs = JSON.parse(String(formData.get("certidoes") ?? "[]"));
  } catch {
    redirect("/onboarding?error=" + encodeURIComponent("Dados inválidos. Refaça."));
  }
  const segmentos = formData.getAll("segmentos").map(String).filter(Boolean);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const row = {
    ...raioxToCompanyRow(raiox),
    tenant_id: user.id,
    segmentos: segmentos.length ? segmentos : ["generico"],
    atualizado_em: new Date().toISOString(),
  };
  const { data: comp, error } = await supabase
    .from("company")
    .upsert(row, { onConflict: "tenant_id" })
    .select("id")
    .single();
  if (error || !comp) {
    redirect("/onboarding?error=" + encodeURIComponent(error?.message ?? "Falha ao salvar a empresa."));
  }

  const validCerts = (certs ?? [])
    .filter((c) => c.tipo && c.vencimento)
    .map((c) => ({
      company_id: comp.id,
      tipo: c.tipo,
      vencimento: c.vencimento,
      emissao: c.emissao || null,
    }));
  if (validCerts.length) {
    await supabase.from("certidao").upsert(validCerts, { onConflict: "company_id,tipo" });
  }

  revalidatePath("/", "layout");
  redirect("/empresa");
}
