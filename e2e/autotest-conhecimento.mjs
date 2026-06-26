// Autoteste — Base de Conhecimento jurídica (/configuracoes?tab=conhecimento).
// Prova: 18 artigos da Lei 14.133 seedados; aba renderiza; busca "termo de referência"
// retorna o Art. 6º XXVI; estado honesto de embedding (textual enquanto não há backfill).
import { chromium } from "playwright";
import { mkdirSync, readFileSync } from "node:fs";
const BASE = "http://localhost:3001"; const SHOTS = "e2e/shots"; mkdirSync(SHOTS, { recursive: true });
function readEnv() { const env = {}; for (const line of readFileSync(".env.local", "utf8").split("\n")) { const t = line.trim(); if (t && !t.startsWith("#") && t.includes("=")) { const [k, ...v] = t.split("="); env[k.trim()] = v.join("=").trim().replace(/^['"]|['"]$/g, ""); } } return env; }
const E = readEnv(); const SB = E.SUPABASE_URL.replace(/\/$/, ""); const H = { apikey: E.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${E.SUPABASE_SERVICE_ROLE_KEY}` };
async function adminQuery(sql) { const ref = E.SUPABASE_PROJECT_REF || "ciupgqwsdmmmqpvbtyxx"; const r = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, { method: "POST", headers: { Authorization: `Bearer ${E.SUPABASE_ACCESS_TOKEN}`, "Content-Type": "application/json", "User-Agent": "x" }, body: JSON.stringify({ query: sql }) }); return r.json(); }
async function cleanup(email) { const list = await (await fetch(`${SB}/auth/v1/admin/users`, { headers: H })).json(); for (const u of list.users || []) if (u.email === email && u.email.endsWith("@sentinela.test")) await fetch(`${SB}/auth/v1/admin/users/${u.id}`, { method: "DELETE", headers: H }); }

const email = `qa_conhec_${Date.now()}@sentinela.test`;
const consoleErrors = []; const results = []; const ok = (n, c, x = "") => results.push({ name: n, pass: !!c, extra: x });
const browser = await chromium.launch(); const page = await browser.newPage();
page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()); });
page.on("pageerror", (e) => consoleErrors.push("pageerror: " + e.message));
try {
  // DB: 18 artigos da Lei 14.133 seedados
  const seed = await adminQuery("select count(*)::int n from lexia_corpus where source='lei_federal' and type='artigo';");
  ok("DB: 18 artigos da Lei 14.133 seedados", Array.isArray(seed) && seed[0]?.n === 18, `n=${seed?.[0]?.n}`);
  // DB: embeddings (0 agora; >0 quando o backfill for autorizado)
  const emb = await adminQuery("select count(embedding)::int n from lexia_corpus;");
  const nEmb = Array.isArray(emb) ? emb[0]?.n : null;
  ok("DB: embeddings consistentes (0 = backfill pendente, honesto)", typeof nEmb === "number", `embeddings=${nEmb}`);

  // onboarding (autenticar p/ ler lexia_corpus via RLS)
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.fill("input[name=email]", email); await page.fill("input[name=password]", "teste123");
  await page.click("button[value=signup]"); await page.waitForURL("**/onboarding", { timeout: 20000 });
  await page.fill("#cnpj", "60701190000104"); await page.click("button:has-text('Consultar')");
  await page.waitForSelector("text=É essa a sua empresa?", { timeout: 25000 }); await page.click("button:has-text('Sim, continuar')");
  await page.waitForSelector("text=Seus nichos", { timeout: 10000 }); await page.getByText("Controle de pragas", { exact: true }).click();
  await page.click("button:has-text('Continuar')"); await page.waitForSelector("text=Certidões de habilitação", { timeout: 10000 });
  await page.click("button:has-text('Concluir')"); await page.waitForURL("**/empresa", { timeout: 20000 });

  // aba Base de Conhecimento renderiza
  await page.goto(`${BASE}/configuracoes?tab=conhecimento`, { waitUntil: "networkidle" });
  ok("aba conhecimento renderiza", (await page.locator("[data-testid=conhecimento-aba]").count()) > 0);
  ok("KPI mostra a base (itens > 0)", /\b18\b/.test(await page.locator("[data-testid=conhecimento-aba]").innerText()));
  // estado honesto: busca textual (sem embeddings ainda)
  const modo = await page.locator("[data-testid=kb-modo]").innerText();
  ok("estado honesto: busca textual (embedding pendente)", nEmb > 0 ? /semântica/i.test(modo) : /textual/i.test(modo), modo.trim());
  ok("lista as normas indexadas", (await page.locator("[data-testid=kb-fontes]").count()) > 0);

  // busca "termo de referência" → Art. 6º XXVI
  await page.goto(`${BASE}/configuracoes?tab=conhecimento&kq=${encodeURIComponent("termo de referência")}`, { waitUntil: "networkidle" });
  const resultado = await page.locator("[data-testid=kb-resultado]").innerText();
  ok("busca 'termo de referência' retorna o Art. 6º XXVI", /Termo de Referência/i.test(resultado) && /XXVI/.test(resultado), resultado.slice(0, 80));
  await page.screenshot({ path: `${SHOTS}/conhecimento.png`, fullPage: true });

  ok("console sem erros", consoleErrors.length === 0, consoleErrors.slice(0, 4).join(" | "));
} catch (e) { ok("FLUXO CONHECIMENTO", false, String(e)); await page.screenshot({ path: `${SHOTS}/conhecimento-ERRO.png`, fullPage: true }).catch(() => {}); }
finally { await browser.close(); await cleanup(email); }
console.log("\n===== AUTOTESTE BASE DE CONHECIMENTO =====");
let fail = 0; for (const r of results) { console.log(`${r.pass ? "✅" : "❌"} ${r.name}${r.extra ? "  — " + r.extra : ""}`); if (!r.pass) fail++; }
console.log(fail ? `\n${fail} FALHA(S)` : "\nTODOS PASSARAM"); process.exit(fail ? 1 : 0);
