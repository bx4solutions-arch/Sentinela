// Autoteste E2E — IA inclusa (chave NOSSA, server-side) + Resumo Profundo (18 seções do PDF real).
// Custo: 1 extração real (tenant A); o 2º tenant prova o CACHE (reuso entre tenants, 0 IA). Modelo barato (env).
// Prova: 18 seções do PDF real, "Não informado" honesto (não forja), CAPAG+disclaimer, cache, chave fora do client.
import { chromium } from "playwright";
import { mkdirSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const BASE = "http://localhost:3001";
const SHOTS = "e2e/shots";
mkdirSync(SHOTS, { recursive: true });
function readEnv() {
  const env = {};
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const t = line.trim();
    if (t && !t.startsWith("#") && t.includes("=")) { const i = t.indexOf("="); env[t.slice(0, i).trim()] = t.slice(i + 1).trim().replace(/^['"]|['"]$/g, ""); }
  }
  return env;
}
const E = readEnv();
const SB = E.SUPABASE_URL.replace(/\/$/, "");
const H = { apikey: E.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${E.SUPABASE_SERVICE_ROLE_KEY}` };
async function adminQuery(sql) {
  const ref = E.SUPABASE_PROJECT_REF || "ciupgqwsdmmmqpvbtyxx";
  const r = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: "POST", headers: { Authorization: `Bearer ${E.SUPABASE_ACCESS_TOKEN}`, "Content-Type": "application/json", "User-Agent": "x" },
    body: JSON.stringify({ query: sql }),
  });
  return r.json();
}
async function onboard(page, email) {
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.fill("input[name=email]", email);
  await page.fill("input[name=password]", "teste123");
  await page.click("button[value=signup]");
  await page.waitForURL("**/onboarding", { timeout: 20000 });
  await page.fill("#cnpj", "60701190000104");
  await page.click("button:has-text('Consultar')");
  await page.waitForSelector("text=É essa a sua empresa?", { timeout: 25000 });
  await page.click("button:has-text('Sim, continuar')");
  await page.waitForSelector("text=Seus nichos", { timeout: 10000 });
  await page.getByText("Material hospitalar", { exact: true }).click();
  await page.click("button:has-text('Continuar')");
  await page.waitForSelector("text=Certidões de habilitação", { timeout: 10000 });
  await page.click("button:has-text('Concluir')");
  await page.waitForURL("**/empresa", { timeout: 20000 });
}
async function cleanup(email) {
  const list = await (await fetch(`${SB}/auth/v1/admin/users`, { headers: H })).json();
  for (const u of list.users || []) if (u.email === email && u.email.endsWith("@sentinela.test")) await fetch(`${SB}/auth/v1/admin/users/${u.id}`, { method: "DELETE", headers: H });
}
// id do tenant por email, com POLL (absorve lag de réplica do mgmt-API logo após o onboarding)
async function tenantIdPoll(email, tries = 12) {
  for (let i = 0; i < tries; i++) {
    const r = await adminQuery(`select id from auth.users where email='${email}' limit 1;`);
    if (Array.isArray(r) && r[0]?.id) return r[0].id;
    await new Promise((s) => setTimeout(s, 800));
  }
  return null;
}
function grepDir(dir, needle) {
  let hit = false;
  const walk = (d) => { for (const f of readdirSync(d)) { const p = join(d, f); const s = statSync(p); if (s.isDirectory()) walk(p); else if (/\.(js|mjs|json|html|css)$/.test(f)) { try { if (readFileSync(p, "utf8").includes(needle)) hit = true; } catch { /*bin*/ } } } };
  try { walk(dir); } catch { /* sem build */ }
  return hit;
}

const emailA = `qa_rpa_${Date.now()}@sentinela.test`;
const emailB = `qa_rpb_${Date.now()}@sentinela.test`;
const consoleErrors = [];
const results = [];
const ok = (n, c, x = "") => results.push({ name: n, pass: !!c, extra: x });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()); });
page.on("pageerror", (e) => consoleErrors.push("pageerror: " + e.message));
let numero = null;
try {
  // ===== SEGURANÇA: a chave NÃO está no bundle client (.next/static) =====
  const keyTail = (E.SENTINELA_AI_KEY || "").slice(-12);
  const vazouKey = keyTail ? grepDir(".next/static", keyTail) : false;
  const vazouNome = grepDir(".next/static", "SENTINELA_AI_KEY");
  ok("Segurança: a chave da IA NÃO aparece no bundle client (.next/static)", !vazouKey && !vazouNome, `keyTail=${vazouKey} nome=${vazouNome}`);

  // ===== Tenant A: gera o Resumo Profundo (1 extração real) =====
  await onboard(page, emailA);
  await page.goto(`${BASE}/radar`, { waitUntil: "networkidle" });
  await page.waitForSelector("text=Sinais do seu recorte", { timeout: 10000 });
  await page.locator("[data-testid=card-analisar]").first().click();
  await page.waitForURL(/\/licitacao\/[0-9a-f-]+/, { timeout: 15000 });
  const cab = await page.locator("[data-testid=space-cabecalho]").innerText();
  numero = (cab.match(/\d{14}-\d-\d{6}\/\d{4}/) || [])[0];
  ok("capturou nº PNCP da licitação real", !!numero, `numero=${numero}`);
  // HERMÉTICO + trava de custo: limpa o cache deste edital → tenant A faz 1 extração REAL (miss garantido).
  await adminQuery(`delete from analise where tipo='resumo_profundo' and licitacao_id in (select id from licitacao where numero_controle_pncp='${numero}');`);

  await page.waitForSelector("[data-testid=raiox-relatorio]", { timeout: 15000 });
  await page.waitForSelector("[data-testid=profundo-tab]", { timeout: 10000 });
  ok("IA inclusa: botão 'Gerar resumo profundo' presente (sem BYOK)", (await page.locator("[data-testid=gerar-profundo]").count()) > 0);
  await page.locator("[data-testid=gerar-profundo]").click();
  // a extração baixa o PDF + chama a IA — pode levar dezenas de segundos
  await page.waitForSelector("[data-testid=profundo-conteudo]", { timeout: 90000 });

  const nSecoes = await page.locator("[data-testid=profundo-secao]").count();
  ok("Resumo Profundo: 18 seções renderizadas", nSecoes === 18, `secoes=${nSecoes}`);
  const tabTxt = await page.locator("[data-testid=profundo-tab]").innerText();
  const tabHtml = await page.locator("[data-testid=profundo-tab]").innerHTML(); // inclui o conteúdo dos accordions fechados
  const fonteA = await page.locator("[data-testid=profundo-fonte]").innerText();
  ok("extraído por IA (1ª vez, fonte=ia)", /IA/i.test(fonteA), fonteA);
  ok("honestidade: usa 'Não informado' onde o texto não diz (não forja)", /Não informado/i.test(tabHtml));
  const orgaoTxt = await page.locator("[data-testid=raiox-orgao]").innerText().catch(() => "");
  ok("CAPAG na seção 'O órgão' com disclaimer (saúde fiscal ≠ pontualidade)", (await page.locator("[data-testid=raiox-orgao]").count()) > 0 && /não é garantia de pontualidade/i.test(orgaoTxt), orgaoTxt.replace(/\n/g, " ").slice(0, 60));
  ok("Análise crítica com disclaimer (análise, não parecer)", /não um parecer jur[íi]dico/i.test(tabHtml));
  const mainHtml = await page.locator("main").innerHTML();
  await page.screenshot({ path: `${SHOTS}/resumo-profundo.png`, fullPage: true });

  // persistência por NÚMERO (robusto a leftovers): exatamente 1 resumo_profundo, fonte=ia, modelo barato
  const dbA = await adminQuery(`select a.conteudo->>'fonte' fonte, a.modelo from analise a join licitacao l on l.id=a.licitacao_id where l.numero_controle_pncp='${numero}' and a.tipo='resumo_profundo';`);
  ok("persistência: resumo_profundo gravado (fonte=ia, modelo barato)", dbA?.[0]?.fonte === "ia" && /openai|anthropic|google/.test(dbA?.[0]?.modelo ?? ""), `db=${JSON.stringify(dbA?.[0])}`);

  // ===== Acesso 2 (re-navega): serve do CACHE, NÃO rechama IA (não duplica linha) =====
  const urlA = page.url();
  await page.goto(`${BASE}/radar`, { waitUntil: "networkidle" });
  await page.goto(urlA, { waitUntil: "networkidle" });
  await page.waitForSelector("[data-testid=raiox-relatorio]", { timeout: 15000 });
  await page.waitForSelector("[data-testid=profundo-conteudo]", { timeout: 15000 });
  const linhasA = await adminQuery(`select count(*) n from analise a join licitacao l on l.id=a.licitacao_id where l.numero_controle_pncp='${numero}' and a.tipo='resumo_profundo';`);
  ok("cache: 2º acesso não rechama/duplica IA (1 linha p/ o edital)", Number(linhasA?.[0]?.n ?? 0) === 1, `linhas=${linhasA?.[0]?.n}`);

  // ===== Tenant B (mesmo edital): CACHE entre tenants (0 IA) =====
  const page2 = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await onboard(page2, emailB);
  const tidB = await tenantIdPoll(emailB);
  const licB = (await adminQuery(`insert into licitacao (id, tenant_id, numero_controle_pncp, titulo) values (gen_random_uuid(), '${tidB}', '${numero}', 'QA cache') returning id;`))?.[0]?.id;
  ok("tenant B: licitação do mesmo edital criada", !!licB, `licB=${licB} tidB=${tidB}`);
  await page2.goto(`${BASE}/licitacao/${licB}`, { waitUntil: "networkidle" });
  await page2.waitForSelector("[data-testid=raiox-relatorio]", { timeout: 15000 });
  await page2.waitForSelector("[data-testid=gerar-profundo]", { timeout: 10000 });
  await page2.locator("[data-testid=gerar-profundo]").click();
  await page2.waitForSelector("[data-testid=profundo-conteudo]", { timeout: 20000 });
  const fonteB = await page2.locator("[data-testid=profundo-fonte]").innerText();
  ok("CACHE entre tenants: 2º tenant reusa (fonte=cache, 0 IA)", /cache/i.test(fonteB), fonteB);
  const dbB = await adminQuery(`select conteudo->>'fonte' fonte from analise where licitacao_id='${licB}' and tipo='resumo_profundo';`);
  ok("persistência: tenant B fonte=cache (reuso entre tenants)", dbB?.[0]?.fonte === "cache", JSON.stringify(dbB?.[0]));
  await page2.close();

  ok("console sem erros", consoleErrors.length === 0, consoleErrors.slice(0, 4).join(" | "));
} catch (e) {
  ok("FLUXO RESUMO PROFUNDO", false, String(e));
  await page.screenshot({ path: `${SHOTS}/resumo-profundo-ERRO.png`, fullPage: true }).catch(() => {});
} finally {
  await browser.close();
  await cleanup(emailA);
  await cleanup(emailB);
}

console.log("\n===== AUTOTESTE RESUMO PROFUNDO (IA inclusa + 18 seções + cache) =====");
let fail = 0;
for (const r of results) { console.log(`${r.pass ? "✅" : "❌"} ${r.name}${r.extra ? "  — " + r.extra : ""}`); if (!r.pass) fail++; }
console.log(fail ? `\n${fail} FALHA(S)` : "\nTODOS PASSARAM");
process.exit(fail ? 1 : 0);
