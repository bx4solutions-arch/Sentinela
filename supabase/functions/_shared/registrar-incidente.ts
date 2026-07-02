// supabase/functions/_shared/registrar-incidente.ts
//
// Registro ÚNICO de incidentes pra QUALQUER integração externa da Sentinela —
// PNCP hoje, SICONFI/Transparência/Transferegov/IA amanhã. Objetivo: quando o
// Bione abrir a IDE do Claude, ele (e o Claude) já sabem exatamente o que
// aconteceu, onde, e o que fazer — sem precisar reconstruir o contexto do zero
// vasculhando logs efêmeros do Supabase (que só guardam 24h).
//
// Regra de ouro: NUNCA autocorrigir em produção. Esta função só REGISTRA e
// SUGERE — a correção é sempre manual (copiloto, nunca piloto).

export type Severidade = "info" | "atencao" | "critico";

export interface RegistrarIncidenteInput {
  integracao: string; // 'pncp' | 'siconfi' | 'transparencia' | 'transferegov' | 'ia' | ...
  runId?: string | null;
  severidade: Severidade;
  titulo: string;
  detalhe: string;
  /** Frase direta do que fazer — não "deu erro", e sim "faça X". */
  acaoSugerida: string;
  /** Tudo que uma sessão nova do Claude precisa pra corrigir sem reinvestigar. */
  contextoTecnico: Record<string, unknown>;
}

// deno-lint-ignore no-explicit-any
export async function registrarIncidente(supabase: any, input: RegistrarIncidenteInput) {
  const { error } = await supabase.from("alertas_integracao").insert({
    run_id: input.runId ?? null,
    fonte: input.integracao,
    integracao: input.integracao,
    severidade: input.severidade,
    titulo: input.titulo,
    detalhe: input.detalhe,
    acao_sugerida: input.acaoSugerida,
    contexto_tecnico: input.contextoTecnico,
  });
  if (error) {
    // Se nem o registro do incidente for gravado, isso precisa aparecer no
    // log nativo do Supabase (get_logs) como último recurso — por isso o
    // console.error, mesmo com o registro estruturado sendo o caminho principal.
    console.error("FALHA AO REGISTRAR INCIDENTE:", error, input);
  }
  return { error };
}

/** Corta payloads grandes antes de gravar em contexto_tecnico (evita linha gigante no banco). */
export function amostra(obj: unknown, maxChars = 2000): string {
  const s = JSON.stringify(obj);
  return s.length > maxChars ? s.slice(0, maxChars) + "…(cortado)" : s;
}
