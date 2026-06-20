// Autoteste E2E do Q3 (Dashboard real). KPIs do banco, sem mock.
import { chromium } from "playwright";
import { mkdirSync, readFileSync } from "node:fs";

const BASE = "http://localhost:3001";
const SHOTS = "e2e/shots";
mkdirSync(SHOTS, { recursive: true });
function readEnv() {
  const env = {};
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const t = line.trim();
    if (t && !t.startsWith("#") && t.includes("=")) { const [k, ...v] = t.split("="); env[k.trim()] = v.join("=").trim().replace(/^['"]|['"]$/g, ""); }
  }
  return env;
}
const E = readEnv();
const SB = E.SUPABASE_URL.replace(/\/$/, "");
const H = { apikey: E.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${E.SUPABASE_SERVICE_ROLE_KEY}` };
async function adminQuery(sql) {
  const ref = E.SUPABASE_PROJECT_REF || "ciupgqwsdmmmqpvbtyxx";
  const r = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, { method: "POST", headers: { Authorization: `Bearer ${E.SUPABASE_ACCESS_TOKEN}`, "Content-Type": "application/json", "User-Agent": "x" }, body: JSON.stringify({ query: sql }) });
  return r.json();
}
async function cleanup(email) {
  const list = await (await fetch(`${SB}/auth/v1/admin/users`, { headers: H })).json();
  for (const u of list.users || []) if (u.email === email && u.email.endsWith("@sentinela.test")) await fetch(`${SB}/auth/v1/admin/users/${u.id}`, { method: "DELETE", headers: H });
}

const email = `qa_dash_${Date.now()}@sentinela.test`;
const consoleErrors = [];
const results = [];
const ok = (n, c, x = "") => results.push({ name: n, pass: !!c, extra: x });

const browser = await chromium.launch();
const page = await browser.newPage();
page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()); });
page.on("pageerror", (e) => consoleErrors.push("pageerror: " + e.message));

try {
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

  // monitora 1 edital (p/ pipeline)
  await page.goto(`${BASE}/radar`, { waitUntil: "networkidle" });
  await page.waitForSelector("text=Sinais do seu recorte", { timeout: 10000 });
  await page.locator("button:has-text('Monitorar')").first().click();
  await page.waitForSelector("text=Monitorando", { timeout: 10000 });

  // dashboard
  await page.goto(`${BASE}/dashboard`, { waitUntil: "networkidle" });
  await page.waitForSelector("text=Atacar hoje", { timeout: 10000 });
  const body = await page.locator("body").innerText();

  const db = await adminQuery("select count(*) n from raw_editais where segmentos && array['material-hospitalar'] and cidade='São Paulo' and valor_homologado is null;");
  const abertos = String(db?.[0]?.n ?? "0");
  ok("dashboard KPI 'editais abertos' bate com o banco", body.includes(abertos), `banco=${abertos}`);
  ok("dashboard mostra 'Monitorando' no funil", /Monitorando/.test(body));
  ok("dashboard: 'Atacar hoje' com itens reais", (await page.locator("text=Atacar hoje").count()) > 0 && body.includes("Prontidão"));
  ok("dashboard: SEM banner mock", !body.includes("ILUSTRATIVOS") && !body.toLowerCase().includes("mock"));
  ok("console sem erros", consoleErrors.length === 0, consoleErrors.slice(0, 4).join(" | "));
  await page.screenshot({ path: `${SHOTS}/dashboard-01.png`, fullPage: true });
} catch (e) {
  ok("FLUXO DASHBOARD", false, String(e));
  await page.screenshot({ path: `${SHOTS}/dashboard-ERRO.png`, fullPage: true }).catch(() => {});
} finally {
  await browser.close();
  await cleanup(email);
}

console.log("\n===== AUTOTESTE DASHBOARD (Q3) =====");
let fail = 0;
for (const r of results) { console.log(`${r.pass ? "✅" : "❌"} ${r.name}${r.extra ? "  — " + r.extra : ""}`); if (!r.pass) fail++; }
console.log(fail ? `\n${fail} FALHA(S)` : "\nTODOS PASSARAM");
process.exit(fail ? 1 : 0);
