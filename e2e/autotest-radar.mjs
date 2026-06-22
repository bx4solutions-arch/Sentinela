// Autoteste E2E do Q2 (Radar real). Onboard SP + nicho hospitalar → editais reais → monitorar/descartar.
import { chromium } from "playwright";
import { mkdirSync, readFileSync } from "node:fs";

const BASE = "http://localhost:3001";
const SHOTS = "e2e/shots";
mkdirSync(SHOTS, { recursive: true });

function readEnv() {
  const env = {};
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const t = line.trim();
    if (t && !t.startsWith("#") && t.includes("=")) {
      const [k, ...v] = t.split("="); env[k.trim()] = v.join("=").trim().replace(/^['"]|['"]$/g, "");
    }
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
async function cleanup(email) {
  const list = await (await fetch(`${SB}/auth/v1/admin/users`, { headers: H })).json();
  for (const u of list.users || []) if (u.email === email && u.email.endsWith("@sentinela.test"))
    await fetch(`${SB}/auth/v1/admin/users/${u.id}`, { method: "DELETE", headers: H });
}

const email = `qa_radar_${Date.now()}@sentinela.test`;
const consoleErrors = [];
const results = [];
const ok = (n, c, x = "") => results.push({ name: n, pass: !!c, extra: x });

const browser = await chromium.launch();
const page = await browser.newPage();
page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()); });
page.on("pageerror", (e) => consoleErrors.push("pageerror: " + e.message));

try {
  // conta + onboarding (Itaú SP) com nicho material-hospitalar
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
  await page.getByText("Material hospitalar", { exact: true }).click(); // liga o nicho
  await page.click("button:has-text('Continuar')");
  await page.waitForSelector("text=Certidões de habilitação", { timeout: 10000 });
  await page.click("button:has-text('Concluir')");
  await page.waitForURL("**/empresa", { timeout: 20000 });

  // Radar
  await page.goto(`${BASE}/radar`, { waitUntil: "networkidle" });
  await page.waitForSelector("text=Sinais do seu recorte", { timeout: 10000 });
  const body = await page.locator("body").innerText();
  ok("radar: filtro cidade São Paulo", body.includes("São Paulo"));
  ok("radar: filtro nicho Material hospitalar", body.includes("Material hospitalar"));

  const cards = await page.locator("form:has-text('Descartar')").count();
  ok("radar: cards de editais reais (>0)", cards > 0, `${cards} cards`);
  ok("radar: respeita limite 60", cards <= 60, `${cards} cards`);

  // bate com o banco?
  const db = await adminQuery("select count(*) n from raw_editais where segmentos && array['material-hospitalar'] and cidade='São Paulo' and valor_homologado is null;");
  const nDb = Number(db?.[0]?.n ?? 0);
  ok("radar: banco tem editais hospitalar SP abertos", nDb > 100, `banco=${nDb} abertos`);
  await page.screenshot({ path: `${SHOTS}/radar-01-lista.png`, fullPage: true });

  // Monitorar primeiro card
  await page.locator("[data-testid=card-monitorar]").first().click();
  await page.waitForSelector("text=Monitorando", { timeout: 10000 });
  ok("radar: monitorar marca 'Monitorando'", true);
  const mon = await adminQuery(`select count(*) n from oportunidade o join auth.users u on u.id=o.tenant_id where u.email='${email}' and o.stage='monitorando';`);
  ok("persistência: oportunidade stage=monitorando", Number(mon?.[0]?.n ?? 0) >= 1, `db=${mon?.[0]?.n}`);

  // Descartar um card → o numero ESPECÍFICO some (limit 60 refila, então conta não basta)
  const cardD = page.locator("[data-testid=edital-card]").nth(1);
  const numD = ((await cardD.innerText()).match(/\d{14}-\d-\d{6}\/\d{4}/) || [])[0];
  await cardD.locator("[data-testid=card-descartar]").click();
  await page.waitForTimeout(1500);
  await page.reload({ waitUntil: "networkidle" });
  ok("radar: descartar remove o card (numero some)", !!numD && (await page.locator(`text=${numD}`).count()) === 0, `num=${numD}`);
  const desc = await adminQuery(`select count(*) n from oportunidade o join auth.users u on u.id=o.tenant_id where u.email='${email}' and o.stage='descartado';`);
  ok("persistência: oportunidade stage=descartado", Number(desc?.[0]?.n ?? 0) >= 1, `db=${desc?.[0]?.n}`);
  await page.screenshot({ path: `${SHOTS}/radar-02-pos-acoes.png`, fullPage: true });

  ok("console sem erros", consoleErrors.length === 0, consoleErrors.slice(0, 4).join(" | "));
} catch (e) {
  ok("FLUXO RADAR", false, String(e));
  await page.screenshot({ path: `${SHOTS}/radar-ERRO.png`, fullPage: true }).catch(() => {});
} finally {
  await browser.close();
  await cleanup(email);
}

console.log("\n===== AUTOTESTE RADAR (Q2) =====");
let fail = 0;
for (const r of results) { console.log(`${r.pass ? "✅" : "❌"} ${r.name}${r.extra ? "  — " + r.extra : ""}`); if (!r.pass) fail++; }
console.log(fail ? `\n${fail} FALHA(S)` : "\nTODOS PASSARAM");
process.exit(fail ? 1 : 0);
