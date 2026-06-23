// Autoteste E2E — BLOCO 3: Pesquisa livre (concorrente por CNPJ · órgão · item+cidade).
// Prova o RESULTADO: digitar CNPJ → vida do concorrente real (vitórias/órgãos); órgão → suas licitações;
// item+cidade → editais reais.
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
async function adminQuery(sql) {
  const ref = E.SUPABASE_PROJECT_REF || "ciupgqwsdmmmqpvbtyxx";
  const r = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, { method: "POST", headers: { Authorization: `Bearer ${E.SUPABASE_ACCESS_TOKEN}`, "Content-Type": "application/json", "User-Agent": "x" }, body: JSON.stringify({ query: sql }) });
  return r.json();
}
async function cleanup(email) {
  const list = await (await fetch(`${SB}/auth/v1/admin/users`, { headers: H })).json();
  for (const u of list.users || []) if (u.email === email && u.email.endsWith("@sentinela.test")) await fetch(`${SB}/auth/v1/admin/users/${u.id}`, { method: "DELETE", headers: H });
}

const email = `qa_pesq_${Date.now()}@sentinela.test`;
const consoleErrors = [];
const results = [];
const ok = (n, c, x = "") => results.push({ name: n, pass: !!c, extra: x });

// cenários dinâmicos (dado real)
const forn = (await adminQuery("select ni_fornecedor, nome_fornecedor from contratos where tipo_pessoa='PJ' and ni_fornecedor is not null group by ni_fornecedor, nome_fornecedor order by count(*) desc limit 1;"))?.[0];
const cnpjConc = forn?.ni_fornecedor;
const orgao = (await adminQuery("select cnpj, razao_social from orgao where n_editais > 0 order by n_editais desc limit 1;"))?.[0];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()); });
page.on("pageerror", (e) => consoleErrors.push("pageerror: " + e.message));
try {
  // onboarding (o shell exige company)
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

  // C3 — vida do concorrente (CNPJ)
  await page.goto(`${BASE}/pesquisa?modo=concorrente&cnpj=${cnpjConc}`, { waitUntil: "networkidle" });
  await page.waitForSelector("[data-testid=pesquisa-modos]", { timeout: 10000 });
  const temVida = (await page.locator("[data-testid=vida-concorrente]").count()) > 0;
  const temOrgaos = (await page.locator("[data-testid=orgaos-atua]").count()) > 0;
  ok("C3: CNPJ → vida do concorrente real (vitórias + órgãos onde atua)", temVida && temOrgaos, `cnpj=${cnpjConc} (${forn?.nome_fornecedor?.slice(0, 30)})`);
  await page.screenshot({ path: `${SHOTS}/pesquisa-concorrente.png`, fullPage: true });

  // C1 — órgão → suas licitações
  await page.goto(`${BASE}/pesquisa?modo=orgao&q=${encodeURIComponent(orgao?.cnpj ?? "")}`, { waitUntil: "networkidle" });
  await page.waitForSelector("[data-testid=pesquisa-modos]", { timeout: 10000 });
  const temPerfil = (await page.locator("[data-testid=perfil-orgao]").count()) > 0;
  ok("C1: órgão → perfil + suas licitações", temPerfil, `orgao=${orgao?.razao_social?.slice(0, 30)}`);
  await page.screenshot({ path: `${SHOTS}/pesquisa-orgao.png`, fullPage: true });

  // C2 — item + cidade (reusa trigram); SP costuma ter medicamento
  await page.goto(`${BASE}/pesquisa?modo=item&q=${encodeURIComponent("medicamento")}&uf=SP`, { waitUntil: "networkidle" });
  await page.waitForSelector("[data-testid=pesquisa-modos]", { timeout: 10000 });
  const body = await page.locator("body").innerText();
  const temItens = (await page.locator("[data-testid=item-achados]").count()) > 0;
  ok("C2: item+cidade → editais reais (ou vazio honesto)", temItens || /vazio verdadeiro/i.test(body), `achados=${temItens}`);
  await page.screenshot({ path: `${SHOTS}/pesquisa-item.png`, fullPage: true });

  ok("console sem erros", consoleErrors.length === 0, consoleErrors.slice(0, 4).join(" | "));
} catch (e) {
  ok("FLUXO PESQUISA", false, String(e));
  await page.screenshot({ path: `${SHOTS}/pesquisa-ERRO.png`, fullPage: true }).catch(() => {});
} finally {
  await browser.close();
  await cleanup(email);
}

console.log("\n===== AUTOTESTE PESQUISA LIVRE (Bloco 3) =====");
let fail = 0;
for (const r of results) { console.log(`${r.pass ? "✅" : "❌"} ${r.name}${r.extra ? "  — " + r.extra : ""}`); if (!r.pass) fail++; }
console.log(fail ? `\n${fail} FALHA(S)` : "\nTODOS PASSARAM");
process.exit(fail ? 1 : 0);
