// lib/agent/runtime.ts
//
// Agent Runtime (Fase A — base funcional, read-only).
// Fluxo (TDR Parte 5): route handler → runtime → provider → modelo,
// com o runtime executando as tools via registry e persistindo:
//   agent_runs (state machine) · eventos (telemetria) · uso_ia (cota).
//
// Fase A: só tools "read". Qualquer tool "write" é bloqueada aqui — a
// confirmação transacional é Fase C (proposta persistida em
// agent_runs.proposta_write; confirmação lê de lá, nunca re-gera).

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getProvider } from "./providers";
import type { AIMessage, AIStreamEvent, ToolCall, ToolResultado, ToolSpec } from "./providers";
import { executarTool, listarTools, obterTool, type ToolCtx } from "./tools";

const MAX_ITERACOES = 6;

// ---------------------------------------------------------------------------
// System prompt: identidade + guardrails do projeto (lista negativa de
// emendas — PRD-emendas — vale no PRODUTO, logo vale aqui).
// ---------------------------------------------------------------------------
const SYSTEM_BASE = `Você é o agente da Sentinela (BX4 Technology), plataforma de inteligência para fornecedores do setor público brasileiro.

REGRAS INVIOLÁVEIS:
1. Você é COPILOTO, nunca piloto: você informa e recomenda; quem decide é o usuário. Nunca afirme ter executado ações que não executou.
2. Cite a fonte dos dados (PNCP, SICONFI, Portal da Transparência) sempre que apresentar números.
3. EMENDAS PARLAMENTARES: você pode citar emenda como contexto de demanda (valor, prazo de execução, categoria). Você NUNCA busca, filtra ou lista dados por deputado, senador, partido ou "padrinho". Se pedirem isso, recuse educadamente e explique que a Sentinela é radar de antecipação de demanda pública, não ferramenta de prospecção política. Nunca sugira contatar gabinete ou agente político.
4. Se um dado não existe no recorte coletado, diga isso claramente — nunca invente número.
5. Responda em português brasileiro, direto e útil para quem vende para o governo.`;

// ---------------------------------------------------------------------------
// Tipos do runtime
// ---------------------------------------------------------------------------
export type EventoAgente =
  | { tipo: "inicio"; runId: string | null }
  | { tipo: "tool_call"; nome: string; input: unknown }
  | { tipo: "tool_resultado"; nome: string; ok: boolean; ms: number }
  | { tipo: "texto"; delta: string }
  | { tipo: "fim"; texto: string; runId: string | null }
  | { tipo: "erro"; mensagem: string };

export interface ParamsAgente {
  pergunta: string;
  /** Contexto da tela (chip "@" — órgão/licitação em foco), opcional. */
  contextoTela?: string;
  superficie?: "chat" | "tela" | "rotina";
  ctx: ToolCtx; // client do USUÁRIO (RLS) — tools rodam com ele
  onEvento?: (ev: EventoAgente) => void;
}

export interface RespostaAgente {
  ok: boolean;
  texto: string;
  runId: string | null;
  passos: Array<{ tool: string; ok: boolean; ms: number }>;
  uso: { tokensEntrada: number; tokensSaida: number; custoUSD: number };
  avisos: string[];
}

