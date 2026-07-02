// app/api/tools/[nome]/route.ts
//
// Única porta do browser para dados (TDR: "telas consomem as mesmas tools do
// agente"). POST autenticado; valida input pelo schema Zod da tool; executa
// com o client DA SESSÃO (RLS ativo); grava evento de telemetria.
//
// Fase A: só tools "read" (write = 403 até a confirmação da Fase C existir).

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { executarTool, obterTool } from "@/lib/agent/tools";

export async function POST(req: Request, { params }: { params: Promise<{ nome: string }> }) {
  const { nome } = await params;

  const tool = obterTool(nome);
  if (!tool) {
    return NextResponse.json({ ok: false, erro: `Tool desconhecida: ${nome}` }, { status: 404 });
  }
  if (tool.tipo !== "read") {
    return NextResponse.json(
      { ok: false, erro: "Tools de escrita exigem confirmação humana (não habilitadas nesta fase)." },
      { status: 403 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, erro: "Não autenticado." }, { status: 401 });
  }

  // Resolve o tenant pela MEMBERSHIP (nunca pelo body — defesa contra spoofing)
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
  const orgId = membro.org_id;

  let input: unknown = {};
  try {
    const corpo = await req.text();
    input = corpo ? JSON.parse(corpo) : {};
  } catch {
    return NextResponse.json({ ok: false, erro: "Body não é JSON válido." }, { status: 400 });
  }

  const resultado = await executarTool(tool, input, {
    supabase,
    orgId,
    usuarioId: user.id,
  });

  // Telemetria (eventos) — best effort, nunca derruba a resposta
  void supabase.from("eventos").insert({
    org_id: orgId,
    usuario_id: user.id,
    tipo: "tool_executada",
    entidade_tipo: "tool",
    entidade_id: nome,
    payload: { ok: resultado.ok, ms: resultado.ms },
  });

  if (!resultado.ok) {
    return NextResponse.json({ ok: false, erro: resultado.erro }, { status: 422 });
  }
  return NextResponse.json({ ok: true, output: resultado.output, ms: resultado.ms });
}
