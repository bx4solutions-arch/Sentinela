// lib/agent/tools/registry.ts
//
// Registry FECHADO de tools (TDR Parte 12: sem tool dinâmica = sem tool
// injection). O Tool Router é dado, não código: adicionar tool = adicionar
// import + entrada aqui. Este mesmo registry alimentará o MCP server externo
// na Fase 2 (empacotamento, não reescrita).

import type { ToolDef } from "./contrato";
import { buscarLicitacoes } from "./buscar-licitacoes";
import { raioXOrgao } from "./raio-x-orgao";

const TOOLS: ReadonlyArray<ToolDef> = [buscarLicitacoes, raioXOrgao] as const;

const porNome = new Map<string, ToolDef>(TOOLS.map((t) => [t.nome, t]));

export function obterTool(nome: string): ToolDef | undefined {
  return porNome.get(nome);
}

export function listarTools(filtro?: { tipo?: "read" | "write" }): ToolDef[] {
  return TOOLS.filter((t) => (filtro?.tipo ? t.tipo === filtro.tipo : true));
}