// ---------------------------------------------------------------------------
// Persistência administrativa (agent_runs / uso_ia / eventos de sistema).
// Usa service role QUANDO disponível; sem ela o agente ainda funciona,
// apenas sem persistência (aviso explícito — nunca falha silenciosa).
// ---------------------------------------------------------------------------
function criarAdmin(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

function toolsParaProvider(): ToolSpec[] {
  // Fase A: só read no cardápio do modelo.
  return listarTools({ tipo: "read" }).map((t) => ({
    nome: t.nome,
    descricao: t.descricao,
    inputSchema: t.inputSchema,
  }));
}

async function memoriasAtivas(admin: SupabaseClient | null, orgId: string): Promise<string> {
  if (!admin) return "";
  const { data } = await admin
    .from("memorias")
    .select("tipo, conteudo")
    .eq("org_id", orgId)
    .eq("ativo", true)
    .limit(20);
  if (!data || data.length === 0) return "";
  const linhas = data.map((m) => `- [${m.tipo}] ${m.conteudo}`).join("\n");
  return `\n\nMEMÓRIA DO CLIENTE (fatos que ele registrou/confirmou — respeite-os):\n${linhas}`;
}

async function verificarCota(
  admin: SupabaseClient | null,
  orgId: string,
): Promise<{ ok: boolean; detalhe?: string }> {
  if (!admin) return { ok: true };
  const periodo = new Date();
  const primeiroDia = `${periodo.getFullYear()}-${String(periodo.getMonth() + 1).padStart(2, "0")}-01`;
  const [{ data: org }, { data: uso }] = await Promise.all([
    admin.from("organizacoes").select("cota_mensal_ia").eq("id", orgId).maybeSingle(),
    admin.from("uso_ia").select("interacoes").eq("org_id", orgId).eq("periodo", primeiroDia).maybeSingle(),
  ]);
  const cota = org?.cota_mensal_ia ?? 200;
  const usadas = uso?.interacoes ?? 0;
  if (usadas >= cota) {
    return {
      ok: false,
      detalhe: `Cota mensal de IA atingida (${usadas}/${cota} interações). Fale com a BX4 para ampliar o plano.`,
    };
  }
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Execução principal
// ---------------------------------------------------------------------------
export async function executarAgente(params: ParamsAgente): Promise<RespostaAgente> {
  const { pergunta, contextoTela, ctx } = params;
  const superficie = params.superficie ?? "chat";
  const emitir = params.onEvento ?? (() => {});
  const avisos: string[] = [];

  const admin = criarAdmin();
  if (!admin) {
    avisos.push(
      "SUPABASE_SERVICE_ROLE_KEY ausente: run não persistido em agent_runs/uso_ia (agente segue funcionando).",
    );
  }

  // Cota ANTES de gastar token (decisão 6 do PRD)
  const cota = await verificarCota(admin, ctx.orgId);
  if (!cota.ok) {
    emitir({ tipo: "erro", mensagem: cota.detalhe! });
    return {
      ok: false,
      texto: cota.detalhe!,
      runId: null,
      passos: [],
      uso: { tokensEntrada: 0, tokensSaida: 0, custoUSD: 0 },
      avisos,
    };
  }

  const provider = getProvider();

  // Abre o run (state machine)
  let runId: string | null = null;
  if (admin) {
    const { data } = await admin
      .from("agent_runs")
      .insert({
        org_id: ctx.orgId,
        usuario_id: ctx.usuarioId ?? null,
        superficie,
        status: "executando",
        entrada: { pergunta, contextoTela: contextoTela ?? null },
        provider: provider.nome,
        modelo: provider.modelo,
      })
      .select("id")
      .single();
    runId = data?.id ?? null;
  }
  emitir({ tipo: "inicio", runId });

  const system = SYSTEM_BASE + (await memoriasAtivas(admin, ctx.orgId));
  const mensagens: AIMessage[] = [
    {
      role: "user",
      content: contextoTela ? `[Contexto da tela atual: ${contextoTela}]\n\n${pergunta}` : pergunta,
    },
  ];

  const passos: Array<{ tool: string; ok: boolean; ms: number }> = [];
  const passosDetalhados: Array<Record<string, unknown>> = [];
  let toolResultados: { chamada: ToolCall; resultado: ToolResultado }[] | undefined;
  const usoTotal = { tokensEntrada: 0, tokensSaida: 0, custoUSD: 0 };
  let textoFinal = "";

  try {
    for (let i = 0; i < MAX_ITERACOES; i++) {
      const resposta = await provider.gerar({
        system,
        mensagens,
        tools: toolsParaProvider(),
        toolResultados,
      });

      usoTotal.tokensEntrada += resposta.uso.tokensEntrada;
      usoTotal.tokensSaida += resposta.uso.tokensSaida;
      usoTotal.custoUSD += resposta.uso.custoUSD;

      if (resposta.parada !== "tool_use" || resposta.toolCalls.length === 0) {
        textoFinal = resposta.texto ?? "";
        break;
      }

      // Executa as tools pedidas (Fase A: read-only; write = bloqueado aqui)
      const resultados: { chamada: ToolCall; resultado: ToolResultado }[] = [];
      for (const chamada of resposta.toolCalls) {
        emitir({ tipo: "tool_call", nome: chamada.nome, input: chamada.input });
        const tool = obterTool(chamada.nome);
        let output: unknown;
        let ok = false;
        let ms = 0;
        if (!tool) {
          output = { erro: `Tool desconhecida: ${chamada.nome}` };
        } else if (tool.tipo !== "read") {
          output = {
            erro:
              "Tools de escrita ainda não estão habilitadas (exigem confirmação humana — fase futura).",
          };
        } else {
          const r = await executarTool(tool, chamada.input, ctx);
          ok = r.ok;
          ms = r.ms;
          output = r.ok ? r.output : { erro: r.erro };
        }
        emitir({ tipo: "tool_resultado", nome: chamada.nome, ok, ms });
        passos.push({ tool: chamada.nome, ok, ms });
        passosDetalhados.push({ tool: chamada.nome, input: chamada.input, ok, ms });
        resultados.push({
          chamada,
          resultado: { toolCallId: chamada.id, nome: chamada.nome, output },
        });
      }
      toolResultados = resultados;

      if (i === MAX_ITERACOES - 1) {
        textoFinal =
          "Atingi o limite de passos desta consulta. Refine a pergunta ou peça uma parte de cada vez.";
      }
    }

    emitir({ tipo: "fim", texto: textoFinal, runId });

    if (admin && runId) {
      await admin
        .from("agent_runs")
        .update({
          status: "concluida",
          passos: passosDetalhados,
          resposta: { texto: textoFinal },
          tokens_entrada: usoTotal.tokensEntrada,
          tokens_saida: usoTotal.tokensSaida,
          custo_usd: usoTotal.custoUSD,
          finalizado_em: new Date().toISOString(),
        })
        .eq("id", runId);
      await admin.rpc("incrementar_uso_ia", {
        p_org: ctx.orgId,
        p_tokens_in: usoTotal.tokensEntrada,
        p_tokens_out: usoTotal.tokensSaida,
        p_custo: usoTotal.custoUSD,
      });
      await admin.from("eventos").insert({
        org_id: ctx.orgId,
        usuario_id: ctx.usuarioId ?? null,
        tipo: "agent_run",
        entidade_tipo: "agent_run",
        entidade_id: runId,
        payload: { superficie, passos: passos.length, custo_usd: usoTotal.custoUSD },
      });
    }

    return { ok: true, texto: textoFinal, runId, passos, uso: usoTotal, avisos };
  } catch (e) {
    const mensagem = e instanceof Error ? e.message : String(e);
    emitir({ tipo: "erro", mensagem });
    if (admin && runId) {
      await admin
        .from("agent_runs")
        .update({ status: "falhou", erro: mensagem, finalizado_em: new Date().toISOString() })
        .eq("id", runId);
    }
    return {
      ok: false,
      texto: `O agente falhou: ${mensagem}`,
      runId,
      passos,
      uso: usoTotal,
      avisos,
    };
  }
}

export type { AIStreamEvent };
