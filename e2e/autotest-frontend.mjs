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
  await page.locator("button:has-text('Monitorar')").first().click();
  await page.waitForSelector("text=Monitorando", { timeout: 10000 });
  ok("PART1 controle responde (Monitorar→estado muda)", true);

  // PART1: navegação funcional (sem dead-ends)
  await page.goto(`${BASE}/consultor`, { waitUntil: "networkidle" });
  ok("PART1 /consultor abre e funciona", (await page.locator("text=Consultor IA").count()) > 0);
  await page.goto(`${BASE}/configuracoes`, { waitUntil: "networkidle" });
  ok("PART1 /configuracoes abre e funciona", (await page.locator("text=Inteligência Artificial").count()) > 0);

  // PART2: BYOK — salva provedor+modelo+chave (OpenAI fake) e confere cripto/segurança
  await page.selectOption("#provider", "openai");
  await page.selectOption("#model", "gpt-4o-mini");
  await page.fill("#apiKey", "sk-fake-test-CLAROtexto-123");
  await page.click("button:has-text('Salvar configuração')");
  await page.waitForTimeout(1500);
  const enc = await adminQuery(`select provider, model, api_key_encrypted from tenant_ai_config c join auth.users u on u.id=c.tenant_id where u.email='${email}';`);
  ok("PART2 config salva (provider/model)", enc?.[0]?.provider === "openai" && enc?.[0]?.model === "gpt-4o-mini");
  ok("PART2 chave guardada CRIPTOGRAFADA (não texto plano)", !!enc?.[0]?.api_key_encrypted && !String(enc?.[0]?.api_key_encrypted).includes("CLAROtexto"));
  // segurança: anon NÃO lê a config (sem policy)
  const anonRead = await fetch(`${SB}/rest/v1/tenant_ai_config?select=api_key_encrypted`, { headers: { apikey: ANON, Authorization: `Bearer ${ANON}` } });
  const anonRows = anonRead.ok ? await anonRead.json() : [];
  ok("PART2 chave NUNCA exposta ao client (anon bloqueado)", Array.isArray(anonRows) && anonRows.length === 0, `anon rows=${anonRows.length}`);

  // troca p/ mock (roda análise sem custo) e confirma roteamento
  await page.selectOption("#provider", "mock");
  await page.waitForTimeout(200);
  await page.selectOption("#model", "mock-1");
  await page.click("button:has-text('Salvar configuração')");
  await page.waitForTimeout(1200);

  // PART2: Analisar com IA na Pasta
  await page.goto(`${BASE}/radar`, { waitUntil: "networkidle" });
  await page.locator("button:has-text('Adicionar à análise')").first().click();
  await page.waitForURL(/\/licitacao\/[0-9a-f-]+/, { timeout: 15000 });
  ok("PART2 'Analisar com IA' habilitado (IA configurada)", await page.locator("button:has-text('Analisar com IA')").first().isEnabled());
  await page.locator("button:has-text('Analisar com IA')").first().click();
  await page.waitForTimeout(2500); // server action + revalidate
  await page.locator("button[role=tab]:has-text('Resumo')").click();
  await page.waitForSelector("text=Resumo Executivo", { timeout: 15000 });
  await page.waitForSelector("text=Veredito calibrado", { timeout: 10000 });
  const body = await page.locator("body").innerText();
  ok("PART2 parecer renderiza (Resumo+Veredito+disclaimer)", body.includes("Resumo Executivo") && body.includes("Veredito") && body.toLowerCase().includes("não é garantia"));
  const an = await adminQuery(`select modelo from analise a join auth.users u on u.id=a.tenant_id where u.email='${email}';`);
  ok("PART2 roteou pro modelo escolhido (modelo gravado)", an?.[0]?.modelo === "mock:mock-1", `modelo=${an?.[0]?.modelo}`);
  await page.screenshot({ path: `${SHOTS}/front-02-analise.png`, fullPage: true });

  ok("console sem erros", consoleErrors.length === 0, consoleErrors.slice(0, 4).join(" | "));
} catch (e) { ok("FLUXO FRONTEND", false, String(e)); await page.screenshot({ path: `${SHOTS}/front-ERRO.png`, fullPage: true }).catch(() => {}); }
finally { await browser.close(); await cleanup(email); }
console.log("\n===== AUTOTESTE FRONTEND + MODELO (PART1+PART2) =====");
let fail = 0; for (const r of results) { console.log(`${r.pass ? "✅" : "❌"} ${r.name}${r.extra ? "  — " + r.extra : ""}`); if (!r.pass) fail++; }
console.log(fail ? `\n${fail} FALHA(S)` : "\nTODOS PASSARAM"); process.exit(fail ? 1 : 0);
