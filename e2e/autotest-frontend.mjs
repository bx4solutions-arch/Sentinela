// Autoteste PART1 (frontend funcional/visual) + PART2 (seletor de modelo BYOK).
import { chromium } from "playwright";
import { mkdirSync, readFileSync } from "node:fs";
const BASE = "http://localhost:3001"; const SHOTS = "e2e/shots"; mkdirSync(SHOTS, { recursive: true });
function readEnv() { const env = {}; for (const line of readFileSync(".env.local", "utf8").split("\n")) { const t = line.trim(); if (t && !t.startsWith("#") && t.includes("=")) { const [k, ...v] = t.split("="); env[k.trim()] = v.join("=").trim().replace(/^['"]|['"]$/g, ""); } } return env; }
const E = readEnv(); const SB = E.SUPABASE_URL.replace(/\/$/, ""); const H = { apikey: E.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${E.SUPABASE_SERVICE_ROLE_KEY}` };
const ANON = E.NEXT_PUBLIC_SUPABASE_ANON_KEY;
async function adminQuery(sql) { const ref = E.SUPABASE_PROJECT_REF || "ciupgqwsdmmmqpvbtyxx"; const r = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, { method: "POST", headers: { Authorization: `Bearer ${E.SUPABASE_ACCESS_TOKEN}`, "Content-Type": "application/json", "User-Agent": "x" }, body: JSON.stringify({ query: sql }) }); return r.json(); }
async function cleanup(email) { const list = await (await fetch(`${SB}/auth/v1/admin/users`, { headers: H })).json(); for (const u of list.users || []) if (u.email === email && u.email.endsWith("@sentinela.test")) await fetch(`${SB}/auth/v1/admin/users/${u.id}`, { method: "DELETE", headers: H }); }

const email = `qa_front_${Date.now()}@sentinela.test`;
const consoleErrors = []; const results = []; const ok = (n, c, x = "") => results.push({ name: n, pass: !!c, extra: x });
const browser = await chromium.launch(); const page = await browser.newPage();
page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()); });
page.on("pageerror", (e) => consoleErrors.push("pageerror: " + e.message));
try {
  // onboarding SP + nicho controle-de-pragas (mimetiza o caso do Bione em SP)
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.fill("input[name=email]", email); await page.fill("input[name=password]", "teste123");
  await page.click("button[value=signup]"); await page.waitForURL("**/onboarding", { timeout: 20000 });
  await page.fill("#cnpj", "60701190000104"); await page.click("button:has-text('Consultar')");
  await page.waitForSelector("text=É essa a sua empresa?", { timeout: 25000 }); await page.click("button:has-text('Sim, continuar')");
  await page.waitForSelector("text=Seus nichos", { timeout: 10000 }); await page.getByText("Controle de pragas", { exact: true }).click();
  await page.click("button:has-text('Continuar')"); await page.waitForSelector("text=Certidões de habilitação", { timeout: 10000 });
  await page.click("button:has-text('Concluir')"); await page.waitForURL("**/empresa", { timeout: 20000 });

  // PART1: Radar popula por UF (SP)
  await page.goto(`${BASE}/radar`, { waitUntil: "networkidle" });
  await page.waitForSelector("text=Sinais do seu recorte", { timeout: 10000 });
  const cards = await page.locator("form:has-text('Descartar')").count();
  ok("PART1 Radar popula por UF (SP, controle-de-pragas)", cards > 0, `${cards} cards`);
  await page.screenshot({ path: `${SHOTS}/front-01-radar.png`, fullPage: true });
  // clique REAL muda estado (monitorar)
  await page.locator("[data-testid=card-monitorar]").first().click();
  await page.waitForSelector("text=Monitorando", { timeout: 10000 });
  ok("PART1 controle responde (Monitorar→estado muda)", true);

  // PART1: /configuracoes agora é HUB DE ABAS (Perfil da Empresa · Identidade · Base de Conhecimento · IA · Monitoramento).
  await page.goto(`${BASE}/configuracoes`, { waitUntil: "networkidle" });
  const tabsHub = await page.locator("[data-testid=config-tabs]").count();
  const tabIds = await page.locator("[data-testid=tab-perfil-empresa], [data-testid=tab-identidade], [data-testid=tab-conhecimento], [data-testid=tab-ia], [data-testid=tab-monitoramento]").count();
  ok("PART1 /configuracoes é hub de abas (5 abas)", tabsHub > 0 && tabIds === 5, `${tabIds}/5 abas`);
  // aba default = Perfil da Empresa renderiza o MESMO painel de /empresa (dados reais)
  ok("PART1 aba Perfil da Empresa mostra dados reais da empresa", (await page.locator("[data-testid=empresa-painel]").count()) > 0 && (await page.locator("text=Vigia de documentos").count()) > 0);
  await page.screenshot({ path: `${SHOTS}/config-hub.png`, fullPage: true });
  // /empresa continua funcionando (mesmo painel, sem órfã/Frankenstein)
  await page.goto(`${BASE}/empresa`, { waitUntil: "networkidle" });
  ok("PART1 /empresa segue funcionando (mesmo painel extraído)", (await page.locator("[data-testid=empresa-painel]").count()) > 0);

  // PART2: aba IA — IA INCLUSA (chave nossa, server-side), SEM BYOK/sem campo de chave
  await page.goto(`${BASE}/configuracoes?tab=ia`, { waitUntil: "networkidle" });
  ok("PART2 /configuracoes abre a aba IA", (await page.locator("text=Inteligência Artificial").count()) > 0);
  ok("PART2 Configurações = IA inclusa (sem campo de chave / sem BYOK)", (await page.locator("[data-testid=config-ia]").count()) > 0 && (await page.locator("#apiKey").count()) === 0);
  ok("PART2 status da IA exibido", (await page.locator("[data-testid=ia-status-on], [data-testid=ia-status-off]").count()) > 0);
  const cfgHtml = await page.content();
  ok("PART2 chave da IA não vaza no client (HTML da página)", !/sk-svcacct|SENTINELA_AI_KEY/.test(cfgHtml), "config sem segredo no HTML");

  // Pasta: IA inclusa → "Analisar com IA" disponível. NÃO clicamos (evita custo real de IA neste teste).
  await page.goto(`${BASE}/radar`, { waitUntil: "networkidle" });
  await page.locator("button:has-text('Adicionar à análise')").first().click();
  await page.waitForURL(/\/licitacao\/[0-9a-f-]+/, { timeout: 15000 });
  ok("PART2 'Analisar com IA' disponível (IA inclusa, sem BYOK)", await page.locator("button:has-text('Analisar com IA')").first().isEnabled());
  ok("PART2 não há mais 'Ligar IA' (BYOK removido)", (await page.locator("text=Ligar IA").count()) === 0);
  await page.screenshot({ path: `${SHOTS}/front-02-analise.png`, fullPage: true });

  ok("console sem erros", consoleErrors.length === 0, consoleErrors.slice(0, 4).join(" | "));
} catch (e) { ok("FLUXO FRONTEND", false, String(e)); await page.screenshot({ path: `${SHOTS}/front-ERRO.png`, fullPage: true }).catch(() => {}); }
finally { await browser.close(); await cleanup(email); }
console.log("\n===== AUTOTESTE FRONTEND + MODELO (PART1+PART2) =====");
let fail = 0; for (const r of results) { console.log(`${r.pass ? "✅" : "❌"} ${r.name}${r.extra ? "  — " + r.extra : ""}`); if (!r.pass) fail++; }
console.log(fail ? `\n${fail} FALHA(S)` : "\nTODOS PASSARAM"); process.exit(fail ? 1 : 0);
