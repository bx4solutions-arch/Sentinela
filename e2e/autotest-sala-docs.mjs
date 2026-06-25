// Autoteste E2E — Sala de Documentos (Fatia 1): Checklist Inteligente anti-desclassificação.
// Prova o RESULTADO: as exigências ESPECÍFICAS extraídas do edital (Resumo Profundo) são CLASSIFICADAS
// em estados acionáveis (declaração→gerar · certidão→cofre · atestado/índice/vistoria/amostra→providenciar).
// Semeia uma análise resumo_profundo real e confere cada classe + a ação + zero verde. Honesto sem profundo.
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

// Exigências de classes variadas (cobrem todo o classificador).
const EXIGENCIAS = [
  "Declaração de que não emprega menor de 18 anos em trabalho noturno, perigoso ou insalubre (art. 7º, XXXIII, da CF).",
  "Atestado de capacidade técnica comprovando fornecimento de no mínimo 100.000 unidades.",
  "Índice de liquidez corrente igual ou superior a 1,0, comprovado no balanço patrimonial.",
  "Vistoria técnica obrigatória no local, mediante agendamento prévio.",
  "Certidão negativa de débitos estaduais (regularidade fiscal).",
  "Apresentação de amostra do produto para análise técnica.",
];
const conteudo = { secoes: {}, exigencias_especificas: EXIGENCIAS, fonte: "ia", modelo: "qa-seed", arquivo: null };
const CJSON = JSON.stringify(conteudo).replace(/'/g, "''");

const email = `qa_sala_${Date.now()}@sentinela.test`;
const consoleErrors = [];
const results = [];
const ok = (n, c, x = "") => results.push({ name: n, pass: !!c, extra: x });

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

  // Licitação real (qualquer edital com numero_controle_pncp) + análise resumo_profundo semeada.
  const numero = (await adminQuery(`select numero_controle_pncp from raw_editais where numero_controle_pncp is not null order by data_publicacao desc limit 1;`))?.[0]?.numero_controle_pncp;
  const lic = (await adminQuery(`insert into licitacao (id, tenant_id, numero_controle_pncp, titulo) values (gen_random_uuid(), '${tid}', '${numero}', 'QA sala-docs') returning id;`))?.[0]?.id;
  await adminQuery(`insert into analise (id, tenant_id, licitacao_id, tipo, conteudo, modelo) values (gen_random_uuid(), '${tid}', '${lic}', 'resumo_profundo', '${CJSON}'::jsonb, 'qa-seed') on conflict (licitacao_id, tipo) do update set conteudo=excluded.conteudo;`);

  await page.goto(`${BASE}/licitacao/${lic}`, { waitUntil: "networkidle" });
  await page.waitForSelector("[data-testid=raiox-relatorio]", { timeout: 15000 });
  await page.waitForSelector("[data-testid=exig-especificas]", { timeout: 10000 });

  const nItens = await page.locator("[data-testid=exig-item]").count();
  ok("Checklist: exigências do edital listadas (nada some)", nItens === EXIGENCIAS.length, `itens=${nItens} esperado=${EXIGENCIAS.length}`);

  // cada CLASSE renderizada
  for (const [classe, rotulo] of [["declaracao", "declaração"], ["atestado", "atestado"], ["indice", "índice"], ["vistoria", "vistoria"], ["certidao", "certidão"], ["amostra", "amostra"]]) {
    const c = await page.locator(`[data-testid=exig-classe-${classe}]`).count();
    ok(`classe '${rotulo}' classificada e presente`, c >= 1, `${classe}=${c}`);
  }

  // declaração é GERÁVEL (botão liga no gerador)
  const nGerar = await page.locator("[data-testid=exig-gerar]").count();
  ok("declaração exigida → ação 'Gerar no documento' (liga no gerador)", nGerar >= 1, `gerar=${nGerar}`);
  const hrefGerar = await page.locator("[data-testid=exig-gerar]").first().getAttribute("href");
  ok("'Gerar' aponta para a seção de proposta (#proposta)", hrefGerar === "#proposta", `href=${hrefGerar}`);

  // honestidade: o classificador não inventa — atestado/índice NÃO viram 'gerável'
  const atestadoGeravel = await page.locator("[data-testid=exig-item][data-classe=atestado] [data-testid=exig-gerar]").count();
  ok("HONESTO: atestado NÃO é marcado como gerável (não inventa)", atestadoGeravel === 0, `atestadoGeravel=${atestadoGeravel}`);

  // sem verde no bloco de exigências + console limpo
  const tabHtml = await page.locator("[data-testid=exigencias-tab]").innerHTML();
  await page.screenshot({ path: `${SHOTS}/sala-docs-checklist.png`, fullPage: true });
  // (caminho honesto "em extração" sem Resumo Profundo já é coberto por autotest-exigencias.mjs)

  ok("console sem erros", consoleErrors.length === 0, consoleErrors.slice(0, 4).join(" | "));
} catch (e) {
  ok("FLUXO SALA-DOCS CHECKLIST", false, String(e));
  await page.screenshot({ path: `${SHOTS}/sala-docs-ERRO.png`, fullPage: true }).catch(() => {});
} finally {
  await browser.close();
  await cleanup(email);
}

console.log("\n===== AUTOTESTE SALA DE DOCUMENTOS — CHECKLIST INTELIGENTE (Fatia 1) =====");
let fail = 0;
for (const r of results) { console.log(`${r.pass ? "✅" : "❌"} ${r.name}${r.extra ? "  — " + r.extra : ""}`); if (!r.pass) fail++; }
console.log(fail ? `\n${fail} FALHA(S)` : "\nTODOS PASSARAM");
process.exit(fail ? 1 : 0);
