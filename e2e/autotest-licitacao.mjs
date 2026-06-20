// Autoteste E2E do Q5 (Pasta Inteligente — esqueleto, sem IA). Add à análise → workspace → doc → excluir.
import { chromium } from "playwright";
import { mkdirSync, readFileSync } from "node:fs";
const BASE = "http://localhost:3001"; const SHOTS = "e2e/shots"; mkdirSync(SHOTS, { recursive: true });
function readEnv() { const env = {}; for (const line of readFileSync(".env.local", "utf8").split("\n")) { const t = line.trim(); if (t && !t.startsWith("#") && t.includes("=")) { const [k, ...v] = t.split("="); env[k.trim()] = v.join("=").trim().replace(/^['"]|['"]$/g, ""); } } return env; }
const E = readEnv(); const SB = E.SUPABASE_URL.replace(/\/$/, ""); const H = { apikey: E.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${E.SUPABASE_SERVICE_ROLE_KEY}` };
async function adminQuery(sql) { const ref = E.SUPABASE_PROJECT_REF || "ciupgqwsdmmmqpvbtyxx"; const r = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, { method: "POST", headers: { Authorization: `Bearer ${E.SUPABASE_ACCESS_TOKEN}`, "Content-Type": "application/json", "User-Agent": "x" }, body: JSON.stringify({ query: sql }) }); return r.json(); }
async function cleanup(email) { const list = await (await fetch(`${SB}/auth/v1/admin/users`, { headers: H })).json(); for (const u of list.users || []) if (u.email === email && u.email.endsWith("@sentinela.test")) await fetch(`${SB}/auth/v1/admin/users/${u.id}`, { method: "DELETE", headers: H }); }

const email = `qa_lic_${Date.now()}@sentinela.test`;
const consoleErrors = []; const results = []; const ok = (n, c, x = "") => results.push({ name: n, pass: !!c, extra: x });
const browser = await chromium.launch(); const page = await browser.newPage();
page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()); });
page.on("pageerror", (e) => consoleErrors.push("pageerror: " + e.message));
try {
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.fill("input[name=email]", email); await page.fill("input[name=password]", "teste123");
  await page.click("button[value=signup]"); await page.waitForURL("**/onboarding", { timeout: 20000 });
  await page.fill("#cnpj", "60701190000104"); await page.click("button:has-text('Consultar')");
  await page.waitForSelector("text=É essa a sua empresa?", { timeout: 25000 }); await page.click("button:has-text('Sim, continuar')");
  await page.waitForSelector("text=Seus nichos", { timeout: 10000 }); await page.getByText("Material hospitalar", { exact: true }).click();
  await page.click("button:has-text('Continuar')"); await page.waitForSelector("text=Certidões de habilitação", { timeout: 10000 });
  await page.click("button:has-text('Concluir')"); await page.waitForURL("**/empresa", { timeout: 20000 });

  // adicionar à análise (cria workspace)
  await page.goto(`${BASE}/radar`, { waitUntil: "networkidle" });
  await page.waitForSelector("text=Sinais do seu recorte", { timeout: 10000 });
  await page.locator("button:has-text('Adicionar à análise')").first().click();
  await page.waitForURL(/\/licitacao\/[0-9a-f-]+/, { timeout: 15000 });
  ok("add à análise cria workspace (/licitacao/:id)", /\/licitacao\//.test(page.url()));
  const body = await page.locator("body").innerText();
  ok("workspace: abas presentes (Resumo/Documentos/Concorrentes)", body.includes("Resumo") && body.includes("Documentos") && body.includes("Concorrentes"));
  ok("workspace: 'Analisar com IA' presente e desligado", await page.locator("button:has-text('Analisar com IA')").isDisabled());
  await page.screenshot({ path: `${SHOTS}/licitacao-01.png`, fullPage: true });

  // aba pesada → selo 'em breve' (Radix só monta a aba ativa)
  await page.locator("button[role=tab]:has-text('Preços')").click();
  await page.waitForTimeout(400);
  const bodyPrecos = await page.locator("body").innerText();
  ok("workspace: aba pesada (Preços) com selo 'em breve'", bodyPrecos.toLowerCase().includes("em breve"));

  // volta pra Documentos e adiciona um doc
  await page.locator("button[role=tab]:has-text('Documentos')").click();
  await page.waitForTimeout(300);
  await page.fill("input[name=nome]", "Edital (teste QA)");
  await page.click("button:has-text('Adicionar')");
  await page.waitForSelector("text=Edital (teste QA)", { timeout: 10000 });
  ok("workspace: documento adicionado aparece", true);
  const dbDoc = await adminQuery(`select count(*) n from documento d join licitacao l on l.id=d.licitacao_id join auth.users u on u.id=l.tenant_id where u.email='${email}' and d.escopo='licitacao';`);
  ok("persistência: documento escopo=licitacao", Number(dbDoc?.[0]?.n ?? 0) >= 1, `db=${dbDoc?.[0]?.n}`);
  await page.screenshot({ path: `${SHOTS}/licitacao-02-doc.png`, fullPage: true });

  // excluir workspace → some tudo
  await page.locator("button:has-text('Excluir análise')").click();
  await page.waitForURL("**/radar", { timeout: 15000 });
  const dbLic = await adminQuery(`select count(*) n from licitacao l join auth.users u on u.id=l.tenant_id where u.email='${email}';`);
  ok("excluir workspace remove tudo (cascade)", Number(dbLic?.[0]?.n ?? 0) === 0, `licitacoes restantes=${dbLic?.[0]?.n}`);
  const dbDoc2 = await adminQuery(`select count(*) n from documento d where d.escopo='licitacao' and d.licitacao_id is not null and not exists (select 1 from licitacao l where l.id=d.licitacao_id);`);
  ok("excluir: documentos órfãos = 0", Number(dbDoc2?.[0]?.n ?? 0) === 0);

  ok("console sem erros", consoleErrors.length === 0, consoleErrors.slice(0, 4).join(" | "));
} catch (e) { ok("FLUXO LICITACAO", false, String(e)); await page.screenshot({ path: `${SHOTS}/licitacao-ERRO.png`, fullPage: true }).catch(() => {}); }
finally { await browser.close(); await cleanup(email); }
console.log("\n===== AUTOTESTE PASTA INTELIGENTE (Q5 esqueleto) =====");
let fail = 0; for (const r of results) { console.log(`${r.pass ? "✅" : "❌"} ${r.name}${r.extra ? "  — " + r.extra : ""}`); if (!r.pass) fail++; }
console.log(fail ? `\n${fail} FALHA(S)` : "\nTODOS PASSARAM"); process.exit(fail ? 1 : 0);
