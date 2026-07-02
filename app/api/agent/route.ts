// app/api/agent/route.ts
//
// Porta do agente (Fase A). POST { pergunta, contextoTela?, stream? }.
//   stream=false (padrão): JSON com a resposta completa.
//   stream=true: SSE — eventos {tipo:"inicio"|"tool_call"|"tool_resultado"|"texto"|"fim"|"erro"}.
// Fluxo: UI → este handler → runtime → provider → modelo. Nenhuma chave de
// IA chega perto do browser.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { executarAgente, type EventoAgente } from "@/lib/agent/runtime";

export const maxDuration = 120; // Vercel: runs multi-passo demoram

interface Body {
  pergunta?: string;
  contextoTela?: string;
  stream?: boolean;
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, erro: "Não autenticado." }, { status: 401 });
  }

  const { data: membro } = await supabase
    .from("organizacao_membros")
    .select("org_id")
    .eq("usuario_id", user.id)
    .limit(1)
    .maybeSingle();
  if (!membro) {
    return NextResponse.json(
      { ok: false, erro: "Usuário sem organização vinculada." },
      { status: 403 },
    );
  }

  let body: Body = {};
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, erro: "Body não é JSON válido." }, { status: 400 });
  }
  const pergunta = (body.pergunta ?? "").trim();
  if (pergunta.length < 2 || pergunta.length > 2000) {
    return NextResponse.json(
      { ok: false, erro: "pergunta deve ter entre 2 e 2000 caracteres." },
      { status: 400 },
    );
  }

  const ctx = { supabase, orgId: membro.org_id, usuarioId: user.id };

  // ---- modo SSE ----
  if (body.stream) {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const enviar = (ev: EventoAgente) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(ev)}\n\n`));
        };
        try {
          await executarAgente({
            pergunta,
            contextoTela: body.contextoTela,
            superficie: "chat",
            ctx,
            onEvento: enviar,
          });
        } catch (e) {
          enviar({ tipo: "erro", mensagem: e instanceof Error ? e.message : String(e) });
        } finally {
          controller.close();
        }
      },
    });
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  }

  // ---- modo JSON ----
  const resultado = await executarAgente({
    pergunta,
    contextoTela: body.contextoTela,
    superficie: "chat",
    ctx,
  });
  return NextResponse.json(resultado, { status: resultado.ok ? 200 : 500 });
}
