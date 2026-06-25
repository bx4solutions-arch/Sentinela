// Autoteste E2E — §1 do Raio-X: "Quanto este órgão gasta no SEU nicho" (gold = contratos PNCP).
// Prova o RESULTADO: o valor renderizado BATE com a soma real dos contratos do órgão no nicho (12m),
// conferida contra o banco com os MESMOS tokens e a MESMA janela que a lib usa. Honesto onde não há.
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
const intDe = (s) => Number((s.match(/R\$\s*([\d.]+)/) || [, "0"])[1].replace(/\./g, ""));
const nDe = (s) => Number((s.match(/·\s*(\d+)\s*contrato/i) || [, "0"])[1]);

// Tokens EXATOS de material-hospitalar (lib/nichos.NICHO_TOKENS) + janela EXATA (now - 12*30 dias) da lib.
const TOKENS = ["hospitalar", "seringa", "cateter", "curativo", "medicamento", "odontolog"];
const TOK_SQL = TOKENS.map((t) => `objeto ilike '%${t}%'`).join(" or ");
const DESDE = new Date(Date.now() - 12 * 30 * 86400000).toISOString().slice(0, 10);
const DATA = `coalesce(data_assinatura, data_vigencia_inicio)`;

const email = `qa_gasto_${Date.now()}@sentinela.test`;
const consoleErrors = [];
const results = [];
const ok = (n, c, x = "") => results.push({ name: n, pass: !!c, extra: x });
const VERDE = /(?:bg|text|border|ring|fill|stroke|from|to|via)-(?:green|emerald|lime)-\d|#2ecc71|#22c55e|#16a34a|#15803d/i;

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
  const tid = await tenantIdPoll(email);

  // Órgão com gasto REAL no nicho: top por soma 12m, com total all-time ≤ 400 (sem truncar o limit(500) da lib).
  const cand = (await adminQuery(`select cnpj_orgao,
      count(*) filter (where ${DATA} >= '${DESDE}') n12,
      round(sum(valor_global) filter (where ${DATA} >= '${DESDE}'))::bigint total12
    from contratos where (${TOK_SQL}) and cnpj_orgao is not null
    group by cnpj_orgao
    having count(*) <= 400 and count(*) filter (where ${DATA} >= '${DESDE}') >= 1 and sum(valor_global) filter (where ${DATA} >= '${DESDE}') > 0
    order by total12 desc nulls last limit 1;`))?.[0];
  ok("achou órgão com gasto REAL no nicho (contratos PNCP)", !!cand?.cnpj_orgao && Number(cand.total12) > 0, `cnpj=${cand?.cnpj_orgao} total12=${cand?.total12} n12=${cand?.n12}`);
  const numero = (await adminQuery(`select numero_controle_pncp from raw_editais where cnpj_orgao='${cand.cnpj_orgao}' order by data_publicacao desc limit 1;`))?.[0]?.numero_controle_pncp;
  const lic = (await adminQuery(`insert into licitacao (id, tenant_id, numero_controle_pncp, titulo) values (gen_random_uuid(), '${tid}', '${numero}', 'QA gasto') returning id;`))?.[0]?.id;

  await page.goto(`${BASE}/licitacao/${lic}`, { waitUntil: "networkidle" });
  await page.waitForSelector("[data-testid=raiox-relatorio]", { timeout: 15000 });
  ok("§1: card 'Quanto este órgão gasta no seu nicho' presente", (await page.locator("[data-testid=gasto-nicho]").count()) > 0);
  ok("§1: gasto REAL (gold) renderizado", (await page.locator("[data-testid=gasto-real]").count()) > 0);

  const gastoTxt = await page.locator("[data-testid=gasto-real]").innerText();
  const renderedTotal = intDe(gastoTxt), renderedN = nDe(gastoTxt);
  const exTotal = Number(cand.total12), exN = Number(cand.n12);
  // confere contra o banco (mesmos tokens + mesma janela): valor renderizado == soma real (tolerância de centavos)
  ok("§1: valor BATE com a soma real dos contratos (não forjado)", Math.abs(renderedTotal - exTotal) <= 2, `render=${renderedTotal} banco=${exTotal}`);
  ok("§1: nº de contratos bate com o banco", renderedN === exN, `render=${renderedN} banco=${exN}`);
  ok("§1: rotulado como contratos firmados (PNCP)", /contratos firmados \(PNCP\)/i.test(gastoTxt));
  ok("§1: função orçamentária rotulada 'aproximação' (não como valor do nicho)", /aproxima[çc][ãa]o/i.test(await page.locator("[data-testid=gasto-nicho]").innerText()));
  const gnHtml = await page.locator("[data-testid=gasto-nicho]").innerHTML();
  ok("§1: nada de verde (azul/petróleo)", !VERDE.test(gnHtml));
  await page.screenshot({ path: `${SHOTS}/gasto-orgao.png`, fullPage: true });

  // HONESTIDADE: órgão SEM compra do nicho → "sem registro" (não inventa)
  const semCand = (await adminQuery(`select e.cnpj_orgao from raw_editais e where e.payload is not null and e.cnpj_orgao is not null
     and not exists (select 1 from contratos c where c.cnpj_orgao=e.cnpj_orgao and (${TOK_SQL}))
     limit 1;`))?.[0];
  if (semCand?.cnpj_orgao) {
    const numero2 = (await adminQuery(`select numero_controle_pncp from raw_editais where cnpj_orgao='${semCand.cnpj_orgao}' limit 1;`))?.[0]?.numero_controle_pncp;
    const lic2 = (await adminQuery(`insert into licitacao (id, tenant_id, numero_controle_pncp, titulo) values (gen_random_uuid(), '${tid}', '${numero2}', 'QA gasto vazio') returning id;`))?.[0]?.id;
    await page.goto(`${BASE}/licitacao/${lic2}`, { waitUntil: "networkidle" });
    await page.waitForSelector("[data-testid=gasto-nicho]", { timeout: 15000 });
    ok("HONESTO: órgão sem compra do nicho → 'sem registro' (não forja)", (await page.locator("[data-testid=gasto-sem-registro]").count()) > 0);
  } else {
    ok("HONESTO: (sem órgão candidato p/ vazio — pulado, vazio verdadeiro)", true);
  }

  ok("console sem erros", consoleErrors.length === 0, consoleErrors.slice(0, 4).join(" | "));
} catch (e) {
  ok("FLUXO GASTO ÓRGÃO", false, String(e));
  await page.screenshot({ path: `${SHOTS}/gasto-orgao-ERRO.png`, fullPage: true }).catch(() => {});
} finally {
  await browser.close();
  await cleanup(email);
}

console.log("\n===== AUTOTESTE GASTO DO ÓRGÃO NO NICHO (§1 Raio-X) =====");
let fail = 0;
for (const r of results) { console.log(`${r.pass ? "✅" : "❌"} ${r.name}${r.extra ? "  — " + r.extra : ""}`); if (!r.pass) fail++; }
console.log(fail ? `\n${fail} FALHA(S)` : "\nTODOS PASSARAM");
process.exit(fail ? 1 : 0);
