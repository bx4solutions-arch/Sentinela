// Autoteste — Identidade Visual da empresa (/configuracoes?tab=identidade).
// Prova: form renderiza, salva cor/cabeçalho/assinante, PERSISTE (query company), preview mostra a marca.
import { chromium } from "playwright";
import { mkdirSync, readFileSync } from "node:fs";
const BASE = "http://localhost:3001"; const SHOTS = "e2e/shots"; mkdirSync(SHOTS, { recursive: true });
function readEnv() { const env = {}; for (const line of readFileSync(".env.local", "utf8").split("\n")) { const t = line.trim(); if (t && !t.startsWith("#") && t.includes("=")) { const [k, ...v] = t.split("="); env[k.trim()] = v.join("=").trim().replace(/^['"]|['"]$/g, ""); } } return env; }
const E = readEnv(); const SB = E.SUPABASE_URL.replace(/\/$/, ""); const H = { apikey: E.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${E.SUPABASE_SERVICE_ROLE_KEY}` };
async function adminQuery(sql) { const ref = E.SUPABASE_PROJECT_REF || "ciupgqwsdmmmqpvbtyxx"; const r = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, { method: "POST", headers: { Authorization: `Bearer ${E.SUPABASE_ACCESS_TOKEN}`, "Content-Type": "application/json", "User-Agent": "x" }, body: JSON.stringify({ query: sql }) }); return r.json(); }
async function cleanup(email) { const list = await (await fetch(`${SB}/auth/v1/admin/users`, { headers: H })).json(); for (const u of list.users || []) if (u.email === email && u.email.endsWith("@sentinela.test")) await fetch(`${SB}/auth/v1/admin/users/${u.id}`, { method: "DELETE", headers: H }); }

const email = `qa_ident_${Date.now()}@sentinela.test`;
const MARK = `IDENT QA ${Date.now()}`;
const consoleErrors = []; const results = []; const ok = (n, c, x = "") => results.push({ name: n, pass: !!c, extra: x });
const browser = await chromium.launch(); const page = await browser.newPage();
page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()); });
page.on("pageerror", (e) => consoleErrors.push("pageerror: " + e.message));
try {
  // onboarding (controle-de-pragas SP) — mesma empresa real dos demais testes
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.fill("input[name=email]", email); await page.fill("input[name=password]", "teste123");
  await page.click("button[value=signup]"); await page.waitForURL("**/onboarding", { timeout: 20000 });
  await page.fill("#cnpj", "60701190000104"); await page.click("button:has-text('Consultar')");
  await page.waitForSelector("text=É essa a sua empresa?", { timeout: 25000 }); await page.click("button:has-text('Sim, continuar')");
  await page.waitForSelector("text=Seus nichos", { timeout: 10000 }); await page.getByText("Controle de pragas", { exact: true }).click();
  await page.click("button:has-text('Continuar')"); await page.waitForSelector("text=Certidões de habilitação", { timeout: 10000 });
  await page.click("button:has-text('Concluir')"); await page.waitForURL("**/empresa", { timeout: 20000 });

  // aba Identidade Visual
  await page.goto(`${BASE}/configuracoes?tab=identidade`, { waitUntil: "networkidle" });
  ok("form de identidade renderiza", (await page.locator("[data-testid=identidade-form]").count()) > 0);
  ok("pré-visualização presente", (await page.locator("[data-testid=identidade-preview]").count()) > 0);

  // preenche cabeçalho + assinante; escolhe paleta Azul (#185fa5)
  await page.fill("[data-testid=if-cabecalho1]", MARK);
  await page.fill("[data-testid=if-assinante]", `Assinante ${MARK}`);
  await page.click("button[title='Azul institucional']");
  // preview reflete ao vivo ANTES de salvar (prova que é preview real)
  ok("preview reflete o cabeçalho ao vivo", (await page.locator("[data-testid=identidade-preview]").innerText()).includes(MARK));
  await page.screenshot({ path: `${SHOTS}/identidade.png`, fullPage: true });

  // salva
  await page.click("[data-testid=identidade-salvar]");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(800);

  // PERSISTÊNCIA no banco (company)
  let row = null;
  for (let i = 0; i < 8 && !row; i++) {
    const r = await adminQuery(`select cabecalho_linha1, assinante_padrao_nome, cor_primaria from company c join auth.users u on u.id=c.tenant_id where u.email='${email}';`);
    if (Array.isArray(r) && r[0]?.cabecalho_linha1 === MARK) row = r[0]; else await page.waitForTimeout(700);
  }
  ok("DB: cabeçalho persistido em company", row?.cabecalho_linha1 === MARK, `linha1=${row?.cabecalho_linha1}`);
  ok("DB: assinante persistido", row?.assinante_padrao_nome === `Assinante ${MARK}`, `assinante=${row?.assinante_padrao_nome}`);
  ok("DB: cor primária persistida (paleta Azul)", (row?.cor_primaria || "").toLowerCase() === "#185fa5", `cor=${row?.cor_primaria}`);

  // RELOAD → valores carregam do banco (não só estado da sessão)
  await page.goto(`${BASE}/configuracoes?tab=identidade`, { waitUntil: "networkidle" });
  ok("reload: cabeçalho carrega do banco", (await page.locator("[data-testid=if-cabecalho1]").inputValue()) === MARK);
  ok("reload: preview mostra a marca salva", (await page.locator("[data-testid=identidade-preview]").innerText()).includes(MARK));

  ok("console sem erros", consoleErrors.length === 0, consoleErrors.slice(0, 4).join(" | "));
} catch (e) { ok("FLUXO IDENTIDADE", false, String(e)); await page.screenshot({ path: `${SHOTS}/identidade-ERRO.png`, fullPage: true }).catch(() => {}); }
finally { await browser.close(); await cleanup(email); }
console.log("\n===== AUTOTESTE IDENTIDADE VISUAL =====");
let fail = 0; for (const r of results) { console.log(`${r.pass ? "✅" : "❌"} ${r.name}${r.extra ? "  — " + r.extra : ""}`); if (!r.pass) fail++; }
console.log(fail ? `\n${fail} FALHA(S)` : "\nTODOS PASSARAM"); process.exit(fail ? 1 : 0);
