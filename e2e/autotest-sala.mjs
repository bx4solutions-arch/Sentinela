// Autoteste E2E — BLOCO 2: Sala de Guerra (Inteligência Comercial + Mercado) + Dashboard (Tarefas do dia).
// Prova o RESULTADO: a Sala de um edital real mostra concorrentes/faixa praticada (de contratos reais);
// o Dashboard mostra tarefas reais derivadas do dado. Zero botão fake.
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
async function cleanup(email) {
  const list = await (await fetch(`${SB}/auth/v1/admin/users`, { headers: H })).json();
  for (const u of list.users || []) if (u.email === email && u.email.endsWith("@sentinela.test")) await fetch(`${SB}/auth/v1/admin/users/${u.id}`, { method: "DELETE", headers: H });
}

const email = `qa_sala_${Date.now()}@sentinela.test`;
const consoleErrors = [];
const results = [];
const ok = (n, c, x = "") => results.push({ name: n, pass: !!c, extra: x });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()); });
page.on("pageerror", (e) => consoleErrors.push("pageerror: " + e.message));
try {
  // onboarding (material-hospitalar / SP)
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

  // ---- DASHBOARD: Ações de hoje (layout LicitaPro) ----
  await page.goto(`${BASE}/dashboard`, { waitUntil: "networkidle" });
  await page.waitForSelector("[data-testid=dashboard-root]", { timeout: 10000 });
  const temTarefas = (await page.locator("[data-testid=dashboard-acoes]").count()) > 0;
  const nTarefas = await page.locator("[data-testid=dashboard-tarefa]").count();
  ok("Dashboard: 'Ações de hoje' com ações reais derivadas do dado", temTarefas && nTarefas >= 1, `tarefas=${nTarefas}`);
  // blocos: Oportunidades quentes (Radar) + Linha do Tempo (Antecipação)
  const body0 = await page.locator("body").innerText();
  ok("Dashboard tem Oportunidades quentes + Linha do Tempo de Sinais", /Oportunidades quentes/.test(body0) && /Linha do Tempo de Sinais/.test(body0));
  await page.screenshot({ path: `${SHOTS}/dashboard-completo.png`, fullPage: true });

  // ---- SALA DE GUERRA: analisa um edital e abre a Inteligência ----
  await page.goto(`${BASE}/radar`, { waitUntil: "networkidle" });
  await page.waitForSelector("text=Sinais do seu recorte", { timeout: 10000 });
  await page.locator("[data-testid=card-analisar]").first().click();
  await page.waitForURL(/\/licitacao\/[0-9a-f-]+/, { timeout: 15000 });
  ok("Sala de Guerra abriu (/licitacao/<id>)", /\/licitacao\//.test(page.url()));

  // aba Inteligência
  await page.waitForSelector("[data-testid=raiox-relatorio]", { timeout: 15000 });
  await page.waitForTimeout(600);
  const temIntel = (await page.locator("[data-testid=sala-inteligencia]").count()) > 0;
  const temConcorrentes = (await page.locator("[data-testid=concorrentes]").count()) > 0;
  const temFaixa = (await page.locator("[data-testid=faixa-valor]").count()) > 0;
  ok("Sala: Inteligência de Mercado com dado real (concorrentes e/ou faixa praticada)", temIntel && (temConcorrentes || temFaixa), `concorrentes=${temConcorrentes}, faixa=${temFaixa}`);
  const bodyS = await page.locator("body").innerText();
  ok("Sala: faixa é referência de CONTRATOS firmados, não recomendação de preço (calibrado)", /referência de mercado|não recomendação de preço/i.test(bodyS));
  await page.screenshot({ path: `${SHOTS}/sala-inteligencia.png`, fullPage: true });

  ok("console sem erros", consoleErrors.length === 0, consoleErrors.slice(0, 4).join(" | "));
} catch (e) {
  ok("FLUXO SALA/DASHBOARD", false, String(e));
  await page.screenshot({ path: `${SHOTS}/sala-ERRO.png`, fullPage: true }).catch(() => {});
} finally {
  await browser.close();
  await cleanup(email);
}

console.log("\n===== AUTOTESTE SALA DE GUERRA + DASHBOARD (Bloco 2) =====");
let fail = 0;
for (const r of results) { console.log(`${r.pass ? "✅" : "❌"} ${r.name}${r.extra ? "  — " + r.extra : ""}`); if (!r.pass) fail++; }
console.log(fail ? `\n${fail} FALHA(S)` : "\nTODOS PASSARAM");
process.exit(fail ? 1 : 0);
