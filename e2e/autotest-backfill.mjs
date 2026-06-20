// Autoteste TASK 1 (backfill por célula) + TASK 2 (dashboard rico).
import { chromium } from "playwright";
import { mkdirSync, readFileSync } from "node:fs";
const BASE = "http://localhost:3001"; const SHOTS = "e2e/shots"; mkdirSync(SHOTS, { recursive: true });
function readEnv() { const env = {}; for (const line of readFileSync(".env.local", "utf8").split("\n")) { const t = line.trim(); if (t && !t.startsWith("#") && t.includes("=")) { const [k, ...v] = t.split("="); env[k.trim()] = v.join("=").trim().replace(/^['"]|['"]$/g, ""); } } return env; }
const E = readEnv(); const SB = E.SUPABASE_URL.replace(/\/$/, ""); const H = { apikey: E.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${E.SUPABASE_SERVICE_ROLE_KEY}` };
async function adminQuery(sql) { const ref = E.SUPABASE_PROJECT_REF || "ciupgqwsdmmmqpvbtyxx"; const r = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, { method: "POST", headers: { Authorization: `Bearer ${E.SUPABASE_ACCESS_TOKEN}`, "Content-Type": "application/json", "User-Agent": "x" }, body: JSON.stringify({ query: sql }) }); return r.json(); }
async function cleanup(email) { const list = await (await fetch(`${SB}/auth/v1/admin/users`, { headers: H })).json(); for (const u of list.users || []) if (u.email === email && u.email.endsWith("@sentinela.test")) await fetch(`${SB}/auth/v1/admin/users/${u.id}`, { method: "DELETE", headers: H }); await adminQuery("delete from cidade_coletada where codigo_ibge='3500105';"); }

const email = `qa_bf_${Date.now()}@sentinela.test`;
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

  // Radar — fallback UF inicial
  await page.goto(`${BASE}/radar`, { waitUntil: "networkidle" });
  await page.waitForSelector("text=Sinais do seu recorte", { timeout: 10000 });
  ok("radar inicial usa fallback de UF (sem cidade)", (await page.locator("text=estado SP").count()) > 0);

  // Monitorar Santos (já coletada = reuso imediato)
  await page.selectOption("select[aria-label='Adicionar cidade']", "3548500");
  await page.locator("form:has(select[aria-label='Adicionar cidade']) button[type=submit]").click();
  await page.waitForSelector("text=pronta", { timeout: 12000 });
  const bodySantos = await page.locator("body").innerText();
  ok("monitorar Santos: chip 'pronta' (reuso)", bodySantos.includes("Santos") && bodySantos.includes("pronta"));
  const cardsSantos = await page.locator("form:has-text('Descartar')").count();
  ok("Radar popula com editais de Santos", cardsSantos > 0, `${cardsSantos} cards`);
  // confirma que os cards são de Santos (cidade no card)
  ok("cards mostram cidade Santos", (await page.locator("text=Santos").count()) > 1);
  const celula = await adminQuery(`select count(*) n from celula c join auth.users u on u.id=c.tenant_id where u.email='${email}' and c.codigo_ibge='3548500';`);
  ok("persistência: célula Santos criada", Number(celula?.[0]?.n ?? 0) === 1);
  await page.screenshot({ path: `${SHOTS}/BF-1-radar-santos.png`, fullPage: true });

  // Cidade não coletada → banner "coletando" (Adamantina/SP)
  await page.selectOption("select[aria-label='Adicionar cidade']", "3500105");
  await page.locator("form:has(select[aria-label='Adicionar cidade']) button[type=submit]").click();
  await page.waitForSelector("text=Carregando", { timeout: 12000 }).catch(() => {});
  const bodyColetando = await page.locator("body").innerText();
  ok("cidade nova → banner 'Carregando histórico'", /Carregando hist[oó]rico de Adamantina/i.test(bodyColetando));
  const cc = await adminQuery("select status from cidade_coletada where codigo_ibge='3500105';");
  ok("cidade nova enfileirada (pendente)", cc?.[0]?.status === "pendente", `status=${cc?.[0]?.status}`);

  // Dashboard rico
  await page.goto(`${BASE}/dashboard`, { waitUntil: "networkidle" });
  await page.waitForSelector("text=Atacar hoje", { timeout: 10000 });
  const dash = await page.locator("body").innerText();
  ok("dashboard rico: KPIs + Atacar hoje + Abertos por segmento + Pipeline", dash.includes("Editais abertos") && dash.includes("Atacar hoje") && dash.includes("Abertos por segmento") && dash.includes("Pipeline"));
  ok("dashboard sem banner mock", !dash.includes("ILUSTRATIVOS"));
  await page.screenshot({ path: `${SHOTS}/BF-2-dashboard-rico.png`, fullPage: true });

  ok("console sem erros", consoleErrors.length === 0, consoleErrors.slice(0, 4).join(" | "));
} catch (e) { ok("FLUXO BACKFILL", false, String(e)); await page.screenshot({ path: `${SHOTS}/BF-ERRO.png`, fullPage: true }).catch(() => {}); }
finally { await browser.close(); await cleanup(email); }
console.log("\n===== AUTOTESTE BACKFILL + DASHBOARD (TASK1+2) =====");
let fail = 0; for (const r of results) { console.log(`${r.pass ? "✅" : "❌"} ${r.name}${r.extra ? "  — " + r.extra : ""}`); if (!r.pass) fail++; }
console.log(fail ? `\n${fail} FALHA(S)` : "\nTODOS PASSARAM"); process.exit(fail ? 1 : 0);
