"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { temIA, chamarIA, modeloLabel } from "@/lib/ai-server";
import { baixarTextoEdital } from "@/lib/pncp-arquivos";
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

// Resumo Profundo (Tela 2 — 18 seções). Camada 3 on-demand + cache por numero_controle_pncp
// (gera 1x, reusa ENTRE tenants). Determinístico primeiro; IA só aqui, modelo barato (env).
export async function gerarResumoProfundo(formData: FormData) {
  const licitacao_id = String(formData.get("licitacao_id") ?? "");
  if (!licitacao_id) return;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const admin = createAdminClient();

  const { data: lic } = await supabase
    .from("licitacao")
    .select("numero_controle_pncp, titulo, raw_editais:numero_controle_pncp(objeto, payload, orgao:cnpj_orgao(razao_social))")
    .eq("id", licitacao_id).maybeSingle();
  if (!lic) return;
  const numero = lic.numero_controle_pncp as string;
  const ed = (lic.raw_editais ?? null) as unknown as { objeto: string | null; payload: unknown; orgao: { razao_social: string | null } | null } | null;
  const resumoDet: ResumoEdital | null = ed?.payload ? buildResumo(ed.payload) : null;

  const salvar = async (conteudo: ResumoProfundo) =>
    admin.from("analise").upsert({ tenant_id: user.id, licitacao_id, tipo: "resumo_profundo", conteudo, modelo: conteudo.modelo }, { onConflict: "licitacao_id,tipo" });

  // 1) CACHE por numero (reusa entre tenants): se qualquer tenant já extraiu este edital, copia (0 IA, 0 download).
  const { data: mesmas } = await admin.from("licitacao").select("id").eq("numero_controle_pncp", numero);
  const ids = (mesmas ?? []).map((l) => l.id).filter((id) => id !== licitacao_id);
  if (ids.length) {
    const { data: hit } = await admin.from("analise").select("conteudo").eq("tipo", "resumo_profundo").in("licitacao_id", ids).limit(1).maybeSingle();
    if (hit?.conteudo) {
      const c = hit.conteudo as ResumoProfundo;
      await salvar({ ...c, fonte: "cache" });
      revalidatePath(`/licitacao/${licitacao_id}`);
      return;
    }
  }

  // 2) Rate-limit por tenant (trava de custo)
  const since = new Date(Date.now() - 3600_000).toISOString();
  const { count } = await admin.from("analise").select("id", { count: "exact", head: true }).eq("tenant_id", user.id).eq("tipo", "resumo_profundo").gte("criado_em", since);
  if ((count ?? 0) >= RATE_LIMITE_HORA) {
    await salvar({ secoes: profundoDeterministico(resumoDet), exigencias_especificas: [], fonte: "deterministico", modelo: "rate-limit", arquivo: null, aviso: "Limite de gerações por hora atingido — tente mais tarde." });
    revalidatePath(`/licitacao/${licitacao_id}`); return;
  }

  // 3) Sem IA (env sem chave) → degrada honesto pro determinístico, COM aviso (não quebra)
  if (!temIA()) {
    await salvar({ secoes: profundoDeterministico(resumoDet), exigencias_especificas: [], fonte: "deterministico", modelo: "determinístico", arquivo: null, aviso: "IA indisponível no servidor — mostrando só o determinístico do PNCP." });
    revalidatePath(`/licitacao/${licitacao_id}`); return;
  }

  // 4) Camada 3: baixa o PDF e extrai o texto (on-demand)
  const doc = await baixarTextoEdital(numero);
  if (!doc) {
    await salvar({ secoes: profundoDeterministico(resumoDet), exigencias_especificas: [], fonte: "deterministico", modelo: modeloLabel(), arquivo: null, aviso: "Documento do edital indisponível/escaneado no PNCP — mostrando só o determinístico (OCR é passo futuro)." });
    revalidatePath(`/licitacao/${licitacao_id}`); return;
  }

  // 5) IA extrai pro schema de 18 seções (honesto)
  const { system, prompt } = buildPromptProfundo(doc.texto, { objeto: ed?.objeto ?? lic.titulo ?? null, orgao: ed?.orgao?.razao_social ?? null, numero });
  let conteudo: ResumoProfundo;
  try {
    const txt = await chamarIA({ system, prompt, maxTokens: 2600 });
    const parsed = parseProfundo(txt);
    if (!parsed) throw new Error("parse falhou");
    // funde com o determinístico (campos que a IA deixou "Não informado" herdam o que já sabemos)
    const det = profundoDeterministico(resumoDet);
    const secoes: Record<string, string> = {};
    for (const k of Object.keys(parsed.secoes)) secoes[k] = parsed.secoes[k] !== "Não informado" ? parsed.secoes[k] : det[k];
    conteudo = { secoes, exigencias_especificas: parsed.exigencias_especificas, fonte: "ia", modelo: modeloLabel(), arquivo: doc.arquivo, aviso: doc.truncado ? "Documento longo — análise sobre o trecho inicial do edital." : undefined };
  } catch (e) {
    conteudo = { secoes: profundoDeterministico(resumoDet), exigencias_especificas: [], fonte: "deterministico", modelo: modeloLabel(), arquivo: doc.arquivo, aviso: `Falha ao interpretar com IA (${String(e instanceof Error ? e.message : e).slice(0, 80)}) — mostrando o determinístico.` };
  }
  await salvar(conteudo);
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
