// lib/agent/tools/buscar-licitacoes.ts
// Tool read #1 — busca licitações reais (harvester PNCP) do recorte do tenant.

import { z } from "zod";
import { defineTool } from "./contrato";

const Input = z.object({
  texto: z
    .string()
    .min(2)
    .max(200)
    .optional()
    .describe("Termo de busca no objeto da licitação (ex.: 'material de limpeza', 'TI')"),
  uf: z.string().length(2).optional().describe("Sigla da UF (ex.: 'PI')"),
  municipio: z.string().max(100).optional().describe("Nome do município (ex.: 'Teresina')"),
  modalidade: z
    .string()
    .max(60)
    .optional()
    .describe("Modalidade (ex.: 'Pregão - Eletrônico', 'Dispensa')"),
  valorMax: z.number().positive().optional().describe("Valor total estimado máximo em R$"),
  somenteAbertas: z
    .boolean()
    .default(false)
    .describe("true = apenas com prazo de proposta ainda aberto"),
  limite: z.number().int().min(1).max(20).default(10),
});

const Licitacao = z.object({
  id: z.string(),
  numeroControlePncp: z.string().nullable(),
  orgaoNome: z.string().nullable(),
  unidadeNome: z.string().nullable(),
  objeto: z.string().nullable(),
  modalidade: z.string().nullable(),
  valorTotal: z.number().nullable(),
  dataAbertura: z.string().nullable(),
  dataEncerramentoProposta: z.string().nullable(),
  municipio: z.string().nullable(),
  uf: z.string().nullable(),
  linkSistemaOrigem: z.string().nullable(),
});

const Output = z.object({
  total: z.number().describe("Total de licitações que casam com o filtro (além das retornadas)"),
  licitacoes: z.array(Licitacao),
  fonte: z.literal("PNCP (harvester Sentinela)"),
});

export const buscarLicitacoes = defineTool({
  nome: "buscar_licitacoes",
  descricao:
    "Busca licitações públicas reais coletadas do PNCP no recorte configurado do cliente. " +
    "Filtra por texto do objeto, UF, município, modalidade, valor máximo e prazo aberto. " +
    "NÃO busca por parlamentar, partido ou emenda — não aceita esses filtros.",
  tipo: "read",
  inputSchema: Input,
  outputSchema: Output,
  handler: async (input, ctx) => {
    let q = ctx.supabase
      .from("licitacoes")
      .select(
        "id, numero_controle_pncp, orgao_nome, unidade_nome, objeto, modalidade, valor_total, data_abertura, data_encerramento_proposta, municipio, uf, link_sistema_origem",
        { count: "exact" },
      );

    if (input.texto) q = q.ilike("objeto", `%${input.texto}%`);
    if (input.uf) q = q.eq("uf", input.uf.toUpperCase());
    if (input.municipio) q = q.ilike("municipio", `%${input.municipio}%`);
    if (input.modalidade) q = q.ilike("modalidade", `%${input.modalidade}%`);
    if (input.valorMax) q = q.lte("valor_total", input.valorMax);
    if (input.somenteAbertas) {
      q = q.gte("data_encerramento_proposta", new Date().toISOString());
    }

    const { data, error, count } = await q
      .order("data_abertura", { ascending: false })
      .limit(input.limite);

    if (error) throw new Error(`Consulta a licitacoes falhou: ${error.message}`);

    return {
      total: count ?? data?.length ?? 0,
      licitacoes: (data ?? []).map((l) => ({
        id: l.id as string,
        numeroControlePncp: l.numero_controle_pncp ?? null,
        orgaoNome: l.orgao_nome ?? null,
        unidadeNome: l.unidade_nome ?? null,
        objeto: l.objeto ?? null,
        modalidade: l.modalidade ?? null,
        valorTotal: l.valor_total != null ? Number(l.valor_total) : null,
        dataAbertura: l.data_abertura ?? null,
        dataEncerramentoProposta: l.data_encerramento_proposta ?? null,
        municipio: l.municipio ?? null,
        uf: l.uf ?? null,
        linkSistemaOrigem: l.link_sistema_origem ?? null,
      })),
      fonte: "PNCP (harvester Sentinela)" as const,
    };
  },
});
