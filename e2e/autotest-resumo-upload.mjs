// Autoteste E2E — Acabamento do Resumo Profundo: estado "documento indisponível" LIMPO + UPLOAD de PDF.
// Reproduz o caso Santos (doc não está no PNCP, só no portal de origem/BLL): mostra aviso + determinístico
// + "Baixar no portal de origem" + upload; e prova que o UPLOAD de um PDF de texto ENCHE as 18 seções.
// Custo: 1 extração real (fixture pequeno, modelo barato); 2º acesso = cache (0 IA).
import { chromium } from "playwright";
import { mkdirSync, readFileSync } from "node:fs";

const BASE = "http://localhost:3001";
const SHOTS = "e2e/shots";
const FIXTURE = "e2e/fixtures/edital-fixture.pdf";
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

const email = `qa_rup_${Date.now()}@sentinela.test`;
const consoleErrors = [];
const results = [];
const ok = (n, c, x = "") => results.push({ name: n, pass: !!c, extra: x });
const VERDE = /(?:bg|text|border|ring|fill|stroke|from|to|via)-(?:green|emerald|lime)-\d|#16a34a|#22c55e|#15803d/i;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()); });
page.on("pageerror", (e) => consoleErrors.push("pageerror: " + e.message));
try {
  // onboarding
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

  // Escolhe um edital que TEM link_origem (portal de origem) e payload — reproduz o caso Santos/BLL.
  const tid = await tenantIdPoll(email);
  const edital = (await adminQuery(`select numero_controle_pncp from raw_editais where link_origem like 'http%' and payload is not null and valor_homologado is null order by data_publicacao desc limit 1;`))?.[0];
  const numero = edital?.numero_controle_pncp;
  ok("achou edital com portal de origem (link_origem) p/ reproduzir Santos", !!numero, `numero=${numero}`);
  // limpa cache desse edital (hermético) e cria a licitação do tenant
  await adminQuery(`delete from analise where tipo='resumo_profundo' and licitacao_id in (select id from licitacao where numero_controle_pncp='${numero}');`);
  const lic = (await adminQuery(`insert into licitacao (id, tenant_id, numero_controle_pncp, titulo) values (gen_random_uuid(), '${tid}', '${numero}', 'QA upload') returning id;`))?.[0]?.id;

  await page.goto(`${BASE}/licitacao/${lic}`, { waitUntil: "networkidle" });
  await page.locator("button[role=tab]:has-text('Resumo Profundo')").click();
  await page.waitForSelector("[data-testid=profundo-tab]", { timeout: 10000 });

  // ===== LEGIBILIDADE (sem fonte miúda) =====
  const seloPx = await page.locator("[data-testid=space-selo]").evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  const h1Px = await page.locator("[data-testid=space-cabecalho] h1").evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  ok("legibilidade: selo ≥ 13px (sem [10px]/[11px])", seloPx >= 13, `selo=${seloPx}px`);
  ok("legibilidade: título do órgão ≥ 20px", h1Px >= 20, `h1=${h1Px}px`);

  // ===== ESTADO "documento indisponível" LIMPO (sem 18 vazios) =====
  ok("estado indisponível LIMPO presente (não a parede de 18 vazios)", (await page.locator("[data-testid=profundo-indisponivel]").count()) > 0);
  ok("NÃO renderiza as 18 seções quando não há extração real", (await page.locator("[data-testid=profundo-secao]").count()) === 0);
  ok("‘Baixar no portal de origem’ em destaque", (await page.locator("[data-testid=baixar-portal-origem]").count()) > 0);
  ok("formulário de UPLOAD de PDF presente", (await page.locator("[data-testid=form-upload-edital]").count()) > 0 && (await page.locator("[data-testid=input-pdf]").count()) > 0);
  const indispTxt = await page.locator("[data-testid=profundo-indisponivel]").innerText();
  ok("Resumo determinístico (PNCP) bem apresentado no estado vazio", /Resumo determin[íi]stico \(PNCP\)/i.test(indispTxt) && /Objeto/i.test(indispTxt));
  ok("não promete scraping (roadmap honesto)", /roadmap/i.test(indispTxt));
  await page.screenshot({ path: `${SHOTS}/resumo-indisponivel.png`, fullPage: true });

  // ===== UPLOAD do PDF de fixture → as 18 seções enchem de verdade =====
  await page.locator("[data-testid=input-pdf]").setInputFiles(FIXTURE);
  await page.locator("[data-testid=enviar-pdf]").click();
  await page.waitForSelector("[data-testid=profundo-conteudo]", { timeout: 90000 });
  const nSecoes = await page.locator("[data-testid=profundo-secao]").count();
  ok("UPLOAD: 18 seções renderizadas (extração real do PDF enviado)", nSecoes === 18, `secoes=${nSecoes}`);
  const fonte = await page.locator("[data-testid=profundo-fonte]").innerText();
  ok("UPLOAD: fonte=IA (extração real)", /IA/i.test(fonte), fonte);
  const tabHtml = await page.locator("[data-testid=profundo-tab]").innerHTML();
  ok("UPLOAD: conteúdo real do edital (habilitação/atestado/penalidades)", /atestado/i.test(tabHtml) && /penalidad/i.test(tabHtml) && /habilita/i.test(tabHtml));
  ok("UPLOAD: 'Não informado' só onde o texto não diz (não forja)", /Não informado/i.test(tabHtml));
  const mainHtml = await page.locator("main").innerHTML();
  ok("nada de verde no Resumo Profundo", !VERDE.test(mainHtml));
  await page.screenshot({ path: `${SHOTS}/resumo-preenchido-upload.png`, fullPage: true });

  // persistência + cache (2º acesso não rechama)
  const dbA = await adminQuery(`select a.conteudo->>'fonte' fonte from analise a join licitacao l on l.id=a.licitacao_id where l.numero_controle_pncp='${numero}' and a.tipo='resumo_profundo';`);
  ok("persistência: extração do upload gravada (fonte=ia)", dbA?.[0]?.fonte === "ia", JSON.stringify(dbA?.[0]));
  await page.goto(`${BASE}/radar`, { waitUntil: "networkidle" });
  await page.goto(`${BASE}/licitacao/${lic}`, { waitUntil: "networkidle" });
  await page.locator("button[role=tab]:has-text('Resumo Profundo')").click();
  await page.waitForSelector("[data-testid=profundo-conteudo]", { timeout: 15000 });
  const linhas = await adminQuery(`select count(*) n from analise a join licitacao l on l.id=a.licitacao_id where l.numero_controle_pncp='${numero}' and a.tipo='resumo_profundo';`);
  ok("cache: 2º acesso não duplica/rechama (1 linha)", Number(linhas?.[0]?.n ?? 0) === 1, `linhas=${linhas?.[0]?.n}`);

  ok("console sem erros", consoleErrors.length === 0, consoleErrors.slice(0, 4).join(" | "));
} catch (e) {
  ok("FLUXO RESUMO UPLOAD", false, String(e));
  await page.screenshot({ path: `${SHOTS}/resumo-upload-ERRO.png`, fullPage: true }).catch(() => {});
} finally {
  await browser.close();
  await cleanup(email);
}

console.log("\n===== AUTOTESTE RESUMO PROFUNDO — estado vazio limpo + UPLOAD =====");
let fail = 0;
for (const r of results) { console.log(`${r.pass ? "✅" : "❌"} ${r.name}${r.extra ? "  — " + r.extra : ""}`); if (!r.pass) fail++; }
console.log(fail ? `\n${fail} FALHA(S)` : "\nTODOS PASSARAM");
process.exit(fail ? 1 : 0);
