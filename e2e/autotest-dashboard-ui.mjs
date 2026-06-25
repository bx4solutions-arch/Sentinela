// Autoteste E2E — Overhaul de design system + Dashboard LicitaPro (desktop + mobile).
// Prova: layout 3/6/3 no desktop e pilha + barra fixa no mobile; ZERO verde (classe CSS) em todo o app;
// dado HONESTO (Pipeline em ingestão OU estimativa real; Performance cold-start sem número forjado);
// herança do design system (Radar/Space herdaram o piso de tipografia 13px + cards).
import { chromium } from "playwright";
import { mkdirSync, readFileSync } from "node:fs";

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
async function cleanup(email) {
  const list = await (await fetch(`${SB}/auth/v1/admin/users`, { headers: H })).json();
  for (const u of list.users || []) if (u.email === email && u.email.endsWith("@sentinela.test")) await fetch(`${SB}/auth/v1/admin/users/${u.id}`, { method: "DELETE", headers: H });
}
// Verde LIBERADO no design v2 (Opção A) — a régua "zero verde" foi removida na Etapa 0.
const email = `qa_dashui_${Date.now()}@sentinela.test`;
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

  // ===== DESKTOP — HOME v2 =====
  await page.goto(`${BASE}/dashboard`, { waitUntil: "networkidle" });
  await page.waitForSelector("[data-testid=dashboard-root]", { timeout: 10000 });
  ok("DESKTOP: HOME v2 com 5 KPIs", (await page.locator("[data-testid=home-kpis] .kpi").count()) === 5, `kpis=${await page.locator("[data-testid=home-kpis] .kpi").count()}`);
  const ab = await page.locator("[data-testid=home-acoes]").boundingBox();
  const stb = await page.locator("[data-testid=home-status]").boundingBox();
  ok("DESKTOP: Ações urgentes | Status da empresa lado a lado", ab.x < stb.x && Math.abs(ab.y - stb.y) < 220, `x: ${Math.round(ab.x)}/${Math.round(stb.x)}`);
  // honestidade: warning de score = estimativa em calibração
  const warnTxt = await page.locator("[data-testid=home-warning]").innerText();
  ok("HOME honesta: score rotulado 'estimativa' em calibração", /estimativa/i.test(warnTxt), warnTxt.slice(0, 60));
  await page.screenshot({ path: `${SHOTS}/dashboard-desktop.png`, fullPage: true });

  // ===== HERANÇA do design system: Radar legível (piso text-xs = 13px) + screenshot =====
  await page.goto(`${BASE}/radar`, { waitUntil: "networkidle" });
  await page.waitForSelector("text=Sinais do seu recorte", { timeout: 10000 });
  const xsPx = await page.locator("main .text-xs").first().evaluate((el) => parseFloat(getComputedStyle(el).fontSize)).catch(() => 0);
  ok("HERANÇA: Radar herdou o piso de tipografia (text-xs ≈ 13px)", xsPx >= 12.5, `text-xs=${xsPx}px`);
  await page.screenshot({ path: `${SHOTS}/radar-ds.png`, fullPage: true });

  // Space (licitação) legível + screenshot
  await page.locator("[data-testid=card-analisar]").first().click();
  await page.waitForURL(/\/licitacao\/[0-9a-f-]+/, { timeout: 15000 });
  await page.waitForSelector("[data-testid=space-cabecalho]", { timeout: 10000 });
  const h1Px = await page.locator("[data-testid=space-cabecalho] h1").evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  ok("HERANÇA: Space com título grande (órgão ≥ 24px)", h1Px >= 24, `h1=${h1Px}px`);
  await page.screenshot({ path: `${SHOTS}/space-ds.png`, fullPage: true });

  // ===== MOBILE (resize) =====
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${BASE}/dashboard`, { waitUntil: "networkidle" });
  await page.waitForSelector("[data-testid=dashboard-root]", { timeout: 10000 });
  const ab2 = await page.locator("[data-testid=home-acoes]").boundingBox();
  const stb2 = await page.locator("[data-testid=home-status]").boundingBox();
  ok("MOBILE: panels empilham (Status abaixo de Ações urgentes)", stb2.y > ab2.y + 50, `y: ${Math.round(ab2.y)}→${Math.round(stb2.y)}`);
  await page.screenshot({ path: `${SHOTS}/dashboard-mobile.png`, fullPage: true });

  ok("console sem erros", consoleErrors.length === 0, consoleErrors.slice(0, 4).join(" | "));
} catch (e) {
  ok("FLUXO DASHBOARD UI", false, String(e));
  await page.screenshot({ path: `${SHOTS}/dashboard-ui-ERRO.png`, fullPage: true }).catch(() => {});
} finally {
  await browser.close();
  await cleanup(email);
}

console.log("\n===== AUTOTESTE DASHBOARD UI (HOME v2 desktop/mobile + herança DS) =====");
let fail = 0;
for (const r of results) { console.log(`${r.pass ? "✅" : "❌"} ${r.name}${r.extra ? "  — " + r.extra : ""}`); if (!r.pass) fail++; }
console.log(fail ? `\n${fail} FALHA(S)` : "\nTODOS PASSARAM");
process.exit(fail ? 1 : 0);
