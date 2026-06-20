// Tour em prints: Radar, Configurações (BYOK), Pasta Inteligente com análise.
import { chromium } from "playwright";
import { mkdirSync, readFileSync } from "node:fs";
const BASE = "http://localhost:3001"; const SHOTS = "e2e/shots"; mkdirSync(SHOTS, { recursive: true });
function readEnv() { const env = {}; for (const line of readFileSync(".env.local", "utf8").split("\n")) { const t = line.trim(); if (t && !t.startsWith("#") && t.includes("=")) { const [k, ...v] = t.split("="); env[k.trim()] = v.join("=").trim().replace(/^['"]|['"]$/g, ""); } } return env; }
const E = readEnv(); const SB = E.SUPABASE_URL.replace(/\/$/, ""); const H = { apikey: E.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${E.SUPABASE_SERVICE_ROLE_KEY}` };
async function cleanup(email) { const list = await (await fetch(`${SB}/auth/v1/admin/users`, { headers: H })).json(); for (const u of list.users || []) if (u.email === email && u.email.endsWith("@sentinela.test")) await fetch(`${SB}/auth/v1/admin/users/${u.id}`, { method: "DELETE", headers: H }); }
const email = `qa_tour_${Date.now()}@sentinela.test`;
const browser = await chromium.launch(); const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
try {
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.fill("input[name=email]", email); await page.fill("input[name=password]", "teste123");
  await page.click("button[value=signup]"); await page.waitForURL("**/onboarding", { timeout: 20000 });
  await page.fill("#cnpj", "60701190000104"); await page.click("button:has-text('Consultar')");
  await page.waitForSelector("text=É essa a sua empresa?", { timeout: 25000 }); await page.click("button:has-text('Sim, continuar')");
  await page.waitForSelector("text=Seus nichos", { timeout: 10000 }); await page.getByText("Controle de pragas", { exact: true }).click();
  await page.click("button:has-text('Continuar')"); await page.waitForSelector("text=Certidões de habilitação", { timeout: 10000 });
  await page.click("button:has-text('Concluir')"); await page.waitForURL("**/empresa", { timeout: 20000 });

  // 1) RADAR
  await page.goto(`${BASE}/radar`, { waitUntil: "networkidle" });
  await page.waitForSelector("text=Sinais do seu recorte", { timeout: 10000 });
  await page.screenshot({ path: `${SHOTS}/TOUR-1-radar.png` });

  // 2) CONFIGURAÇÕES (BYOK) — mostra o seletor (OpenAI + modelo + chave)
  await page.goto(`${BASE}/configuracoes`, { waitUntil: "networkidle" });
  await page.waitForSelector("text=Inteligência Artificial", { timeout: 10000 });
  await page.selectOption("#provider", "openai");
  await page.selectOption("#model", "gpt-4o-mini");
  await page.fill("#apiKey", "sk-••••••••••••••••");
  await page.screenshot({ path: `${SHOTS}/TOUR-2-configuracoes.png` });
  // configura mock p/ a análise rodar sem custo
  await page.selectOption("#provider", "mock"); await page.waitForTimeout(200);
  await page.selectOption("#model", "mock-1"); await page.fill("#apiKey", "");
  await page.click("button:has-text('Salvar configuração')"); await page.waitForTimeout(1200);

  // 3) PASTA INTELIGENTE com Analisar com IA
  await page.goto(`${BASE}/radar`, { waitUntil: "networkidle" });
  await page.locator("button:has-text('Adicionar à análise')").first().click();
  await page.waitForURL(/\/licitacao\/[0-9a-f-]+/, { timeout: 15000 });
  await page.locator("button:has-text('Analisar com IA')").first().click();
  await page.waitForTimeout(2500);
  await page.locator("button[role=tab]:has-text('Resumo')").click();
  await page.waitForSelector("text=Veredito calibrado", { timeout: 12000 });
  await page.screenshot({ path: `${SHOTS}/TOUR-3-pasta.png`, fullPage: true });
  console.log("TOUR OK");
} catch (e) { console.log("TOUR ERRO:", String(e)); }
finally { await browser.close(); await cleanup(email); }
