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
// "verde" = classe/hex de CSS verde (não a palavra em conteúdo real, ex.: cidade "Limeira").
const VERDE_G = /(?:bg|text|border|ring|from|to|via|fill|stroke)-(?:green|emerald|lime)-\d|bg-verde|text-verde|border-verde|#2ecc71|#22c55e|#16a34a|#15803d/gi;

const email = `qa_dashui_${Date.now()}@sentinela.test`;
const consoleErrors = [];
const results = [];
const ok = (n, c, x = "") => results.push({ name: n, pass: !!c, extra: x });
let verdeCount = 0, perfForjado = "";

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

  // ===== DESKTOP =====
  await page.goto(`${BASE}/dashboard`, { waitUntil: "networkidle" });
  await page.waitForSelector("[data-testid=dashboard-root]", { timeout: 10000 });
  const sb = await page.locator("[data-testid=dashboard-score]").boundingBox();
  const pb = await page.locator("[data-testid=dashboard-pipeline]").boundingBox();
  const ab = await page.locator("[data-testid=dashboard-acoes]").boundingBox();
  ok("DESKTOP: layout 3 colunas (Prontidão | Pipeline | Ações lado a lado)", sb.x < pb.x && pb.x < ab.x && Math.abs(sb.y - pb.y) < 240, `x: ${Math.round(sb.x)}/${Math.round(pb.x)}/${Math.round(ab.x)}`);
  ok("DESKTOP: barra de ação mobile OCULTA", !(await page.locator("[data-testid=dashboard-mobile-acao]").isVisible()));

  // honestidade: Pipeline (estimativa real OU em ingestão) e Performance cold-start sem número forjado
  const pipeTxt = await page.locator("[data-testid=dashboard-pipeline]").innerText();
  ok("Pipeline honesto (estimativa real OU 'em ingestão', nunca forjado)", /estimativa/i.test(pipeTxt) || /em ingest[ãa]o/i.test(pipeTxt), pipeTxt.replace(/\n/g, " ").slice(0, 70));
  const perfTxt = await page.locator("[data-testid=dashboard-performance]").innerText();
  const perfNums = perfTxt.replace(/CAPAG/g, "").match(/\d+%|\d+h\d+|R\$\s?\d|\b\d+ dias\b/);
  ok("Performance cold-start SEM número forjado", !perfNums && /preenche com o uso/i.test(perfTxt), perfNums ? `forjado=${perfNums[0]}` : "ok");
  if (perfNums) perfForjado = perfNums[0];
  await page.screenshot({ path: `${SHOTS}/dashboard-desktop.png`, fullPage: true }); // ainda no /dashboard

  // ZERO verde em TODO o app (dashboard + radar + space)
  for (const rota of ["/dashboard", "/radar"]) {
    await page.goto(`${BASE}${rota}`, { waitUntil: "networkidle" });
    const html = await page.content();
    verdeCount += (html.match(VERDE_G) || []).length;
  }

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
  const spaceHtml = await page.content();
  verdeCount += (spaceHtml.match(VERDE_G) || []).length;
  await page.screenshot({ path: `${SHOTS}/space-ds.png`, fullPage: true });

  ok("ZERO verde (classe CSS) em todo o app (dashboard+radar+space)", verdeCount === 0, `matches=${verdeCount}`);

  // ===== MOBILE (resize) =====
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${BASE}/dashboard`, { waitUntil: "networkidle" });
  await page.waitForSelector("[data-testid=dashboard-root]", { timeout: 10000 });
  const sb2 = await page.locator("[data-testid=dashboard-score]").boundingBox();
  const pb2 = await page.locator("[data-testid=dashboard-pipeline]").boundingBox();
  ok("MOBILE: blocos empilham (Pipeline abaixo da Prontidão)", pb2.y > sb2.y + 50, `y: ${Math.round(sb2.y)}→${Math.round(pb2.y)}`);
  ok("MOBILE: barra de ação fixa no rodapé VISÍVEL", await page.locator("[data-testid=dashboard-mobile-acao]").isVisible());
  await page.screenshot({ path: `${SHOTS}/dashboard-mobile.png`, fullPage: true });

  ok("console sem erros", consoleErrors.length === 0, consoleErrors.slice(0, 4).join(" | "));
} catch (e) {
  ok("FLUXO DASHBOARD UI", false, String(e));
  await page.screenshot({ path: `${SHOTS}/dashboard-ui-ERRO.png`, fullPage: true }).catch(() => {});
} finally {
  await browser.close();
  await cleanup(email);
}

console.log("\n===== AUTOTESTE DASHBOARD UI (design system + LicitaPro desktop/mobile) =====");
console.log(`>> contagem de verde (classe CSS): ${verdeCount} · número forjado na Performance: ${perfForjado || "0"}`);
let fail = 0;
for (const r of results) { console.log(`${r.pass ? "✅" : "❌"} ${r.name}${r.extra ? "  — " + r.extra : ""}`); if (!r.pass) fail++; }
console.log(fail ? `\n${fail} FALHA(S)` : "\nTODOS PASSARAM");
process.exit(fail ? 1 : 0);
