// Autoteste TASK 1 — Pasta = tela-rainha, Resumo determinístico do payload (REAL, sem mock, sem IA).
import { chromium } from "playwright";
import { mkdirSync, readFileSync } from "node:fs";
const BASE = "http://localhost:3001"; const SHOTS = "e2e/shots"; mkdirSync(SHOTS, { recursive: true });
function readEnv() { const env = {}; for (const line of readFileSync(".env.local", "utf8").split("\n")) { const t = line.trim(); if (t && !t.startsWith("#") && t.includes("=")) { const [k, ...v] = t.split("="); env[k.trim()] = v.join("=").trim().replace(/^['"]|['"]$/g, ""); } } return env; }
const E = readEnv(); const SB = E.SUPABASE_URL.replace(/\/$/, ""); const H = { apikey: E.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${E.SUPABASE_SERVICE_ROLE_KEY}` };
async function adminQuery(sql) { const ref = E.SUPABASE_PROJECT_REF || "ciupgqwsdmmmqpvbtyxx"; const r = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, { method: "POST", headers: { Authorization: `Bearer ${E.SUPABASE_ACCESS_TOKEN}`, "Content-Type": "application/json", "User-Agent": "x" }, body: JSON.stringify({ query: sql }) }); return r.json(); }
async function cleanup(email) { const list = await (await fetch(`${SB}/auth/v1/admin/users`, { headers: H })).json(); for (const u of list.users || []) if (u.email === email && u.email.endsWith("@sentinela.test")) await fetch(`${SB}/auth/v1/admin/users/${u.id}`, { method: "DELETE", headers: H }); }

const email = `qa_pasta_${Date.now()}@sentinela.test`;
const consoleErrors = []; const results = []; const ok = (n, c, x = "") => results.push({ name: n, pass: !!c, extra: x });
const browser = await chromium.launch(); const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()); });
page.on("pageerror", (e) => consoleErrors.push("pageerror: " + e.message));
try {
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.fill("input[name=email]", email); await page.fill("input[name=password]", "teste123");
  await page.click("button[value=signup]"); await page.waitForURL("**/onboarding", { timeout: 20000 });
  await page.fill("#cnpj", "60701190000104"); await page.click("button:has-text('Consultar')");
  await page.waitForSelector("text=É essa a sua empresa?", { timeout: 25000 }); await page.click("button:has-text('Sim, continuar')");
  await page.waitForSelector("text=Seus nichos", { timeout: 10000 }); await page.getByText("Controle de pragas", { exact: true }).click();
  await page.click("button:has-text('Continuar')"); await page.waitForSelector("text=Certidões de habilitação", { timeout: 10000 });
  await page.click("button:has-text('Concluir')"); await page.waitForURL("**/empresa", { timeout: 20000 });

  // monitora Santos → radar foca em Santos
  await page.goto(`${BASE}/radar`, { waitUntil: "networkidle" });
  await page.waitForSelector("text=Sinais do seu recorte", { timeout: 10000 });
  await page.selectOption("select[aria-label='Adicionar cidade']", "3548500");
  await page.locator("form:has(select[aria-label='Adicionar cidade']) button[type=submit]").click();
  await page.waitForSelector("text=pronta", { timeout: 12000 });

  // Adicionar à análise → Pasta
  await page.locator("button:has-text('Adicionar à análise')").first().click();
  await page.waitForURL(/\/licitacao\/[0-9a-f-]+/, { timeout: 15000 });
  await page.waitForSelector("text=Identificação da licitação", { timeout: 10000 });
  const body = await page.locator("body").innerText();

  ok("Resumo determinístico SEM IA (Identificação da licitação + Sessão pública)", body.includes("Identificação da licitação") && body.includes("Sessão pública") && /determin[íi]stico/i.test(body));
  ok("Resumo traz Modalidade + Valor estimado (kv do PNCP)", body.includes("Modalidade") && body.includes("Valor estimado"));
  ok("dado REAL (não mock São Luís)", !/São Luís|SEMED|Dedetizadora Maranhense/i.test(body));
  // empresa × edital
  await page.waitForSelector("[data-testid=raiox-relatorio]", { timeout: 15000 });
  await page.waitForTimeout(300);
  ok("Empresa × Edital determinístico (checklist + status)", (await page.locator("text=% pronto").count()) > 0);
  // veredito
  await page.waitForSelector("[data-testid=raiox-relatorio]", { timeout: 15000 });
  await page.waitForTimeout(300);
  const bodyVer = await page.locator("body").innerText();
  ok("Veredito calibrado + disclaimer (sem IA)", bodyVer.includes("Veredito calibrado") && bodyVer.toLowerCase().includes("não é garantia"));
  // botões reais/desabilitados
  ok("botão Monitorar real", (await page.locator("button:has-text('Monitorar')").count()) > 0);
  ok("botão .docx desabilitado (não fake)", await page.locator("button:has-text('.docx')").first().isDisabled());
  // persistência: resumo_json cacheado
  const rj = await adminQuery(`select (resumo_json is not null) as cached from licitacao l join auth.users u on u.id=l.tenant_id where u.email='${email}' limit 1;`);
  ok("persistência: resumo_json cacheado", rj?.[0]?.cached === true);
  await page.screenshot({ path: `${SHOTS}/PASTA-resumo.png`, fullPage: true });

  ok("console sem erros", consoleErrors.length === 0, consoleErrors.slice(0, 4).join(" | "));
} catch (e) { ok("FLUXO PASTA", false, String(e)); await page.screenshot({ path: `${SHOTS}/PASTA-ERRO.png`, fullPage: true }).catch(() => {}); }
finally { await browser.close(); await cleanup(email); }
console.log("\n===== AUTOTESTE PASTA (TASK 1) =====");
let fail = 0; for (const r of results) { console.log(`${r.pass ? "✅" : "❌"} ${r.name}${r.extra ? "  — " + r.extra : ""}`); if (!r.pass) fail++; }
console.log(fail ? `\n${fail} FALHA(S)` : "\nTODOS PASSARAM"); process.exit(fail ? 1 : 0);
