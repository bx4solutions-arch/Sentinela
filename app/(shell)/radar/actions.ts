"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveMunicipio, tituloCidade } from "@/lib/ibge";

type Nivel = "municipio" | "estado";

/** União de segmentos. Vazio = "todos" é absorvente (região que coleta todos não encolhe). */
function uniaoSegmentos(a: string[], b: string[]): string[] {
  if (!a.length || !b.length) return [];
  return [...new Set([...a, ...b])];
}

/**
 * Grava o escopo do cliente: célula do tenant (setor × região) + registro global de coleta.
 * Upsert MANUAL (select-then-write) porque codigo_ibge é nulo no estado — onConflict não serve.
 */
async function gravarEscopo(opts: {
  nivel: Nivel; codigo_ibge: string | null; municipio: string | null; uf: string; segmentos: string[];
}) {
  const { nivel, codigo_ibge, municipio, uf, segmentos } = opts;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  // --- celula (tenant) ---
  let sel = supabase.from("celula").select("id").eq("tenant_id", user.id).eq("uf", uf).eq("nivel", nivel);
  sel = nivel === "municipio" ? sel.eq("codigo_ibge", codigo_ibge!) : sel.is("codigo_ibge", null);
  const { data: existente } = await sel.maybeSingle();
  if (existente) {
    await supabase.from("celula").update({ municipio, segmentos }).eq("id", existente.id);
  } else {
    await supabase.from("celula").insert({ tenant_id: user.id, nivel, codigo_ibge, municipio, uf, segmentos });
  }

  // --- cidade_coletada (registro GLOBAL): união de segmentos, status pendente se novo ---
  const admin = createAdminClient();
  let ccSel = admin.from("cidade_coletada").select("id,segmentos").eq("uf", uf).eq("nivel", nivel);
  ccSel = nivel === "municipio" ? ccSel.eq("codigo_ibge", codigo_ibge!) : ccSel.is("codigo_ibge", null);
  const { data: cc } = await ccSel.maybeSingle();
  if (cc) {
    await admin.from("cidade_coletada").update({ segmentos: uniaoSegmentos(cc.segmentos ?? [], segmentos) }).eq("id", cc.id);
  } else {
    await admin.from("cidade_coletada").insert({ nivel, codigo_ibge, municipio, uf, segmentos, status: "pendente" });
  }

  revalidatePath("/configuracoes");
  revalidatePath("/radar");
  revalidatePath("/dashboard");
}

/** Escopo client-driven: cidade OU estado + segmento(s). O filtro é obrigatório. */
export async function monitorarEscopo(formData: FormData) {
  const nivel: Nivel = String(formData.get("nivel") ?? "municipio") === "estado" ? "estado" : "municipio";
  const uf = String(formData.get("uf") ?? "").toUpperCase();
  const segmentos = formData.getAll("segmentos").map(String).filter(Boolean);
  if (!uf || !segmentos.length) return; // exige região + ao menos 1 segmento

  if (nivel === "estado") {
    await gravarEscopo({ nivel, codigo_ibge: null, municipio: null, uf, segmentos });
    return;
  }
  let codigo_ibge = String(formData.get("codigo_ibge") ?? "");
  let municipio = tituloCidade(String(formData.get("municipio") ?? ""));
  if (!codigo_ibge && municipio) {
    const m = await resolveMunicipio(uf, municipio);
    if (m) { codigo_ibge = m.codigo_ibge; municipio = m.nome; }
  }
  if (!codigo_ibge) return;
  await gravarEscopo({ nivel, codigo_ibge, municipio, uf, segmentos });
}

/** Remove um escopo do tenant (a coleta global permanece p/ outros clientes da mesma região). */
export async function removerEscopo(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("celula").delete().eq("id", id).eq("tenant_id", user.id);
  revalidatePath("/configuracoes");
  revalidatePath("/radar");
  revalidatePath("/dashboard");
}

/** Compat: monitorar cidade (radar CityPicker). Agora via gravarEscopo (segmentos opcionais). */
export async function monitorarCidade(formData: FormData) {
  let codigo_ibge = String(formData.get("codigo_ibge") ?? "");
  const municipioRaw = String(formData.get("municipio") ?? "");
  const uf = String(formData.get("uf") ?? "");
  let municipio = tituloCidade(municipioRaw); // normaliza (trim + Title Case)
  if (!codigo_ibge && municipioRaw && uf) {
    const m = await resolveMunicipio(uf, municipioRaw);
    if (m) { codigo_ibge = m.codigo_ibge; municipio = m.nome; } // nome oficial do IBGE
  }
  if (!codigo_ibge || !uf) return;
  const segmentos = formData.getAll("segmentos").map(String).filter(Boolean);
  await gravarEscopo({ nivel: "municipio", codigo_ibge, municipio, uf, segmentos });
}

export async function removerCidade(formData: FormData) {
  const codigo_ibge = String(formData.get("codigo_ibge") ?? "");
  if (!codigo_ibge) return;
  const supabase = await createClient();
  await supabase.from("celula").delete().eq("codigo_ibge", codigo_ibge);
  revalidatePath("/radar");
  revalidatePath("/dashboard");
}

async function setStage(numero: string, stage: string, motivo?: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !numero) return;
  const row: Record<string, unknown> = { tenant_id: user.id, numero_controle_pncp: numero, stage, atualizado_em: new Date().toISOString() };
  if (motivo) row.motivo = motivo;
  await supabase.from("oportunidade").upsert(row, { onConflict: "tenant_id,numero_controle_pncp" });
  revalidatePath("/radar");
}

export async function monitorar(formData: FormData) {
  await setStage(String(formData.get("numero") ?? ""), "monitorando");
}

export async function descartar(formData: FormData) {
  await setStage(String(formData.get("numero") ?? ""), "descartado", String(formData.get("motivo") ?? "") || undefined);
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
