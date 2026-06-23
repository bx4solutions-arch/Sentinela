// Autoteste E2E — BLOCO 1 (Camada 2): contrato vencendo + quem ganhou (fornecedor vencedor).
// Prova o RESULTADO: a tabela contratos cresce multi-UF; o "contrato vencendo" (dataVigenciaFim
// nos próximos 12m) aparece na esteira de Antecipação de um órgão real, com fornecedor atual.
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

const email = `qa_contr_${Date.now()}@sentinela.test`;
const consoleErrors = [];
const results = [];
const ok = (n, c, x = "") => results.push({ name: n, pass: !!c, extra: x });
const num = (res) => Number(res?.[0] ? Object.values(res[0])[0] : 0);
const VENC = "data_vigencia_fim between current_date and current_date+365";
const PRAGA = "objeto ilike '%praga%' or objeto ilike '%dedetiz%' or objeto ilike '%vetor%' or objeto ilike '%dengue%' or objeto ilike '%desinsetiz%'";
const HOSP = "objeto ilike '%hospitalar%' or objeto ilike '%medicamento%' or objeto ilike '%seringa%' or objeto ilike '%cateter%' or objeto ilike '%odontolog%'";

// ---------- 1) PROVA NO BANCO ----------
const totalContr = num(await adminQuery("select count(*) n from contratos;"));
ok("contratos coletados (Camada 2)", totalContr >= 1, `total=${totalContr}`);
const ufsContr = num(await adminQuery("select count(distinct uf_sigla) n from contratos;"));
ok("contratos em VÁRIAS UFs", ufsContr >= 3, `ufs=${ufsContr}`);
const venc = num(await adminQuery(`select count(*) n from contratos where ${VENC};`));
ok("contrato VENCENDO (vigência nos próximos 12m) existe", venc >= 1, `vencendo=${venc}`);
const vencForn = num(await adminQuery(`select count(*) n from contratos where ${VENC} and ni_fornecedor is not null;`));
ok("quem ganhou: vencendo traz o FORNECEDOR atual (vencedor)", vencForn >= 1, `c/ fornecedor=${vencForn}`);

// escolhe um (nicho, uf) com vencendo p/ dirigir a UI
let termo = "controle de pragas";
let ufDemo = (await adminQuery(`select uf_sigla from contratos where ${VENC} and (${PRAGA}) and uf_sigla is not null group by uf_sigla order by count(*) desc limit 1;`))?.[0]?.uf_sigla;
if (!ufDemo) { termo = "material hospitalar"; ufDemo = (await adminQuery(`select uf_sigla from contratos where ${VENC} and (${HOSP}) and uf_sigla is not null group by uf_sigla order by count(*) desc limit 1;`))?.[0]?.uf_sigla; }
ok("há cenário (nicho×UF) com contrato vencendo p/ provar na UI", !!ufDemo, `termo="${termo}" uf=${ufDemo}`);

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

  // Antecipação: buscar o nicho na UF com contrato vencendo
  await page.goto(`${BASE}/radar?pilar=antecipacao&q=${encodeURIComponent(termo)}&uf=${ufDemo}`, { waitUntil: "networkidle" });
  await page.waitForSelector("[data-testid=radar-pilares]", { timeout: 10000 });
  const body = await page.locator("body").innerText();
  const cards = await page.locator("[data-testid=antecipacao-card]").count();
  const temVencendo = /contrato vence em|contrato vencendo/i.test(body);
  ok("ACEITAÇÃO Bloco 1: 'contrato vencendo' aparece na esteira de Antecipação (órgão real)", cards >= 1 && temVencendo, `cards=${cards}, vencendo_na_ui=${temVencendo}`);
  ok("card de vencendo mostra fornecedor atual", /fornecedor atual/i.test(body));
  await page.screenshot({ path: `${SHOTS}/contratos-vencendo-${ufDemo}.png`, fullPage: true });

  ok("console sem erros", consoleErrors.length === 0, consoleErrors.slice(0, 4).join(" | "));
} catch (e) {
  ok("FLUXO CONTRATOS", false, String(e));
  await page.screenshot({ path: `${SHOTS}/contratos-ERRO.png`, fullPage: true }).catch(() => {});
} finally {
  await browser.close();
  await cleanup(email);
}

console.log("\n===== AUTOTESTE CONTRATOS — Camada 2 (Bloco 1) =====");
let fail = 0;
for (const r of results) { console.log(`${r.pass ? "✅" : "❌"} ${r.name}${r.extra ? "  — " + r.extra : ""}`); if (!r.pass) fail++; }
console.log(fail ? `\n${fail} FALHA(S)` : "\nTODOS PASSARAM");
process.exit(fail ? 1 : 0);
