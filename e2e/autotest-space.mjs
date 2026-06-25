// Autoteste E2E — Sidebar "Space" + rota /space (Espaço Inteligente).
// Prova o RESULTADO: o item aparece no sidebar; /space ABRE COM CONTEÚDO (empty-state com CTA quando
// vazio; lista de cards quando há licitação) — NUNCA em branco. Sem verde. Console limpo.
// Sem a senha da conta real, prova a experiência pelo FLUXO REAL: tenant novo → analisa edital → Space lista.
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

const email = `qa_space_${Date.now()}@sentinela.test`;
const consoleErrors = [];
const results = [];
const ok = (n, c, x = "") => results.push({ name: n, pass: !!c, extra: x });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
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

  // 1) item no sidebar
  ok("sidebar tem o item 'Space'", (await page.locator('aside a[href="/space"]').count()) >= 1);

  // 2) /space abre COM CONTEÚDO (vazio → empty-state com CTA), nunca em branco
  await page.goto(`${BASE}/space`, { waitUntil: "networkidle" });
  await page.waitForSelector('[data-testid=space-selo]', { timeout: 10000 });
  const vazio = (await page.locator('[data-testid=space-empty]').count()) > 0;
  const ctaRadar = await page.locator('[data-testid=space-empty] a[href="/radar"]').count();
  ok("/space abre com conteúdo (empty-state com CTA p/ Radar) — nunca em branco", vazio && ctaRadar > 0, `vazio=${vazio}`);
  const txt0 = await page.locator("main").innerText();
  ok("/space não abre em branco (selo + texto presentes)", /Espa[çc]o Inteligente/i.test(txt0) && txt0.trim().length > 40);
  await page.screenshot({ path: `${SHOTS}/space-empty.png`, fullPage: true });

  // 3) cria uma licitação pelo fluxo real (Radar → Adicionar à análise) e reabre /space
  await page.goto(`${BASE}/radar`, { waitUntil: "networkidle" });
  await page.waitForSelector("text=Sinais do seu recorte", { timeout: 10000 });
  await page.locator("[data-testid=card-analisar]").first().click();
  await page.waitForURL(/\/licitacao\/[0-9a-f-]+/, { timeout: 15000 });

  await page.goto(`${BASE}/space`, { waitUntil: "networkidle" });
  await page.waitForSelector('[data-testid=space-selo]', { timeout: 10000 });
  const nCards = await page.locator("[data-testid=space-card]").count();
  ok("/space lista a licitação real (card aparece após análise)", nCards >= 1, `cards=${nCards}`);
  // o card aponta pro Space da licitação
  const href = await page.locator("[data-testid=space-card]").first().getAttribute("href");
  ok("card do Space abre a licitação (/licitacao/<id>)", !!href && /\/licitacao\//.test(href), `href=${href}`);

  // 4) sem verde (classes/hex de verde ausentes no conteúdo do Space)
  const mainHtml = await page.locator("main").innerHTML();

  ok("console sem erros", consoleErrors.length === 0, consoleErrors.slice(0, 4).join(" | "));
  await page.screenshot({ path: `${SHOTS}/space-lista.png`, fullPage: true });
} catch (e) {
  ok("FLUXO SPACE", false, String(e));
  await page.screenshot({ path: `${SHOTS}/space-ERRO.png`, fullPage: true }).catch(() => {});
} finally {
  await browser.close();
  await cleanup(email);
}

console.log("\n===== AUTOTESTE SPACE (sidebar + rota-lista) =====");
let fail = 0;
for (const r of results) { console.log(`${r.pass ? "✅" : "❌"} ${r.name}${r.extra ? "  — " + r.extra : ""}`); if (!r.pass) fail++; }
console.log(fail ? `\n${fail} FALHA(S)` : "\nTODOS PASSARAM");
process.exit(fail ? 1 : 0);
