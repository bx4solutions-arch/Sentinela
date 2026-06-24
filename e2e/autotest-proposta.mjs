// Autoteste E2E — BLOCO 6: Gerente de Participação (gerador seccionado + matriz + DOCX real).
// Prova o RESULTADO: montar a proposta seção por seção (confirmar) e EXPORTAR DOCX (download .docx);
// a Matriz de Atendimento liga item→evidência. Peça processual travada (gate).
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

const email = `qa_prop_${Date.now()}@sentinela.test`;
const consoleErrors = [];
const results = [];
const ok = (n, c, x = "") => results.push({ name: n, pass: !!c, extra: x });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
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

  await page.goto(`${BASE}/radar`, { waitUntil: "networkidle" });
  await page.waitForSelector("text=Sinais do seu recorte", { timeout: 10000 });
  await page.locator("[data-testid=card-analisar]").first().click();
  await page.waitForURL(/\/licitacao\/[0-9a-f-]+/, { timeout: 15000 });
  await page.waitForSelector("[data-testid=raiox-relatorio]", { timeout: 15000 });
  await page.waitForTimeout(500);

  ok("Gerador de Proposta presente", (await page.locator("[data-testid=proposta-gerador]").count()) > 0);
  const secoes = await page.locator("[data-testid=secao-proposta]").count();
  ok("Proposta montada por SEÇÕES (pré-preenchidas)", secoes >= 4, `seções=${secoes}`);
  ok("Matriz de atendimento (item → evidência) presente", (await page.locator("[data-testid=matriz-atendimento]").count()) > 0);

  // confirmar/des-confirmar uma seção (interação real)
  await page.locator("[data-testid=confirmar-secao]").first().click();
  // preço definido pela empresa
  await page.locator("[data-testid=input-preco]").fill("R$ 120.000,00");

  // EXPORTAR DOCX — captura o download real
  const [download] = await Promise.all([
    page.waitForEvent("download", { timeout: 15000 }),
    page.locator("[data-testid=gerar-docx]").click(),
  ]);
  const fn = download.suggestedFilename();
  ok("EXPORTA DOCX real (download .docx)", fn.endsWith(".docx"), `arquivo=${fn}`);
  const path = await download.path();
  ok("DOCX tem conteúdo (arquivo salvo)", !!path);
  ok("confirmação 'DOCX gerado' na UI", (await page.locator("[data-testid=docx-gerado]").count()) > 0);

  const body = await page.locator("body").innerText();
  ok("Gate jurídico: peça processual travada + revisar antes de protocolar", /travado|travados/i.test(body) && /revise antes de protocolar/i.test(body));
  await page.screenshot({ path: `${SHOTS}/proposta-gerador.png`, fullPage: true });

  ok("console sem erros", consoleErrors.length === 0, consoleErrors.slice(0, 4).join(" | "));
} catch (e) {
  ok("FLUXO PROPOSTA", false, String(e));
  await page.screenshot({ path: `${SHOTS}/proposta-ERRO.png`, fullPage: true }).catch(() => {});
} finally {
  await browser.close();
  await cleanup(email);
}

console.log("\n===== AUTOTESTE GERADOR DE PROPOSTA (Bloco 6) =====");
let fail = 0;
for (const r of results) { console.log(`${r.pass ? "✅" : "❌"} ${r.name}${r.extra ? "  — " + r.extra : ""}`); if (!r.pass) fail++; }
console.log(fail ? `\n${fail} FALHA(S)` : "\nTODOS PASSARAM");
process.exit(fail ? 1 : 0);
