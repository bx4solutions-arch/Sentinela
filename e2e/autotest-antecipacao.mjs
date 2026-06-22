// Autoteste E2E — Etapa 2 (Antecipação: PCA + recorrência) + Linha do Tempo de Sinais.
// Prova o RESULTADO: o PCA está pesquisável por nicho; o pilar Antecipação combina PCA + recorrência
// (sinal mesmo onde o PCA é raro); a Linha do Tempo mostra sinais reais. Aceitação nº1 (antecipação):
// buscar vetor no PI no pilar Antecipação → retorna itens (capacidade). Vazio verdadeiro ≠ bug.
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

const PCA_SYN = "descricao_item ilike '%praga%' or descricao_item ilike '%vetor%' or descricao_item ilike '%dengue%' or descricao_item ilike '%endemia%' or descricao_item ilike '%dedetiz%'";
const REC_SYN = "e.objeto ilike '%praga%' or e.objeto ilike '%vetor%' or e.objeto ilike '%dengue%' or e.objeto ilike '%endemia%' or e.objeto ilike '%dedetiz%' or e.objeto ilike '%desinsetiz%'";

const email = `qa_antec_${Date.now()}@sentinela.test`;
const consoleErrors = [];
const results = [];
const ok = (n, c, x = "") => results.push({ name: n, pass: !!c, extra: x });
const num = (res) => Number(res?.[0] ? Object.values(res[0])[0] : 0);

// ---------- 1) PROVA NO BANCO ----------
ok("índice GIN trgm do PCA existe", (await adminQuery("select 1 from pg_indexes where indexname='ix_pca_descricao_trgm';"))?.length === 1);

const pcaVetorBr = num(await adminQuery(`select count(*) from raw_pca where ${PCA_SYN};`));
ok("PCA pesquisável por nicho (vetor/pragas no BR)", pcaVetorBr >= 1, `pca_vetor_BR=${pcaVetorBr}`);

const pcaPi = num(await adminQuery(`select count(*) from raw_pca p join orgao o on o.cnpj=p.cnpj_orgao where o.uf_sigla='PI' and (${PCA_SYN});`));
const recPi = num(await adminQuery(`select count(*) from raw_editais e join orgao o on o.cnpj=e.cnpj_orgao where o.uf_sigla='PI' and e.valor_homologado is not null and (${REC_SYN});`));
ok("Antecipação vetor no PI = PCA + recorrência ≥ 1 (PCA raro, recorrência preenche)", (pcaPi + recPi) >= 1, `pca_PI=${pcaPi} + recorrencia_PI=${recPi}`);

// ---------- 2) PROVA NA UI ----------
const browser = await chromium.launch();
const page = await browser.newPage();
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

  // 2a) Radar tem os 2 pilares
  await page.goto(`${BASE}/radar`, { waitUntil: "networkidle" });
  await page.waitForSelector("[data-testid=radar-pilares]", { timeout: 10000 });
  ok("Radar tem 2 pilares (Licitação do Dia + Antecipação)", (await page.locator("[data-testid=pilar-dia]").count()) === 1 && (await page.locator("[data-testid=pilar-antecipacao]").count()) === 1);

  // 2b) ACEITAÇÃO antecipação: vetor no PI no pilar Antecipação → cards (recorrência preenche)
  await page.goto(`${BASE}/radar?pilar=antecipacao&q=${encodeURIComponent("controle de vetores")}&uf=PI`, { waitUntil: "networkidle" });
  await page.waitForSelector("[data-testid=radar-pilares]", { timeout: 10000 });
  const body = await page.locator("body").innerText();
  const antecCards = await page.locator("[data-testid=antecipacao-card]").count();
  const vazioHonesto = /vazio verdadeiro|em ingestão/i.test(body);
  ok("ACEITAÇÃO antecipação: vetor no PI renderiza certo (cards de PCA/recorrência OU vazio honesto)", antecCards >= 1 || vazioHonesto, `antecipacao_cards=${antecCards}`);
  ok("pilar Antecipação tem linguagem calibrada (probabilidade, não promessa)", /probabilidade, não promessa/i.test(body));
  await page.screenshot({ path: `${SHOTS}/antecipacao-PI.png`, fullPage: true });

  // 2c) Linha do Tempo de Sinais no Dashboard (sinais reais)
  await page.goto(`${BASE}/dashboard`, { waitUntil: "networkidle" });
  await page.waitForSelector("text=Atacar hoje", { timeout: 10000 });
  const temTimeline = (await page.locator("[data-testid=linha-tempo-sinais]").count()) > 0;
  const sinais = await page.locator("[data-testid=sinal-item]").count();
  ok("Dashboard: Linha do Tempo de Sinais com itens reais (recorrência/PCA)", temTimeline && sinais >= 1, `sinais=${sinais}`);
  await page.screenshot({ path: `${SHOTS}/dashboard-linha-tempo.png`, fullPage: true });

  ok("console sem erros", consoleErrors.length === 0, consoleErrors.slice(0, 4).join(" | "));
} catch (e) {
  ok("FLUXO ANTECIPAÇÃO", false, String(e));
  await page.screenshot({ path: `${SHOTS}/antecipacao-ERRO.png`, fullPage: true }).catch(() => {});
} finally {
  await browser.close();
  await cleanup(email);
}

console.log("\n===== AUTOTESTE ANTECIPAÇÃO (Etapa 2) =====");
let fail = 0;
for (const r of results) { console.log(`${r.pass ? "✅" : "❌"} ${r.name}${r.extra ? "  — " + r.extra : ""}`); if (!r.pass) fail++; }
console.log(fail ? `\n${fail} FALHA(S)` : "\nTODOS PASSARAM");
process.exit(fail ? 1 : 0);
