// Autoteste E2E do Q4 (Kanban). Promover do Radar → mover de coluna → persistir + alerta.
import { chromium } from "playwright";
import { mkdirSync, readFileSync } from "node:fs";
const BASE = "http://localhost:3001"; const SHOTS = "e2e/shots"; mkdirSync(SHOTS, { recursive: true });
function readEnv() { const env = {}; for (const line of readFileSync(".env.local", "utf8").split("\n")) { const t = line.trim(); if (t && !t.startsWith("#") && t.includes("=")) { const [k, ...v] = t.split("="); env[k.trim()] = v.join("=").trim().replace(/^['"]|['"]$/g, ""); } } return env; }
const E = readEnv(); const SB = E.SUPABASE_URL.replace(/\/$/, ""); const H = { apikey: E.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${E.SUPABASE_SERVICE_ROLE_KEY}` };
async function adminQuery(sql) { const ref = E.SUPABASE_PROJECT_REF || "ciupgqwsdmmmqpvbtyxx"; const r = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, { method: "POST", headers: { Authorization: `Bearer ${E.SUPABASE_ACCESS_TOKEN}`, "Content-Type": "application/json", "User-Agent": "x" }, body: JSON.stringify({ query: sql }) }); return r.json(); }
async function cleanup(email) { const list = await (await fetch(`${SB}/auth/v1/admin/users`, { headers: H })).json(); for (const u of list.users || []) if (u.email === email && u.email.endsWith("@sentinela.test")) await fetch(`${SB}/auth/v1/admin/users/${u.id}`, { method: "DELETE", headers: H }); }

const email = `qa_kanban_${Date.now()}@sentinela.test`;
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

  // promover do radar
  await page.goto(`${BASE}/radar`, { waitUntil: "networkidle" });
  await page.waitForSelector("text=Sinais do seu recorte", { timeout: 10000 });
  await page.locator("[data-testid=card-monitorar]").first().click();
  await page.waitForSelector("text=Monitorando", { timeout: 10000 });

  // kanban
  await page.goto(`${BASE}/kanban`, { waitUntil: "networkidle" });
  await page.waitForSelector("[data-testid=kanban-board]", { timeout: 10000 });
  ok("kanban: card promovido aparece no board", (await page.locator("button[aria-label='Avançar etapa']").count()) >= 1);

  // KANBAN v2 (fiel à maquete): hero + 5 colunas da jornada + card estilo v2 com dado real
  ok("kanban v2: hero 'Kanban de Execução'", /Kanban de Execução/.test(await page.locator("main").innerText()));
  ok("kanban v2: board com as 5 colunas da jornada", (await page.locator("[data-testid=kanban-board] .column").count()) === 5);
  ok("kanban v2: colunas do modelo (Em análise … Resultado / contrato)", (await page.locator("[data-testid=coluna-nova]").count()) > 0 && (await page.locator("[data-testid=coluna-resultado]").count()) > 0 && /Em análise/.test(await page.locator("[data-testid=coluna-nova]").innerText()) && /Resultado \/ contrato/.test(await page.locator("[data-testid=coluna-resultado]").innerText()) && /Preparação documental/.test(await page.locator("[data-testid=coluna-monitorando]").innerText()));
  ok("kanban v2: card v2 do edital promovido presente (órgão + objeto reais)", (await page.locator("[data-testid=kanban-card]").count()) >= 1 && (await page.locator("[data-testid=coluna-monitorando] [data-testid=kanban-card]").count()) >= 1);
  const cardTxt = await page.locator("[data-testid=coluna-monitorando] [data-testid=kanban-card]").first().innerText();
  ok("kanban v2: card mostra conteúdo real (não placeholder)", cardTxt.trim().length > 10 && !/lorem|placeholder|exemplo/i.test(cardTxt), cardTxt.replace(/\n/g, " ").slice(0, 70));
  await page.screenshot({ path: `${SHOTS}/kanban-01.png`, fullPage: true });

  // mover para Preparação
  await page.locator("button[aria-label='Avançar etapa']").first().click();
  await page.waitForTimeout(1500);
  const db = await adminQuery(`select o.stage from oportunidade o join auth.users u on u.id=o.tenant_id where u.email='${email}';`);
  ok("kanban: mover persiste stage=preparacao", db?.[0]?.stage === "preparacao", `db stage=${db?.[0]?.stage}`);
  await page.screenshot({ path: `${SHOTS}/kanban-02-movido.png`, fullPage: true });

  ok("console sem erros", consoleErrors.length === 0, consoleErrors.slice(0, 4).join(" | "));
} catch (e) { ok("FLUXO KANBAN", false, String(e)); await page.screenshot({ path: `${SHOTS}/kanban-ERRO.png`, fullPage: true }).catch(() => {}); }
finally { await browser.close(); await cleanup(email); }
console.log("\n===== AUTOTESTE KANBAN (Q4) =====");
let fail = 0; for (const r of results) { console.log(`${r.pass ? "✅" : "❌"} ${r.name}${r.extra ? "  — " + r.extra : ""}`); if (!r.pass) fail++; }
console.log(fail ? `\n${fail} FALHA(S)` : "\nTODOS PASSARAM"); process.exit(fail ? 1 : 0);
