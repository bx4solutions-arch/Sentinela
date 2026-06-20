"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { decrypt } from "@/lib/crypto";
import { complete, type Provider } from "@/lib/llm";

type EditalCtx = { objeto: string | null; valor_estimado: number | null; modalidade_nome: string | null; orgao: { razao_social: string | null } | null };

export async function analisarComIA(formData: FormData) {
  const licitacao_id = String(formData.get("licitacao_id") ?? "");
  if (!licitacao_id) return;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const { data: cfg } = await admin
    .from("tenant_ai_config")
    .select("provider, model, api_key_encrypted")
    .eq("tenant_id", user.id)
    .maybeSingle();
  if (!cfg) redirect("/configuracoes");

  const provider = cfg.provider as Provider;
  const apiKey = provider === "mock" ? "mock" : cfg.api_key_encrypted ? decrypt(cfg.api_key_encrypted) : "";
  if (!apiKey) redirect("/configuracoes");

  const { data: lic } = await supabase
    .from("licitacao")
    .select("titulo, raw_editais:numero_controle_pncp(objeto, valor_estimado, modalidade_nome, orgao:cnpj_orgao(razao_social))")
    .eq("id", licitacao_id)
    .maybeSingle();
  const ed = (lic?.raw_editais ?? null) as unknown as EditalCtx | null;
  const { data: company } = await supabase.from("company").select("razao_social, segmentos, porte, municipio, uf").maybeSingle();

  const system = "Você é um analista de licitações públicas brasileiro (Lei 14.133/2021). Responda SOMENTE com JSON válido, sem markdown.";
  const prompt = `Analise esta licitação para a empresa licitante e responda em JSON com as chaves exatas:
{"resumo": string, "riscos": [{"nivel":"verde|amarelo|vermelho","texto":string}], "veredito": {"recomendacao": string, "probabilidade":"baixa|média|alta", "justificativa": string, "prontidao_pct": number}, "empresa_edital": {"status":"apto|ressalvas|nao_apto","faltam":[string]}}

EDITAL
Órgão: ${ed?.orgao?.razao_social ?? "—"}
Modalidade: ${ed?.modalidade_nome ?? "—"}
Objeto: ${ed?.objeto ?? lic?.titulo ?? "—"}

EMPRESA LICITANTE
Razão social: ${company?.razao_social ?? "—"} | Porte: ${company?.porte ?? "—"} | Local: ${company?.municipio ?? ""}/${company?.uf ?? ""}
Segmentos: ${(company?.segmentos ?? []).join(", ")}

O veredito é uma recomendação calibrada (probabilística), nunca uma garantia.`;

  let conteudo: unknown;
  try {
    const txt = await complete({ provider, model: cfg.model, apiKey, system, prompt, maxTokens: 1800 });
    try { conteudo = JSON.parse(txt.replace(/```json|```/g, "").trim()); }
    catch { conteudo = { resumo: txt }; }
  } catch (e) {
    conteudo = { erro: String(e instanceof Error ? e.message : e) };
  }

  await admin.from("analise").upsert(
    { tenant_id: user.id, licitacao_id, tipo: "completa", conteudo, modelo: `${provider}:${cfg.model}` },
    { onConflict: "licitacao_id,tipo" }
  );
  revalidatePath(`/licitacao/${licitacao_id}`);
}

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
