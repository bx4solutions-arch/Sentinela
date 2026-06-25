// Autoteste E2E do Q3 (Dashboard real). KPIs do banco, sem mock.
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

const email = `qa_dash_${Date.now()}@sentinela.test`;
const consoleErrors = [];
const rechartsWarnings = []; // FIX 4: warning "width(-1)/height(-1)" é console.warn, não error
const RECHARTS_RE = /width\(-1\)|height\(-1\)|of chart should be greater than 0/i;
const results = [];
const ok = (n, c, x = "") => results.push({ name: n, pass: !!c, extra: x });

const browser = await chromium.launch();
const page = await browser.newPage();
page.on("console", (m) => {
  const t = m.text();
  if (m.type() === "error") consoleErrors.push(t);
  if (RECHARTS_RE.test(t)) rechartsWarnings.push(t);
});
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

  // monitora 1 edital (p/ pipeline)
  await page.goto(`${BASE}/radar`, { waitUntil: "networkidle" });
  await page.waitForSelector("text=Sinais do seu recorte", { timeout: 10000 });
  await page.locator("[data-testid=card-monitorar]").first().click();
  await page.waitForSelector("text=Monitorando", { timeout: 10000 });

  // dashboard (layout LicitaPro)
  await page.goto(`${BASE}/dashboard`, { waitUntil: "networkidle" });
  await page.waitForSelector("[data-testid=dashboard-root]", { timeout: 10000 });
  const body = await page.locator("body").innerText();

  // Recorte real do tenant: replica a lógica de escopo da HOME (cidades prontas → IN; senão UF do órgão).
  const prontasRows = await adminQuery("select c.municipio from celula c join cidade_coletada cc on cc.codigo_ibge=c.codigo_ibge where cc.status='pronta';");
  const prontas = (Array.isArray(prontasRows) ? prontasRows : []).map((r) => r.municipio).filter(Boolean);
  let abertosBanco;
  if (prontas.length) {
    const inList = prontas.map((m) => `'${String(m).replace(/'/g, "''")}'`).join(",");
    abertosBanco = (await adminQuery(`select count(*) n from raw_editais where segmentos && array['material-hospitalar'] and cidade in (${inList}) and valor_homologado is null;`))?.[0]?.n;
  } else {
    const ufRow = (await adminQuery(`select uf from company c join auth.users u on u.id=c.tenant_id where u.email='${email}';`))?.[0]?.uf;
    abertosBanco = (await adminQuery(`select count(*) n from raw_editais e join orgao o on o.cnpj=e.cnpj_orgao where e.segmentos && array['material-hospitalar'] and o.uf_sigla='${ufRow}' and e.valor_homologado is null;`))?.[0]?.n;
  }
  abertosBanco = String(abertosBanco ?? "0");

  // 5 KPIs do v2
  ok("HOME v2: 5 KPIs presentes", (await page.locator("[data-testid=home-kpis] .kpi").count()) === 5);
  // KPI 'Oportunidades no Radar' = nº REAL de abertos do recorte (bate com o banco)
  const kpiOport = (await page.locator("[data-testid=kpi-oportunidades-valor]").innerText()).trim();
  ok("HOME: KPI 'Oportunidades no Radar' = abertos do recorte (banco)", kpiOport === abertosBanco, `home=${kpiOport} banco=${abertosBanco}`);
  // KPI 'para decidir' ≥1 após monitorar (real)
  const kpiDecidir = (await page.locator("[data-testid=kpi-decidir-valor]").innerText()).trim();
  ok("HOME: KPI 'Licitações para decidir' ≥ 1 após monitorar", Number(kpiDecidir) >= 1, `decidir=${kpiDecidir}`);

  // Status da empresa = prontidão REAL do cofre (tenant novo, sem certidões → 0%, não forjado)
  const pront = (await page.locator("[data-testid=home-prontidao]").innerText()).trim();
  ok("HOME: prontidão = % real do cofre (tenant novo = 0%, não forjado)", pront === "0%", `prontidao=${pront}`);
  const statusTxt = await page.locator("[data-testid=home-status]").innerText();
  ok("HOME: status mostra Em dia/Vencendo/Vencidos/Não enviados (cofre real)", /Em dia/.test(statusTxt) && /N[ãa]o enviados/.test(statusTxt));

  // Oportunidades recomendadas = cards REAIS do recorte
  const cards = await page.locator("[data-testid=oportunidade-card]").count();
  ok("HOME: oportunidades recomendadas = cards reais do recorte", Number(abertosBanco) > 0 ? cards >= 1 : true, `cards=${cards} abertos=${abertosBanco}`);
  if (cards > 0) {
    const oppTxt = await page.locator("[data-testid=oportunidade-card]").first().innerText();
    ok("HOME: card traz órgão + objeto + valor reais", oppTxt.length > 20 && /R\$|—/.test(oppTxt), oppTxt.replace(/\n/g, " ").slice(0, 70));
    ok("HOME: score rotulado 'estimativa' (não 'chance de ganhar')", /estimativa/i.test(oppTxt) && !/chance de ganhar/i.test(body));
  }
  ok("HOME: SEM banner mock/ilustrativo", !body.includes("ILUSTRATIVOS") && !body.toLowerCase().includes("mock"));
  await page.screenshot({ path: `${SHOTS}/dashboard-01.png`, fullPage: true });

  // RESULTADO: clicar no CARD (corpo) abre a oportunidade no Space
  if (cards > 0) {
    await page.locator("[data-testid=opp-abrir]").first().click();
    await page.waitForURL(/\/licitacao\/[0-9a-f-]+/, { timeout: 15000 });
    ok("HOME: clicar no card abre a oportunidade no Space (/licitacao/:id)", /\/licitacao\/[0-9a-f-]+/.test(page.url()), page.url());
    ok("HOME→Space: Raio-X renderiza após o clique", (await page.locator("[data-testid=raiox-relatorio]").count()) > 0);
  }
  ok("console sem erros", consoleErrors.length === 0, consoleErrors.slice(0, 4).join(" | "));
} catch (e) {
  ok("FLUXO DASHBOARD", false, String(e));
  await page.screenshot({ path: `${SHOTS}/dashboard-ERRO.png`, fullPage: true }).catch(() => {});
} finally {
  await browser.close();
  await cleanup(email);
}

console.log("\n===== AUTOTESTE DASHBOARD (Q3) =====");
let fail = 0;
for (const r of results) { console.log(`${r.pass ? "✅" : "❌"} ${r.name}${r.extra ? "  — " + r.extra : ""}`); if (!r.pass) fail++; }
console.log(fail ? `\n${fail} FALHA(S)` : "\nTODOS PASSARAM");
process.exit(fail ? 1 : 0);
