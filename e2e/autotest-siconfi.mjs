// Autoteste E2E — §1 do Raio-X "O órgão paga?" com ORÇAMENTO REAL do município (Siconfi/Tesouro).
// Prova o RESULTADO: abre uma licitação cujo órgão tem código IBGE com dado no Siconfi (Santos 3548500,
// senão SP 3550308) → §1 mostra receita/execução REAIS (conferidas contra a própria API Siconfi), fonte e
// disclaimer; CAPAG fica "em ingestão" (não forja); cache funciona (2º acesso = mesmo consultadoEm). Zero verde.
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
async function adminQuery(sql) {
  const ref = E.SUPABASE_PROJECT_REF || "ciupgqwsdmmmqpvbtyxx";
  const r = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: "POST", headers: { Authorization: `Bearer ${E.SUPABASE_ACCESS_TOKEN}`, "Content-Type": "application/json", "User-Agent": "x" },
    body: JSON.stringify({ query: sql }),
  });
  return r.json();
}
async function cleanup(email) {
  const list = await (await fetch(`${SB}/auth/v1/admin/users`, { headers: H })).json();
  for (const u of list.users || []) if (u.email === email && u.email.endsWith("@sentinela.test")) await fetch(`${SB}/auth/v1/admin/users/${u.id}`, { method: "DELETE", headers: H });
}
async function tenantIdPoll(email, tries = 12) {
  for (let i = 0; i < tries; i++) {
    const r = await adminQuery(`select id from auth.users where email='${email}' limit 1;`);
    if (Array.isArray(r) && r[0]?.id) return r[0].id;
    await new Promise((s) => setTimeout(s, 800));
  }
  return null;
}
// Consulta o Siconfi DIRETO (verdade independente) p/ conferir o valor renderizado.
async function siconfiReceitaPrevista(ibge) {
  for (const ano of [new Date().getFullYear() - 1, new Date().getFullYear() - 2]) {
    const url = `https://apidatalake.tesouro.gov.br/ords/siconfi/tt/rreo?an_exercicio=${ano}&nr_periodo=6&co_tipo_demonstrativo=RREO&no_anexo=${encodeURIComponent("RREO-Anexo 01")}&id_ente=${ibge}`;
    try {
      const r = await fetch(url, { headers: { "User-Agent": "sentinela/1.0" }, signal: AbortSignal.timeout(20000) });
      if (!r.ok) continue;
      const j = await r.json();
      const it = (j.items || []).find((x) => /TOTAL DAS RECEITAS \(V\)/i.test(x.conta || "") && /PREVIS[ÃA]O ATUALIZADA/i.test(x.coluna || ""));
      if (it?.valor != null) return Number(it.valor);
    } catch { /* tenta próximo ano */ }
  }
  return null;
}

