"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { temIA, chamarIA, modeloLabel } from "@/lib/ai-server";
import { baixarTextoEdital, extrairTextoDeBytes } from "@/lib/pncp-arquivos";
import { buildResumo, type ResumoEdital } from "@/lib/resumo-edital";
import { buildPromptProfundo, parseProfundo, profundoDeterministico, type ResumoProfundo } from "@/lib/resumo-profundo";

type EditalCtx = { objeto: string | null; valor_estimado: number | null; modalidade_nome: string | null; orgao: { razao_social: string | null } | null };

export async function analisarComIA(formData: FormData) {
  const licitacao_id = String(formData.get("licitacao_id") ?? "");
  if (!licitacao_id) return;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // IA inclusa (chave nossa). Sem chave no env → degrada: não quebra, mantém o determinístico.
  if (!temIA()) { revalidatePath(`/licitacao/${licitacao_id}`); return; }

  const admin = createAdminClient();
  const { data: lic } = await supabase
    .from("licitacao")
    .select("titulo, raw_editais:numero_controle_pncp(objeto, valor_estimado, modalidade_nome, orgao:cnpj_orgao(razao_social))")
    .eq("id", licitacao_id)
    .maybeSingle();
  const ed = (lic?.raw_editais ?? null) as unknown as EditalCtx | null;
  const { data: company } = await supabase.from("company").select("razao_social, segmentos, porte, municipio, uf").maybeSingle();

  const system = "Você é um analista de licitações públicas brasileiro (Lei 14.133/2021). Responda SOMENTE com JSON válido, sem markdown.";
  const prompt = `Analise esta licitação para a empresa licitante e responda em JSON com as chaves exatas:
{"resumo": string, "riscos": [{"nivel":"amarelo|vermelho","texto":string}], "veredito": {"recomendacao": string, "probabilidade":"baixa|média|alta", "justificativa": string, "prontidao_pct": number}, "empresa_edital": {"status":"apto|ressalvas|nao_apto","faltam":[string]}}

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
    const txt = await chamarIA({ system, prompt, maxTokens: 1800 });
    try { conteudo = JSON.parse(txt.replace(/```json|```/g, "").trim()); }
    catch { conteudo = { resumo: txt }; }
  } catch (e) {
    conteudo = { erro: String(e instanceof Error ? e.message : e) };
  }

  await admin.from("analise").upsert(
    { tenant_id: user.id, licitacao_id, tipo: "completa", conteudo, modelo: modeloLabel() },
    { onConflict: "licitacao_id,tipo" }
  );
  revalidatePath(`/licitacao/${licitacao_id}`);
}

const RATE_LIMITE_HORA = 40; // gerações de resumo profundo por tenant/hora (trava de custo)
type Admin = ReturnType<typeof createAdminClient>;
type ProfCtx = { numero: string; ancora: { objeto: string | null; orgao: string | null; numero: string }; resumoDet: ResumoEdital | null };

async function carregarProfCtx(supabase: Awaited<ReturnType<typeof createClient>>, licitacao_id: string): Promise<ProfCtx | null> {
  const { data: lic } = await supabase.from("licitacao")
    .select("numero_controle_pncp, titulo, raw_editais:numero_controle_pncp(objeto, payload, orgao:cnpj_orgao(razao_social))")
    .eq("id", licitacao_id).maybeSingle();
  if (!lic) return null;
  const numero = lic.numero_controle_pncp as string;
  const ed = (lic.raw_editais ?? null) as unknown as { objeto: string | null; payload: unknown; orgao: { razao_social: string | null } | null } | null;
  return { numero, ancora: { objeto: ed?.objeto ?? lic.titulo ?? null, orgao: ed?.orgao?.razao_social ?? null, numero }, resumoDet: ed?.payload ? buildResumo(ed.payload) : null };
}

async function salvarProfundo(admin: Admin, tenantId: string, licitacao_id: string, conteudo: ResumoProfundo) {
  await admin.from("analise").upsert({ tenant_id: tenantId, licitacao_id, tipo: "resumo_profundo", conteudo, modelo: conteudo.modelo }, { onConflict: "licitacao_id,tipo" });
}
async function salvarDeterministico(admin: Admin, tenantId: string, licitacao_id: string, ctx: ProfCtx, aviso: string, modelo = "determinístico") {
  await salvarProfundo(admin, tenantId, licitacao_id, { secoes: profundoDeterministico(ctx.resumoDet), exigencias_especificas: [], fonte: "deterministico", modelo, arquivo: null, aviso });
}
async function passouRateLimit(admin: Admin, tenantId: string): Promise<boolean> {
  const since = new Date(Date.now() - 3600_000).toISOString();
  const { count } = await admin.from("analise").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).eq("tipo", "resumo_profundo").gte("criado_em", since);
  return (count ?? 0) < RATE_LIMITE_HORA;
}
// Núcleo compartilhado: texto do edital → 18 seções (fonte=ia) → salva. Mesmo pipeline p/ PNCP e upload.
async function extrairESalvar(admin: Admin, tenantId: string, licitacao_id: string, ctx: ProfCtx, texto: string, arquivo: string, truncado: boolean) {
  const { system, prompt } = buildPromptProfundo(texto, ctx.ancora);
  let conteudo: ResumoProfundo;
  try {
    const txt = await chamarIA({ system, prompt, maxTokens: 2600 });
    const parsed = parseProfundo(txt);
    if (!parsed) throw new Error("parse falhou");
    const det = profundoDeterministico(ctx.resumoDet);
    const secoes: Record<string, string> = {};
    for (const k of Object.keys(parsed.secoes)) secoes[k] = parsed.secoes[k] !== "Não informado" ? parsed.secoes[k] : det[k];
    conteudo = { secoes, exigencias_especificas: parsed.exigencias_especificas, fonte: "ia", modelo: modeloLabel(), arquivo, aviso: truncado ? "Documento longo — análise sobre o trecho inicial do edital." : undefined };
  } catch (e) {
    conteudo = { secoes: profundoDeterministico(ctx.resumoDet), exigencias_especificas: [], fonte: "deterministico", modelo: modeloLabel(), arquivo, aviso: `Falha ao interpretar com IA (${String(e instanceof Error ? e.message : e).slice(0, 80)}) — mostrando o determinístico.` };
  }
  await salvarProfundo(admin, tenantId, licitacao_id, conteudo);
}
// Cache por numero — REUSA só extração REAL (fonte ≠ deterministico). true se reaproveitou.
async function tentarCache(admin: Admin, tenantId: string, licitacao_id: string, numero: string): Promise<boolean> {
  const { data: mesmas } = await admin.from("licitacao").select("id").eq("numero_controle_pncp", numero);
  const ids = (mesmas ?? []).map((l) => l.id).filter((id) => id !== licitacao_id);
  if (!ids.length) return false;
  const { data: hit } = await admin.from("analise").select("conteudo").eq("tipo", "resumo_profundo").neq("conteudo->>fonte", "deterministico").in("licitacao_id", ids).limit(1).maybeSingle();
  if (!hit?.conteudo) return false;
  const c = hit.conteudo as ResumoProfundo;
  await salvarProfundo(admin, tenantId, licitacao_id, { ...c, fonte: "cache" });
  return true;
}

// Resumo Profundo (Tela 2 — 18 seções). Camada 3 on-demand: (a) PNCP /arquivos. Cache por numero (reusa entre tenants).
export async function gerarResumoProfundo(formData: FormData) {
  const licitacao_id = String(formData.get("licitacao_id") ?? "");
  if (!licitacao_id) return;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const admin = createAdminClient();
  const ctx = await carregarProfCtx(supabase, licitacao_id);
  if (!ctx) return;

  if (await tentarCache(admin, user.id, licitacao_id, ctx.numero)) { revalidatePath(`/licitacao/${licitacao_id}`); return; }
  if (!temIA()) { await salvarDeterministico(admin, user.id, licitacao_id, ctx, "IA indisponível no servidor — mostrando só o determinístico do PNCP."); revalidatePath(`/licitacao/${licitacao_id}`); return; }
  if (!(await passouRateLimit(admin, user.id))) { await salvarDeterministico(admin, user.id, licitacao_id, ctx, "Limite de gerações por hora atingido — tente mais tarde.", "rate-limit"); revalidatePath(`/licitacao/${licitacao_id}`); return; }

  // (a) PNCP /arquivos. Se vazio (ex.: edital só no portal de origem / BLL), NÃO força 18 vazios:
  // mostra o determinístico + abre as opções "baixar no portal de origem" e "enviar PDF".
  const doc = await baixarTextoEdital(ctx.numero);
  if (!doc) { await salvarDeterministico(admin, user.id, licitacao_id, ctx, "Documento do edital não está no PNCP — baixe no portal de origem e envie o PDF para a extração completa das 18 seções."); revalidatePath(`/licitacao/${licitacao_id}`); return; }
  await extrairESalvar(admin, user.id, licitacao_id, ctx, doc.texto, doc.arquivo, doc.truncado);
  revalidatePath(`/licitacao/${licitacao_id}`);
}

// (c) UPLOAD manual do PDF → mesmo pipeline/cache. Desbloqueia editais cujo doc não está no PNCP (ex.: Santos/BLL).
export async function gerarResumoProfundoUpload(formData: FormData) {
  const licitacao_id = String(formData.get("licitacao_id") ?? "");
  const file = formData.get("pdf");
  if (!licitacao_id || !(file instanceof File) || file.size === 0) return;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const admin = createAdminClient();
  const ctx = await carregarProfCtx(supabase, licitacao_id);
  if (!ctx) return;

  if (!temIA()) { await salvarDeterministico(admin, user.id, licitacao_id, ctx, "IA indisponível no servidor — não foi possível extrair do PDF enviado."); revalidatePath(`/licitacao/${licitacao_id}`); return; }
  if (!(await passouRateLimit(admin, user.id))) { await salvarDeterministico(admin, user.id, licitacao_id, ctx, "Limite de gerações por hora atingido — tente mais tarde.", "rate-limit"); revalidatePath(`/licitacao/${licitacao_id}`); return; }
  if (file.size > 25 * 1024 * 1024) { await salvarDeterministico(admin, user.id, licitacao_id, ctx, "PDF acima de 25 MB — envie um arquivo menor."); revalidatePath(`/licitacao/${licitacao_id}`); return; }

  const out = await extrairTextoDeBytes(await file.arrayBuffer());
  if (!out) { await salvarDeterministico(admin, user.id, licitacao_id, ctx, "Não consegui ler o texto do PDF enviado (pode ser escaneado/imagem — OCR é passo futuro)."); revalidatePath(`/licitacao/${licitacao_id}`); return; }
  await extrairESalvar(admin, user.id, licitacao_id, ctx, out.texto, file.name || "PDF enviado", out.truncado);
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
