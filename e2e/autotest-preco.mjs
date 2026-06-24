// Autoteste E2E — BLOCO 4 / M2: Motor de Preço in-app (faixa saneada + CV semáforo + inexequibilidade).
// Prova o RESULTADO: a aba Inteligência da Sala mostra a faixa (vencedora/segura/agressiva) OU recusa honesta,
// com CV e piso de inexequibilidade; a busca item+cidade mostra a faixa do item.
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

const email = `qa_preco_${Date.now()}@sentinela.test`;
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

  // Sala → Inteligência → motor de preço
  await page.goto(`${BASE}/radar`, { waitUntil: "networkidle" });
  await page.waitForSelector("text=Sinais do seu recorte", { timeout: 10000 });
  await page.locator("[data-testid=card-analisar]").first().click();
  await page.waitForURL(/\/licitacao\/[0-9a-f-]+/, { timeout: 15000 });
  await page.waitForSelector("[data-testid=raiox-relatorio]", { timeout: 15000 });
  await page.waitForTimeout(600);
  const body = await page.locator("body").innerText();
  const temSemaforo = (await page.locator("[data-testid=cv-semaforo]").count()) > 0;
  const temFaixas = (await page.locator("[data-testid=faixas-preco]").count()) > 0;
  const temRecusa = (await page.locator("[data-testid=recusa-honesta]").count()) > 0;
  ok("Motor de preço: CV semáforo presente", temSemaforo);
  ok("Motor de preço: faixa (vencedora/segura/agressiva) OU recusa honesta", temFaixas || temRecusa, `faixas=${temFaixas}, recusa=${temRecusa}`);
  ok("Motor de preço: piso de inexequibilidade citado (Lei 14.133)", /inexequibilidade/i.test(body) && /14\.133/.test(body));
  ok("Motor de preço: NÃO é recomendação (empresa decide)", /empresa decide/i.test(body));

  // se a faixa é confiável, valida a ordem vencedora ≤ segura
  if (temFaixas) {
    const vals = await page.locator("[data-testid=faixas-preco] .font-semibold").allInnerTexts();
    const num = (s) => Number((s || "").replace(/[^\d]/g, "")) || 0;
    const [venc, seg] = [num(vals[0]), num(vals[1])];
    ok("Motor de preço: faixa vencedora ≤ segura (coerência)", venc <= seg, `venc=${venc} seg=${seg}`);
  }
  await page.screenshot({ path: `${SHOTS}/motor-preco-sala.png`, fullPage: true });

  // Pesquisa item+cidade → faixa do item
  await page.goto(`${BASE}/pesquisa?modo=item&q=${encodeURIComponent("medicamento")}&uf=SP`, { waitUntil: "networkidle" });
  await page.waitForSelector("[data-testid=pesquisa-modos]", { timeout: 10000 });
  const temFaixaItem = (await page.locator("[data-testid=faixa-item]").count()) > 0;
  ok("Motor de preço na busca item+cidade (faixa do item)", temFaixaItem);
  await page.screenshot({ path: `${SHOTS}/motor-preco-item.png`, fullPage: true });

  ok("console sem erros", consoleErrors.length === 0, consoleErrors.slice(0, 4).join(" | "));
} catch (e) {
  ok("FLUXO PREÇO", false, String(e));
  await page.screenshot({ path: `${SHOTS}/preco-ERRO.png`, fullPage: true }).catch(() => {});
} finally {
  await browser.close();
  await cleanup(email);
}

console.log("\n===== AUTOTESTE MOTOR DE PREÇO (Bloco 4 / M2) =====");
let fail = 0;
for (const r of results) { console.log(`${r.pass ? "✅" : "❌"} ${r.name}${r.extra ? "  — " + r.extra : ""}`); if (!r.pass) fail++; }
console.log(fail ? `\n${fail} FALHA(S)` : "\nTODOS PASSARAM");
process.exit(fail ? 1 : 0);
