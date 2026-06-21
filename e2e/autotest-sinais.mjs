// Autoteste TASK 2 — sinais reais no card (recorrência, certidão impeditiva) + descartar com motivo.
import { chromium } from "playwright";
import { mkdirSync, readFileSync } from "node:fs";
const BASE = "http://localhost:3001"; const SHOTS = "e2e/shots"; mkdirSync(SHOTS, { recursive: true });
function readEnv() { const env = {}; for (const line of readFileSync(".env.local", "utf8").split("\n")) { const t = line.trim(); if (t && !t.startsWith("#") && t.includes("=")) { const [k, ...v] = t.split("="); env[k.trim()] = v.join("=").trim().replace(/^['"]|['"]$/g, ""); } } return env; }
const E = readEnv(); const SB = E.SUPABASE_URL.replace(/\/$/, ""); const H = { apikey: E.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${E.SUPABASE_SERVICE_ROLE_KEY}` };
async function adminQuery(sql) { const ref = E.SUPABASE_PROJECT_REF || "ciupgqwsdmmmqpvbtyxx"; const r = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, { method: "POST", headers: { Authorization: `Bearer ${E.SUPABASE_ACCESS_TOKEN}`, "Content-Type": "application/json", "User-Agent": "x" }, body: JSON.stringify({ query: sql }) }); return r.json(); }
async function cleanup(email) { const list = await (await fetch(`${SB}/auth/v1/admin/users`, { headers: H })).json(); for (const u of list.users || []) if (u.email === email && u.email.endsWith("@sentinela.test")) await fetch(`${SB}/auth/v1/admin/users/${u.id}`, { method: "DELETE", headers: H }); }

const email = `qa_sinais_${Date.now()}@sentinela.test`;
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

  // monitora Santos (tem órgãos recorrentes)
  await page.goto(`${BASE}/radar`, { waitUntil: "networkidle" });
  await page.waitForSelector("text=Sinais do seu recorte", { timeout: 10000 });
  await page.selectOption("select[aria-label='Adicionar cidade']", "3548500");
  await page.locator("form:has(select[aria-label='Adicionar cidade']) button[type=submit]").click();
  await page.waitForSelector("text=pronta", { timeout: 12000 });
  const body = await page.locator("body").innerText();
  ok("sinal 'órgão recorrente' aparece (dado real)", body.includes("órgão recorrente"));
  await page.screenshot({ path: `${SHOTS}/SINAIS-radar.png`, fullPage: true });

  // certidão impeditiva: insere doc obrigatório VENCIDO p/ a empresa do qa
  const comp = await adminQuery(`select c.id, c.tenant_id from company c join auth.users u on u.id=c.tenant_id where u.email='${email}';`);
  const cid = comp?.[0]?.id; const tid = comp?.[0]?.tenant_id;
  await adminQuery(`insert into documento (tenant_id, company_id, escopo, tipo, vencimento) values ('${tid}','${cid}','company','fiscal_federal','2025-01-01') on conflict (company_id,tipo) do update set vencimento='2025-01-01';`);
  await page.reload({ waitUntil: "networkidle" });
  ok("sinal 'certidão impeditiva' (doc vencido) aparece", (await page.locator("text=Certidão impeditiva").count()) > 0);

  // descartar com motivo
  await page.locator("form:has(select[aria-label='Motivo do descarte']) select").first().selectOption("fora_escopo");
  await page.locator("form:has(select[aria-label='Motivo do descarte']) button[type=submit]").first().click();
  await page.waitForTimeout(1500);
  const desc = await adminQuery(`select stage, motivo from oportunidade o join auth.users u on u.id=o.tenant_id where u.email='${email}' and o.stage='descartado' limit 1;`);
  ok("descartar salva stage=descartado + motivo", desc?.[0]?.stage === "descartado" && desc?.[0]?.motivo === "fora_escopo", `motivo=${desc?.[0]?.motivo}`);

  ok("console sem erros", consoleErrors.length === 0, consoleErrors.slice(0, 4).join(" | "));
} catch (e) { ok("FLUXO SINAIS", false, String(e)); await page.screenshot({ path: `${SHOTS}/SINAIS-ERRO.png`, fullPage: true }).catch(() => {}); }
finally { await browser.close(); await cleanup(email); }
console.log("\n===== AUTOTESTE SINAIS (TASK 2) =====");
let fail = 0; for (const r of results) { console.log(`${r.pass ? "✅" : "❌"} ${r.name}${r.extra ? "  — " + r.extra : ""}`); if (!r.pass) fail++; }
console.log(fail ? `\n${fail} FALHA(S)` : "\nTODOS PASSARAM"); process.exit(fail ? 1 : 0);
