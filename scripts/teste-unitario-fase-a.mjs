// scripts/teste-unitario-fase-a.mjs
// Suíte hermética (sem rede) da Fase A: contrato de tools, registry,
// bloqueio de write, custos, factory de providers, guardrails.
// Roda com: node scripts/teste-unitario-fase-a.mjs
// (usa tsx/ts via import dinâmico? Não — importa o TS transpilado em memória
//  via tsx se disponível; senão usa ts direto com --experimental-strip-types?
//  Node 22: --experimental-strip-types funciona pra TS puro sem enums.)

import { spawnSync } from "node:child_process";

// Reexecuta via tsx (resolve imports TS sem extensão)
if (!process.env.TESTE_STRIP) {
  const r = spawnSync("npx", ["tsx", import.meta.filename], {
    stdio: "inherit",
    env: { ...process.env, TESTE_STRIP: "1" },
  });
  process.exit(r.status ?? 1);
}

const { defineTool, executarTool } = await import("../lib/agent/tools/contrato.ts");
const { obterTool, listarTools } = await import("../lib/agent/tools/registry.ts");
const { calcularCustoUSD } = await import("../lib/agent/providers/custos.ts");
const { getProvider } = await import("../lib/agent/providers/factory.ts");
const { z } = await import("zod");

const resultados = [];
function reg(nome, ok, detalhe = "") {
  resultados.push(ok);
  console.log(`${ok ? "PASS" : "FAIL"} | ${nome}${detalhe ? " | " + detalhe : ""}`);
}

// ---------- mock de supabase com shapes reais do banco ----------
const LIC = {
  id: "5f0d0a5e-0000-0000-0000-000000000001",
  numero_controle_pncp: "06554869000164-1-000123/2026",
  orgao_nome: "FUNDAÇÃO MUNICIPAL DE SAÚDE",
  unidade_nome: "FMS",
  objeto: "Aquisição de material médico-hospitalar",
  modalidade: "Pregão - Eletrônico",
  valor_total: 150000.5,
  data_abertura: "2026-06-25T12:00:00Z",
  data_encerramento_proposta: "2026-07-10T12:00:00Z",
  municipio: "Teresina",
  uf: "PI",
  link_sistema_origem: "https://exemplo.gov.br/x",
};
function mockQuery(retorno, count = null) {
  const q = {
    _r: { data: retorno, error: null, count },
    select() { return q; }, eq() { return q; }, ilike() { return q; }, lte() { return q; },
    gte() { return q; }, order() { return q; }, limit() { return q; },
    maybeSingle() { return Promise.resolve({ data: Array.isArray(retorno) ? retorno[0] ?? null : retorno, error: null }); },
    then(res) { return Promise.resolve(q._r).then(res); },
  };
  return q;
}
const ctxMock = {
  orgId: "org-teste",
  supabase: { from: (t) => (t === "licitacoes" ? mockQuery([LIC], 189) : mockQuery([])) },
};

