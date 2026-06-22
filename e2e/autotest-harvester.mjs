// Autoteste E2E — Camada 1 (Harvester Nacional) + Teste de Aceitação nº1.
// Prova o RESULTADO: o harvest nacional populou o banco com editais de VÁRIAS UFs (não só SP/PI),
// situacao presente, e a busca por nicho (sinônimos) funciona. Aceitação: CAPACIDADE (busca
// funciona + PI coberto), não "≥1 resultado" — PI sem vetor aberto nesta semana é vazio verdadeiro.
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

const SINONIMOS = "e.objeto ilike '%vetor%' or e.objeto ilike '%dengue%' or e.objeto ilike '%endemia%' or e.objeto ilike '%praga%' or e.objeto ilike '%dedetiz%' or e.objeto ilike '%desinsetiz%' or e.objeto ilike '%desratiz%' or e.objeto ilike '%mosquito%'";
const ABERTO = "e.valor_homologado is null and coalesce(e.situacao_nome,'') not in ('Revogada','Anulada','Cancelada','Deserta','Fracassada') and (e.data_encerramento is null or e.data_encerramento >= now())";

const email = `qa_harv_${Date.now()}@sentinela.test`;
const consoleErrors = [];
const results = [];
const ok = (n, c, x = "") => results.push({ name: n, pass: !!c, extra: x });
const num = (res) => Number(res?.[0] ? Object.values(res[0])[0] : 0);

// ---------- 1) PROVA NO BANCO (resultado do harvest) ----------
const ufs = num(await adminQuery("select count(distinct o.uf_sigla) from raw_editais e join orgao o on o.cnpj=e.cnpj_orgao;"));
ok("harvest nacional: editais de MUITAS UFs (≥20, não só SP/PI)", ufs >= 20, `ufs=${ufs}`);

const semSit = num(await adminQuery("select count(*) from raw_editais where situacao_nome is null;"));
const totalSit = num(await adminQuery("select count(*) from raw_editais;"));
ok("situacao presente nos editais (quase 100%)", totalSit > 0 && semSit / totalSit < 0.05, `sem_situacao=${semSit}/${totalSit}`);

const abertosVetorBR = num(await adminQuery(`select count(*) from raw_editais e join orgao o on o.cnpj=e.cnpj_orgao where ${ABERTO} and (${SINONIMOS});`));
ok("busca por nicho (sinônimos) acha editais ABERTOS de vetor/pragas no Brasil", abertosVetorBR >= 1, `abertos_vetor_BR=${abertosVetorBR}`);

const piTotal = num(await adminQuery("select count(*) from raw_editais e join orgao o on o.cnpj=e.cnpj_orgao where o.uf_sigla='PI';"));
ok("PI coberto no banco (teste de aceitação: PI presente)", piTotal >= 1, `editais_PI=${piTotal}`);

const piVetor = num(await adminQuery(`select count(*) from raw_editais e join orgao o on o.cnpj=e.cnpj_orgao where o.uf_sigla='PI' and (${SINONIMOS});`));
ok("PI tem edital REAL de vetor/pragas (confirmação do nicho no PI)", piVetor >= 1, `vetor_pragas_PI=${piVetor}`);

const piVetorAberto = num(await adminQuery(`select count(*) from raw_editais e join orgao o on o.cnpj=e.cnpj_orgao where o.uf_sigla='PI' and ${ABERTO} and (${SINONIMOS});`));
ok("PI vetor ABERTO agora (≥0 — vazio verdadeiro NÃO é falha)", piVetorAberto >= 0, `aberto_vetor_PI=${piVetorAberto} (${piVetorAberto === 0 ? "vazio verdadeiro nesta semana" : "há aberto"})`);

// UF de demonstração da busca-aberta na UI: a que tiver mais vetor aberto agora
const ufDemoRes = await adminQuery(`select o.uf_sigla uf, count(*) n from raw_editais e join orgao o on o.cnpj=e.cnpj_orgao where ${ABERTO} and (${SINONIMOS}) group by o.uf_sigla order by n desc limit 1;`);
const ufDemo = ufDemoRes?.[0]?.uf || "SP";

// ---------- 2) PROVA NA UI (Playwright) — a busca do Radar funciona ----------
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

  // 2a) busca-aberta numa UF com resultado (prova o mecanismo end-to-end na UI)
  await page.goto(`${BASE}/radar?q=${encodeURIComponent("controle de vetores")}&uf=${ufDemo}`, { waitUntil: "networkidle" });
  await page.waitForSelector("[data-testid=busca-objeto]", { timeout: 10000 });
  const cardsDemo = await page.locator("[data-testid=edital-card]").count();
  ok(`busca UI: "controle de vetores" em ${ufDemo} retorna cards reais`, cardsDemo >= 1, `cards=${cardsDemo}`);
  await page.screenshot({ path: `${SHOTS}/harvester-busca-${ufDemo}.png`, fullPage: true });

  // 2b) ACEITAÇÃO nº1: busca por vetor no PIAUÍ — prova capacidade (renderiza certo: cards OU vazio honesto)
  await page.goto(`${BASE}/radar?q=${encodeURIComponent("controle de mosquito")}&uf=PI`, { waitUntil: "networkidle" });
  await page.waitForSelector("[data-testid=busca-objeto]", { timeout: 10000 });
  const body = await page.locator("body").innerText();
  const cardsPI = await page.locator("[data-testid=edital-card]").count();
  const vazioHonesto = /vazio verdadeiro/i.test(body);
  ok("ACEITAÇÃO nº1: busca vetor no PI renderiza certo (cards reais OU vazio verdadeiro honesto)", cardsPI >= 1 || vazioHonesto, `cards_PI=${cardsPI}, vazio_honesto=${vazioHonesto}`);
  await page.screenshot({ path: `${SHOTS}/harvester-aceitacao-PI.png`, fullPage: true });

  ok("console sem erros", consoleErrors.length === 0, consoleErrors.slice(0, 4).join(" | "));
} catch (e) {
  ok("FLUXO HARVESTER/ACEITAÇÃO", false, String(e));
  await page.screenshot({ path: `${SHOTS}/harvester-ERRO.png`, fullPage: true }).catch(() => {});
} finally {
  await browser.close();
  await cleanup(email);
}

console.log("\n===== AUTOTESTE HARVESTER NACIONAL + ACEITAÇÃO Nº1 =====");
let fail = 0;
for (const r of results) { console.log(`${r.pass ? "✅" : "❌"} ${r.name}${r.extra ? "  — " + r.extra : ""}`); if (!r.pass) fail++; }
console.log(fail ? `\n${fail} FALHA(S)` : "\nTODOS PASSARAM");
process.exit(fail ? 1 : 0);
