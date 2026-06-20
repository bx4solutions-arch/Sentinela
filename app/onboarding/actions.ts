"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { consultarBrasilApi, raioxToCompanyRow, type RaioX, type ConsultaResult } from "@/lib/brasilapi";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveMunicipio } from "@/lib/ibge";

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
  const trocar = String(formData.get("trocar") ?? "") === "1";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Trocar empresa = ação deliberada: apaga a empresa atual (cascade nos documentos) e recria do zero.
  if (trocar) {
    await supabase.from("company").delete().eq("tenant_id", user.id);
  }

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
      escopo: "company",
      tipo: c.tipo,
      vencimento: c.vencimento,
      emissao: c.emissao || null,
    }));
  if (validCerts.length) {
    await supabase.from("documento").upsert(validCerts, { onConflict: "company_id,tipo" });
  }

  // Escopo: monitora automaticamente a cidade da empresa (enfileira coleta se nova).
  if (raiox.municipio && raiox.uf) {
    const m = await resolveMunicipio(raiox.uf, raiox.municipio);
    if (m) {
      await supabase.from("celula").upsert(
        { tenant_id: user.id, codigo_ibge: m.codigo_ibge, municipio: m.nome, uf: raiox.uf },
        { onConflict: "tenant_id,codigo_ibge" }
      );
      const admin = createAdminClient();
      const { data: cc } = await admin.from("cidade_coletada").select("status").eq("codigo_ibge", m.codigo_ibge).maybeSingle();
      if (!cc) await admin.from("cidade_coletada").insert({ codigo_ibge: m.codigo_ibge, municipio: m.nome, uf: raiox.uf, status: "pendente" });
    }
  }

  revalidatePath("/", "layout");
  redirect("/empresa");
}
