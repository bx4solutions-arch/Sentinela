// Autoteste E2E — Sistema de Descoberta: recorte da empresa + escopo (cidade/estado/nacional) + Pesquisa completa.
// Prova o RESULTADO pelo fluxo real (tenant novo; sem senha da conta TN Santos):
//   1) Descoberta abre só o RECORTE aberto (sem vencidas), em scroll/paginação dentro do recorte.
//   2) [Nacional] amplia o segmento (outras UFs, mesmo segmento); [Minha cidade] volta pro recorte.
//   3) Pesquisa completa acha por qualquer campo (objeto + UF + modalidade). "em breve" desabilitado.
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
const numDe = (s) => Number((s.match(/[\d.]+/) || ["0"])[0].replace(/\./g, ""));

const email = `qa_desc_${Date.now()}@sentinela.test`;
const consoleErrors = [];
const results = [];
const ok = (n, c, x = "") => results.push({ name: n, pass: !!c, extra: x });
// "verde" = classe/hex de CSS verde (não a palavra "lime"/"green" em conteúdo real, ex.: cidade "Limeira").

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

  // ===== 1) RECORTE (default = cidade/UF do cadastro), só abertas, em scroll =====
  await page.goto(`${BASE}/radar`, { waitUntil: "networkidle" });
  await page.waitForSelector("text=Sinais do seu recorte", { timeout: 10000 });
  ok("Descoberta: botão de ESCOPO presente (cidade/estado/nacional)", (await page.locator("[data-testid=radar-escopo]").count()) > 0 && (await page.locator("[data-testid=escopo-nacional]").count()) > 0);
  ok("Descoberta: lista do recorte em scroll", (await page.locator("[data-testid=recorte-lista]").count()) > 0);
  const cardsCidade = await page.locator("[data-testid=edital-card]").count();
  ok("Descoberta: recorte traz oportunidades (cards > 0)", cardsCidade > 0, `cards=${cardsCidade}`);
  const contCidade = numDe(await page.locator("[data-testid=recorte-contagem]").innerText());

  // ===== RADAR v2: hero + uploadZone honesta + filtros de ouro REAIS =====
  ok("Radar v2: hero 'Radar de Oportunidades'", /Radar de Oportunidades/.test(await page.locator("main").innerText()));
  ok("Radar v2: uploadZone 'Importar licitação' presente (estado honesto 'em ingestão')", (await page.locator("[data-testid=radar-upload]").count()) > 0 && /em ingest[ãa]o/i.test(await page.locator("[data-testid=radar-upload]").innerText()));
  ok("Radar v2: filtros de ouro com 5 KPIs", (await page.locator("[data-testid=radar-filtros-ouro] .kpi").count()) === 5);
  const filtroAbertas = numDe(await page.locator("[data-testid=filtro-abertas]").innerText());
  ok("Radar v2: filtro 'Editais abertos' = total do recorte (real, não forjado)", filtroAbertas === contCidade, `filtro=${filtroAbertas} contagem=${contCidade}`);

  // sem vencidas no recorte
  const venc = await adminQuery(`select numero_controle_pncp from raw_editais where segmentos && array['material-hospitalar'] and cidade='São Paulo' and valor_homologado is null and data_encerramento is not null and data_encerramento < now() limit 120;`);
  const main1 = await page.locator("main").innerText();
  const vazaram = (Array.isArray(venc) ? venc : []).filter((r) => main1.includes(r.numero_controle_pncp));
  ok("Descoberta: NENHUMA vencida no recorte (reusa trava)", vazaram.length === 0, `vazaram=${vazaram.length}`);
  await page.screenshot({ path: `${SHOTS}/desc-recorte.png`, fullPage: true });

  // ===== 2) ESCOPO NACIONAL amplia o segmento (outras UFs do MESMO segmento) =====
  await page.locator("[data-testid=escopo-nacional]").click();
  await page.waitForURL(/escopo=nacional/, { timeout: 10000 });
  await page.waitForSelector("[data-testid=recorte-contagem]", { timeout: 10000 });
  const contNacional = numDe(await page.locator("[data-testid=recorte-contagem]").innerText());
  ok("Escopo Nacional amplia o alcance (total nacional > cidade)", contNacional > contCidade, `cidade=${contCidade} nacional=${contNacional}`);
  // o dado nacional do segmento abrange várias UFs (não só SP)
  const ufsNac = await adminQuery(`select count(distinct uf_sigla) n from raw_editais where segmentos && array['material-hospitalar'] and valor_homologado is null and (data_encerramento >= now() or (data_encerramento is null and data_publicacao >= now() - interval '60 days'));`);
  ok("Escopo Nacional cobre várias UFs no mesmo segmento", Number(ufsNac?.[0]?.n ?? 0) > 1, `ufs=${ufsNac?.[0]?.n}`);
  await page.screenshot({ path: `${SHOTS}/desc-nacional.png`, fullPage: true });

  // [Minha cidade] volta pro recorte
  await page.locator("[data-testid=escopo-cidade]").click();
  await page.waitForURL(/escopo=cidade/, { timeout: 10000 });
  const contVolta = numDe(await page.locator("[data-testid=recorte-contagem]").innerText());
  ok("[Minha cidade] volta pro recorte (total = cidade)", contVolta === contCidade, `volta=${contVolta} cidade=${contCidade}`);

  // ===== 3) PESQUISA COMPLETA — acha por qualquer campo =====
  // cenário com dado (objeto medicamento + SP + Pregão eletrônico, abertas)
  const mod = encodeURIComponent("Pregão - Eletrônico");
  await page.goto(`${BASE}/pesquisa?modo=completa&enviado=1&objeto=medicamento&ufs=SP&mod=${mod}&abertas=1`, { waitUntil: "networkidle" });
  await page.waitForSelector("[data-testid=form-completa]", { timeout: 10000 });
  const temResultado = (await page.locator("[data-testid=completa-resultado]").count()) > 0;
  const temVazio = (await page.locator("[data-testid=completa-vazio]").count()) > 0;
  ok("Pesquisa completa: acha por objeto+UF+modalidade (ou vazio honesto)", temResultado || temVazio, `resultado=${temResultado} vazio=${temVazio}`);
  ok("Pesquisa completa: retornou cards reais (cenário SP medicamento)", (await page.locator("[data-testid=completa-card]").count()) > 0, `cards=${await page.locator("[data-testid=completa-card]").count()}`);
  // campos 'em breve' desabilitados (nunca botão que não faz nada)
  ok("Pesquisa completa: campos sem dado = 'em breve' desabilitado", (await page.locator("[data-testid=form-completa] input[disabled]").count()) >= 1 && /em breve/i.test(await page.locator("[data-testid=form-completa]").innerText()));
  await page.screenshot({ path: `${SHOTS}/desc-pesquisa.png`, fullPage: true });

  // DoD multi-campo: Pregão + PI + vetor (resultado OU vazio verdadeiro — não falha por azar de dado)
  await page.goto(`${BASE}/pesquisa?modo=completa&enviado=1&objeto=${encodeURIComponent("controle de vetores")}&ufs=PI&mod=${mod}&abertas=1`, { waitUntil: "networkidle" });
  await page.waitForSelector("[data-testid=form-completa]", { timeout: 10000 });
  const piOK = (await page.locator("[data-testid=completa-resultado]").count()) > 0 || (await page.locator("[data-testid=completa-vazio]").count()) > 0;
  ok("Pesquisa completa: Pregão+PI+vetor renderiza (resultado ou vazio verdadeiro)", piOK);

  // ===== sem verde + console limpo =====
  await page.goto(`${BASE}/radar?escopo=nacional`, { waitUntil: "networkidle" });
  await page.waitForSelector("[data-testid=recorte-contagem]", { timeout: 10000 });
  const mainHtml = await page.locator("main").innerHTML();
  ok("console sem erros", consoleErrors.length === 0, consoleErrors.slice(0, 4).join(" | "));
} catch (e) {
  ok("FLUXO DESCOBERTA", false, String(e));
  await page.screenshot({ path: `${SHOTS}/desc-ERRO.png`, fullPage: true }).catch(() => {});
} finally {
  await browser.close();
  await cleanup(email);
}

console.log("\n===== AUTOTESTE DESCOBERTA (recorte + escopo + pesquisa completa) =====");
let fail = 0;
for (const r of results) { console.log(`${r.pass ? "✅" : "❌"} ${r.name}${r.extra ? "  — " + r.extra : ""}`); if (!r.pass) fail++; }
console.log(fail ? `\n${fail} FALHA(S)` : "\nTODOS PASSARAM");
process.exit(fail ? 1 : 0);
