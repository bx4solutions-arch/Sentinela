// lib/agent/tools/contrato.ts
//
// Contrato único de tool da Sentinela (TDR Parte 3 / princípio 4).
// REGRAS INVIOLÁVEIS:
//   1. Tool NUNCA importa nada de app/ ou components/ (lib/agent compila sozinho).
//   2. Tool NUNCA conhece provider de IA — recebe input validado, devolve output validado.
//   3. tenant (orgId) é INJETADO pelo runtime via ctx — jamais é parâmetro que o
//      modelo possa preencher (defesa contra tool injection).
//   4. ctx.supabase é o client COM A SESSÃO DO USUÁRIO (RLS ativo) — nunca
//      service role. Defesa em profundidade: mesmo uma tool com bug não
//      enxerga dados de outro tenant.
//   5. type "write" só executa após confirmação humana (Fase C) — o runtime
//      bloqueia; a tool não precisa saber disso.

import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

export type TipoTool = "read" | "write";

export interface ToolCtx {
  /** Client Supabase escopado na sessão do usuário (RLS ativo).
   *  Generics relaxados de propósito: aceita o client tipado das rotas E o
   *  client administrativo do runtime sem acoplar o contrato ao schema. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>;
  /** Organização (tenant) resolvida pelo route handler — nunca vem do modelo. */
  orgId: string;
  usuarioId?: string;
}

// deno-lint / eslint: any de ZodType é intencional — cada tool fixa os seus.
export interface ToolDef<
  In extends z.ZodTypeAny = z.ZodTypeAny,
  Out extends z.ZodTypeAny = z.ZodTypeAny,
> {
  /** snake_case, estável — vira o nome da function no tool-calling e no futuro MCP. */
  nome: string;
  /** Descrição para o LLM decidir quando usar. Inclua o que NÃO faz. */
  descricao: string;
  tipo: TipoTool;
  inputSchema: In;
  outputSchema: Out;
  handler: (input: z.infer<In>, ctx: ToolCtx) => Promise<z.infer<Out>>;
}

export function defineTool<In extends z.ZodTypeAny, Out extends z.ZodTypeAny>(
  def: ToolDef<In, Out>,
): ToolDef<In, Out> {
  if (!/^[a-z][a-z0-9_]*$/.test(def.nome)) {
    throw new Error(`Nome de tool inválido: "${def.nome}" (use snake_case).`);
  }
  return def;
}

export interface ResultadoTool {
  ok: boolean;
  output?: unknown;
  erro?: string;
  ms: number;
}

/** Executa uma tool com validação de entrada E de saída. Nunca lança — devolve erro estruturado. */
export async function executarTool(
  tool: ToolDef,
  inputBruto: unknown,
  ctx: ToolCtx,
): Promise<ResultadoTool> {
  const inicio = Date.now();
  const parsed = tool.inputSchema.safeParse(inputBruto ?? {});
  if (!parsed.success) {
    return {
      ok: false,
      erro: `Input inválido para ${tool.nome}: ${parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`,
      ms: Date.now() - inicio,
    };
  }
  try {
    const bruto = await tool.handler(parsed.data, ctx);
    const saida = tool.outputSchema.safeParse(bruto);
    if (!saida.success) {
      // Saída fora do contrato é bug NOSSO, não do usuário — registra claro.
      return {
        ok: false,
        erro: `Output de ${tool.nome} violou o próprio contrato: ${saida.error.issues[0]?.message ?? "?"}`,
        ms: Date.now() - inicio,
      };
    }
    return { ok: true, output: saida.data, ms: Date.now() - inicio };
  } catch (e) {
    return { ok: false, erro: String(e instanceof Error ? e.message : e), ms: Date.now() - inicio };
  }
}
