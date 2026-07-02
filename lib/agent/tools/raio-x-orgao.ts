// lib/agent/tools/raio-x-orgao.ts
// Tool read #2 — o coração do produto: Raio-X financeiro do órgão/ente,
// cruzando SICONFI (fiscal) + PNCP (licitações) + CGU (emendas) + score.
//
// Enquadramento jurídico (PRD-emendas): emenda aparece como CONTEXTO DE
// DEMANDA (valor, prazo, execução). Autor é rodapé factual — esta tool não
// aceita e não expõe filtro por parlamentar/partido.

import { z } from "zod";
import { defineTool } from "./contrato";

const Input = z.object({
  orgao: z
    .string()
    .min(2)
    .max(120)
    .describe("Nome do órgão/município (ex.: 'Teresina') OU código IBGE (ex.: '2211001')"),
});

const Output = z.object({
  orgao: z.object({
    id: z.string(),
    nome: z.string(),
    uf: z.string().nullable(),
    codigoIbge: z.string().nullable(),
    populacao: z.number().nullable(),
  }),
  fiscal: z
    .object({
      ano: z.number().nullable(),
      rcl: z.number().nullable(),
      receitaPerCapita: z.number().nullable(),
      capag: z.string().nullable(),
    })
    .nullable()
    .describe("Situação fiscal (SICONFI/Tesouro). null = ainda sem dado coletado"),
  emendas: z.object({
    quantidade: z.number(),
    valorEmpenhado: z.number(),
    valorPago: z.number(),
    valorEmpenhadoNaoPago: z.number().describe("Gatilho de antecipação: dinheiro carimbado ainda não executado"),
  }),
  licitacoes: z.object({
    total: z.number(),
    ultimos12m: z.number(),
  }),
  score: z
    .object({
      capacidade: z.number().nullable(),
      apetite: z.number().nullable(),
      acesso: z.number().nullable(),
      semaforo: z.string().nullable(),
      resumoExecutivo: z.string().nullable(),
    })
    .nullable()
    .describe("null = score ainda não calculado (sem baseline)"),
  fontes: z.array(z.string()),
});

export const raioXOrgao = defineTool({
  nome: "raio_x_orgao",
  descricao:
    "Raio-X financeiro pré-edital de um órgão/município: capacidade fiscal (SICONFI), " +
    "reforço orçamentário via emendas (valor/execução — SEM busca por parlamentar), " +
    "histórico de licitações (PNCP) e score quando disponível. " +
    "Use para responder 'esse órgão tem dinheiro para comprar?'",
  tipo: "read",
  inputSchema: Input,
  outputSchema: Output,
  handler: async (input, ctx) => {
    const ehIbge = /^\d{7}$/.test(input.orgao.trim());

    // 1. Resolve o ente canônico (linha do SICONFI, com codigo_ibge)
    let q = ctx.supabase.from("orgaos").select("id, nome, uf, codigo_ibge, populacao");
    q = ehIbge ? q.eq("codigo_ibge", input.orgao.trim()) : q.ilike("nome", `%${input.orgao.trim()}%`);
    const { data: candidatos, error: erroOrgao } = await q.limit(5);
    if (erroOrgao) throw new Error(`Consulta a orgaos falhou: ${erroOrgao.message}`);

    // Prefere a linha canônica (tem codigo_ibge); senão a primeira
    const orgao = (candidatos ?? []).find((o) => o.codigo_ibge) ?? (candidatos ?? [])[0];
    if (!orgao) {
      throw new Error(
        `Nenhum órgão encontrado para "${input.orgao}" no recorte atual. ` +
          `O recorte piloto cobre Teresina/PI — órgãos fora dele ainda não têm dados coletados.`,
      );
    }

    const doze = new Date(Date.now() - 365 * 86400000).toISOString();

    const [fiscalR, emendasR, licTotalR, lic12R, scoreR] = await Promise.all([
      ctx.supabase
        .from("orgao_fiscal")
        .select("ano, rcl, receita_per_capita, capag")
        .eq("orgao_id", orgao.id)
        .order("ano", { ascending: false })
        .limit(1)
        .maybeSingle(),
      ctx.supabase
        .from("emendas")
        .select("valor_empenhado, valor_pago")
        .eq("orgao_id", orgao.id),
      // licitações do ente inteiro via codigo_ibge (migration 17) + fallback orgao_id
      orgao.codigo_ibge
        ? ctx.supabase
            .from("licitacoes")
            .select("*", { count: "exact", head: true })
            .eq("codigo_ibge", orgao.codigo_ibge)
        : ctx.supabase
            .from("licitacoes")
            .select("*", { count: "exact", head: true })
            .eq("orgao_id", orgao.id),
      orgao.codigo_ibge
        ? ctx.supabase
            .from("licitacoes")
            .select("*", { count: "exact", head: true })
            .eq("codigo_ibge", orgao.codigo_ibge)
            .gte("data_publicacao", doze)
        : ctx.supabase
            .from("licitacoes")
            .select("*", { count: "exact", head: true })
            .eq("orgao_id", orgao.id)
            .gte("data_publicacao", doze),
      ctx.supabase.from("orgao_score").select("*").eq("orgao_id", orgao.id).maybeSingle(),
    ]);

    const emendas = emendasR.data ?? [];
    const somar = (campo: "valor_empenhado" | "valor_pago") =>
      emendas.reduce((acc, e) => acc + Number(e[campo] ?? 0), 0);
    const valorEmpenhado = somar("valor_empenhado");
    const valorPago = somar("valor_pago");

    const fontes = ["PNCP (licitações)"];
    if (fiscalR.data) fontes.push("SICONFI/Tesouro (RREO)");
    if (emendas.length > 0) fontes.push("Portal da Transparência/CGU (emendas)");

    return {
      orgao: {
        id: orgao.id as string,
        nome: orgao.nome as string,
        uf: orgao.uf ?? null,
        codigoIbge: orgao.codigo_ibge ?? null,
        populacao: orgao.populacao != null ? Number(orgao.populacao) : null,
      },
      fiscal: fiscalR.data
        ? {
            ano: fiscalR.data.ano ?? null,
            rcl: fiscalR.data.rcl != null ? Number(fiscalR.data.rcl) : null,
            receitaPerCapita:
              fiscalR.data.receita_per_capita != null ? Number(fiscalR.data.receita_per_capita) : null,
            capag: fiscalR.data.capag ?? null,
          }
        : null,
      emendas: {
        quantidade: emendas.length,
        valorEmpenhado,
        valorPago,
        valorEmpenhadoNaoPago: Math.max(0, valorEmpenhado - valorPago),
      },
      licitacoes: {
        total: licTotalR.count ?? 0,
        ultimos12m: lic12R.count ?? 0,
      },
      score: scoreR.data
        ? {
            capacidade: scoreR.data.score_capacidade ?? null,
            apetite: scoreR.data.score_apetite ?? null,
            acesso: scoreR.data.score_acesso ?? null,
            semaforo: scoreR.data.semaforo ?? null,
            resumoExecutivo: scoreR.data.resumo_executivo ?? null,
          }
        : null,
      fontes,
    };
  },
});
