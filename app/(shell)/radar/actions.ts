"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveMunicipio } from "@/lib/ibge";

/** Passa a monitorar uma cidade: cria a célula do tenant e enfileira a coleta global (se nova). */
export async function monitorarCidade(formData: FormData) {
  let codigo_ibge = String(formData.get("codigo_ibge") ?? "");
  const municipio = String(formData.get("municipio") ?? "");
  const uf = String(formData.get("uf") ?? "");
  if (!codigo_ibge && municipio && uf) {
    const m = await resolveMunicipio(uf, municipio);
    if (m) codigo_ibge = m.codigo_ibge;
  }
  if (!codigo_ibge) return;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("celula").upsert(
    { tenant_id: user.id, codigo_ibge, municipio, uf },
    { onConflict: "tenant_id,codigo_ibge" }
  );

  // enfileira coleta global só se a cidade ainda não foi coletada (reuso)
  const admin = createAdminClient();
  const { data: cc } = await admin.from("cidade_coletada").select("status").eq("codigo_ibge", codigo_ibge).maybeSingle();
  if (!cc) await admin.from("cidade_coletada").insert({ codigo_ibge, municipio, uf, status: "pendente" });

  revalidatePath("/radar");
  revalidatePath("/dashboard");
}

export async function removerCidade(formData: FormData) {
  const codigo_ibge = String(formData.get("codigo_ibge") ?? "");
  if (!codigo_ibge) return;
  const supabase = await createClient();
  await supabase.from("celula").delete().eq("codigo_ibge", codigo_ibge);
  revalidatePath("/radar");
  revalidatePath("/dashboard");
}

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

export async function analisar(formData: FormData) {
  const numero = String(formData.get("numero") ?? "");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !numero) return;
  const { data: ed } = await supabase.from("raw_editais").select("objeto").eq("numero_controle_pncp", numero).maybeSingle();
  const { data: lic } = await supabase
    .from("licitacao")
    .upsert(
      { tenant_id: user.id, numero_controle_pncp: numero, titulo: (ed?.objeto ?? "Licitação").slice(0, 140) },
      { onConflict: "tenant_id,numero_controle_pncp" }
    )
    .select("id")
    .single();
  if (lic) redirect(`/licitacao/${lic.id}`);
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