// ---------- T1: registry fechado e íntegro ----------
{
  const nomes = listarTools().map((t) => t.nome).sort();
  reg("registry: tools registradas", nomes.join(",") === "buscar_licitacoes,raio_x_orgao", nomes.join(", "));
  reg("registry: lookup inexistente → undefined", obterTool("hack_tool") === undefined);
  reg("registry: todas read na Fase A", listarTools({ tipo: "write" }).length === 0);
}
// ---------- T2: validação de input ----------
{
  const t = obterTool("buscar_licitacoes");
  const r = await executarTool(t, { limite: 999 }, ctxMock);
  reg("contrato: input inválido → erro estruturado (nunca lança)", r.ok === false && /limite/.test(r.erro), r.erro?.slice(0, 60));
  const r2 = await executarTool(t, { texto: "x" }, ctxMock); // min 2
  reg("contrato: texto de 1 char → rejeitado", r2.ok === false);
}
// ---------- T3: execução feliz + output schema ----------
{
  const t = obterTool("buscar_licitacoes");
  const r = await executarTool(t, { municipio: "Teresina", limite: 5 }, ctxMock);
  reg("buscar_licitacoes: mapeia shape real do banco", r.ok === true && r.output.total === 189 && r.output.licitacoes[0].valorTotal === 150000.5,
    r.ok ? `total=${r.output.total}` : r.erro);
}
// ---------- T4: output que viola o contrato é barrado ----------
{
  const quebrada = defineTool({
    nome: "tool_quebrada", descricao: "x", tipo: "read",
    inputSchema: z.object({}), outputSchema: z.object({ n: z.number() }),
    handler: async () => ({ n: "não sou número" }),
  });
  const r = await executarTool(quebrada, {}, ctxMock);
  reg("contrato: output inválido → erro 'violou o próprio contrato'", r.ok === false && /violou/.test(r.erro));
}
// ---------- T5: nome de tool inválido é rejeitado na definição ----------
{
  let lancou = false;
  try { defineTool({ nome: "Nome Ruim!", descricao: "x", tipo: "read", inputSchema: z.object({}), outputSchema: z.object({}), handler: async () => ({}) }); }
  catch { lancou = true; }
  reg("contrato: nome fora do snake_case → rejeitado", lancou);
}
// ---------- T6: custos ----------
{
  const a = calcularCustoUSD("claude-sonnet-4-5", 1_000_000, 1_000_000);
  const b = calcularCustoUSD("gpt-5", 1_000_000, 0);
  const c = calcularCustoUSD("modelo-desconhecido-xyz", 1_000_000, 0);
  reg("custos: claude-sonnet 1M+1M = $18", a === 18, `$${a}`);
  reg("custos: gpt-5 1M entrada = $1.25", b === 1.25, `$${b}`);
  reg("custos: modelo desconhecido usa fallback ($3)", c === 3, `$${c}`);
}
// ---------- T7: factory de providers ----------
{
  const limpar = () => { delete process.env.AI_PROVIDER; delete process.env.AI_MODEL; delete process.env.ANTHROPIC_API_KEY; delete process.env.OPENAI_API_KEY; delete process.env.GEMINI_API_KEY; };
  limpar();
  process.env.AI_PROVIDER = "banana";
  let e1 = ""; try { getProvider(); } catch (e) { e1 = e.message; }
  reg("factory: provider inválido → erro claro", /AI_PROVIDER inválido/.test(e1), e1.slice(0, 50));
  limpar();
  process.env.AI_PROVIDER = "anthropic";
  let e2 = ""; try { getProvider(); } catch (e) { e2 = e.message; }
  reg("factory: sem ANTHROPIC_API_KEY → erro orientando .env", /ANTHROPIC_API_KEY/.test(e2), e2.slice(0, 60));
  limpar();
  process.env.AI_PROVIDER = "openai"; process.env.OPENAI_API_KEY = "sk-teste"; process.env.AI_MODEL = "gpt-5";
  const p = getProvider();
  reg("factory: openai instancia com nome/modelo corretos", p.nome === "openai" && p.modelo === "gpt-5", `${p.nome}/${p.modelo}`);
  let e3 = ""; try { getProvider({ provider: "gemini", modelo: "gemini-2.5-flash" }); } catch (e) { e3 = e.message; }
  reg("factory: override por parâmetro (multi-tenant futuro) valida a key certa", /GEMINI_API_KEY/.test(e3), e3.slice(0, 60));
}

// ---------- T8: guardrail de emendas presente no system prompt ----------
{
  const fs = await import("node:fs");
  const runtime = fs.readFileSync(new URL("../lib/agent/runtime.ts", import.meta.url), "utf-8");
  reg("guardrail: lista negativa de emendas no system prompt",
    /NUNCA busca, filtra ou lista dados por deputado/.test(runtime) && /copiloto/i.test(runtime));
  reg("guardrail: runtime bloqueia tools write",
    /tipo !== "read"/.test(runtime) && /confirmação humana/.test(runtime));
  reg("cota: verificada ANTES de chamar o provider",
    runtime.indexOf("verificarCota") < runtime.indexOf("getProvider()") || /Cota ANTES/.test(runtime));
}

const falhas = resultados.filter((x) => !x).length;
console.log(`\nRESUMO UNITÁRIO: ${resultados.length - falhas}/${resultados.length} PASS`);
process.exit(falhas ? 1 : 0);