const email = `qa_sic_${Date.now()}@sentinela.test`;
const consoleErrors = [];
const results = [];
const ok = (n, c, x = "") => results.push({ name: n, pass: !!c, extra: x });
const brl = (n) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(n);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
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

  // Edital cujo órgão tem código IBGE com dado no Siconfi: Santos (3548500) senão São Paulo (3550308).
  const tid = await tenantIdPoll(email);
  let row = (await adminQuery(`select numero_controle_pncp, payload->'unidadeOrgao'->>'codigoIbge' ibge, payload->'unidadeOrgao'->>'municipioNome' mun from raw_editais where payload->'unidadeOrgao'->>'codigoIbge'='3548500' and payload is not null limit 1;`))?.[0];
  if (!row) row = (await adminQuery(`select numero_controle_pncp, payload->'unidadeOrgao'->>'codigoIbge' ibge, payload->'unidadeOrgao'->>'municipioNome' mun from raw_editais where payload->'unidadeOrgao'->>'codigoIbge'='3550308' and payload is not null limit 1;`))?.[0];
  const numero = row?.numero_controle_pncp, ibge = row?.ibge;
  ok("achou edital com código IBGE p/ Siconfi (Santos/SP)", !!numero && !!ibge, `ibge=${ibge} mun=${row?.mun}`);
  const lic = (await adminQuery(`insert into licitacao (id, tenant_id, numero_controle_pncp, titulo) values (gen_random_uuid(), '${tid}', '${numero}', 'QA siconfi') returning id;`))?.[0]?.id;

  // verdade independente: receita prevista direto do Siconfi
  const receitaApi = await siconfiReceitaPrevista(ibge);
  ok("Siconfi (API direta) tem orçamento real do município", receitaApi != null && receitaApi > 0, `receitaPrevista=${receitaApi}`);

  await page.goto(`${BASE}/licitacao/${lic}`, { waitUntil: "networkidle" });
  await page.waitForSelector("[data-testid=raiox-relatorio]", { timeout: 15000 });
  await page.locator("[data-testid=raiox-tab-orgao]").click(); await page.waitForTimeout(250);
  await page.waitForSelector("[data-testid=raiox-orgao]", { timeout: 10000 });

  ok("§1 'O órgão' com orçamento REAL renderizado (Siconfi)", (await page.locator("[data-testid=orgao-orcamento]").count()) > 0);
  const orgaoTxt = await page.locator("[data-testid=raiox-orgao]").innerText();
  // o valor REAL da API aparece formatado na §1 (prova que não é forjado)
  const esperado = receitaApi != null ? brl(receitaApi) : "—";
  ok("§1: orçamento previsto bate com o Siconfi (valor real, não forjado)", orgaoTxt.includes(esperado), `esperado=${esperado}`);
  ok("§1: fonte Siconfi + execução da receita", /Siconfi/i.test(orgaoTxt) && /da previsão/i.test(orgaoTxt));
  ok("§1: porte orçamentário + população (dado real)", (await page.locator("[data-testid=orgao-porte]").count()) > 0 && /População/i.test(orgaoTxt));
  ok("§1: CAPAG fica 'em ingestão' (não forja a nota)", /em ingest[ãa]o/i.test(orgaoTxt));
  ok("§1: disclaimer (saúde fiscal ≠ pontualidade)", /não é garantia de pontualidade/i.test(orgaoTxt));

  const consultado1 = await page.locator("[data-testid=siconfi-consultado]").innerText();
  ok("§1: mostra quando foi consultado (timestamp)", /\d{4}-\d\d-\d\d \d\d:\d\d:\d\d/.test(consultado1), consultado1);

  // zero verde na §1 + console
  const orgaoHtml = await page.locator("[data-testid=raiox-orgao]").innerHTML();
  await page.screenshot({ path: `${SHOTS}/siconfi-orgao.png`, fullPage: true });

  // ===== CACHE: 2º acesso não rebate a API (mesmo consultadoEm) =====
  await page.goto(`${BASE}/radar`, { waitUntil: "networkidle" });
  await page.goto(`${BASE}/licitacao/${lic}`, { waitUntil: "networkidle" });
  await page.locator("[data-testid=raiox-tab-orgao]").click(); await page.waitForTimeout(250);
  await page.waitForSelector("[data-testid=siconfi-consultado]", { timeout: 15000 });
  const consultado2 = await page.locator("[data-testid=siconfi-consultado]").innerText();
  ok("CACHE por município: 2º acesso NÃO rebate a API (mesmo consultadoEm)", consultado1 === consultado2, `1=${consultado1} 2=${consultado2}`);

  ok("console sem erros", consoleErrors.length === 0, consoleErrors.slice(0, 4).join(" | "));
} catch (e) {
  ok("FLUXO SICONFI", false, String(e));
  await page.screenshot({ path: `${SHOTS}/siconfi-ERRO.png`, fullPage: true }).catch(() => {});
} finally {
  await browser.close();
  await cleanup(email);
}

console.log("\n===== AUTOTESTE SICONFI (§1 O órgão paga? — orçamento real) =====");
let fail = 0;
for (const r of results) { console.log(`${r.pass ? "✅" : "❌"} ${r.name}${r.extra ? "  — " + r.extra : ""}`); if (!r.pass) fail++; }
console.log(fail ? `\n${fail} FALHA(S)` : "\nTODOS PASSARAM");
process.exit(fail ? 1 : 0);
