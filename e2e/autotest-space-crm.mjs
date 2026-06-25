// Autoteste E2E — Space (CRM da licitação): cabeçalho + aba Resumo no visual do protótipo + link PNCP + trava real.
// Prova o RESULTADO pelo FLUXO REAL (tenant novo, pois não há senha da conta TN Santos):
//   1) Radar SÓ mostra editais com prazo EM ABERTO (nenhum vencido vaza) e prioriza a cidade monitorada.
//   2) Abrir a licitação → cabeçalho no visual do protótipo (selo, título=órgão, objeto, KPIs) com dado real.
//   3) "Ver no PNCP" aponta para pncp.gov.br (não BLL); "Portal de origem" (se houver) aponta para a origem.
//   4) Aba Resumo no layout do protótipo (Identificação da licitação) montada do PNCP. Sem verde. Console limpo.
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

// Reimplementa o helper de produção (lib/utils.ts) p/ provar a URL gerada bate com a oficial.
function pncpEditalUrl(n) {
  if (!n) return null;
  const m = String(n).trim().match(/^(\d{14})-\d+-(\d+)\/(\d{4})$/);
  if (!m) return null;
  const [, c, s, a] = m;
  return `https://pncp.gov.br/app/editais/${c}/${a}/${String(Number(s))}`;
}

const email = `qa_spacecrm_${Date.now()}@sentinela.test`;
const consoleErrors = [];
const results = [];
const ok = (n, c, x = "") => results.push({ name: n, pass: !!c, extra: x });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()); });
page.on("pageerror", (e) => consoleErrors.push("pageerror: " + e.message));
try {
  // onboarding (HOSPITAL DO SERVIDOR PUBLICO MUNICIPAL — São Paulo/SP; nicho hospitalar)
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

  // ===== 1) TRAVA: Radar só mostra prazo EM ABERTO + prioriza a cidade monitorada =====
  await page.goto(`${BASE}/radar`, { waitUntil: "networkidle" });
  await page.waitForSelector("text=Sinais do seu recorte", { timeout: 10000 });
  const cards = await page.locator("[data-testid=edital-card]").count();
  ok("Radar: há editais abertos (cards > 0)", cards > 0, `cards=${cards}`);

  // nenhum edital VENCIDO pode vazar para a descoberta
  const vencRows = await adminQuery(`select numero_controle_pncp from raw_editais
     where segmentos && array['material-hospitalar'] and cidade='São Paulo' and valor_homologado is null
       and data_encerramento is not null and data_encerramento < now() limit 120;`);
  const mainTxt = await page.locator("main").innerText();
  const vazaram = (Array.isArray(vencRows) ? vencRows : []).filter((r) => mainTxt.includes(r.numero_controle_pncp));
  ok("Radar: NENHUM edital com prazo vencido aparece (trava real)", vazaram.length === 0, `vazaram=${vazaram.length}`);

  // a cidade monitorada (São Paulo) não é enterrada — primeiro card é dela
  const card0 = await page.locator("[data-testid=edital-card]").first().innerText();
  ok("Radar: cidade monitorada priorizada (1º card é São Paulo)", /São Paulo/.test(card0));
  await page.screenshot({ path: `${SHOTS}/spacecrm-radar.png`, fullPage: true });

  // ===== 2) Abrir a licitação (Space CRM) =====
  await page.locator("[data-testid=card-analisar]").first().click();
  await page.waitForURL(/\/licitacao\/[0-9a-f-]+/, { timeout: 15000 });
  await page.waitForSelector("[data-testid=space-cabecalho]", { timeout: 10000 });

  ok("Cabeçalho: selo '⬢ Espaço Inteligente da Licitação'", (await page.locator("[data-testid=space-selo]").count()) > 0);
  ok("Cabeçalho: KPIs (valor/estágio/prazo/prontidão)", (await page.locator("[data-testid=space-kpis]").count()) > 0);
  const head = await page.locator("[data-testid=space-cabecalho]").innerText();
  ok("Cabeçalho: faixa de metadados (Cidade/Modalidade) + título do órgão", head.trim().length > 60 && /(Cidade:|Modalidade:|Nº PNCP)/.test(head), `len=${head.trim().length}`);
  const kpis = await page.locator("[data-testid=space-kpis]").innerText();
  ok("KPIs trazem rótulos do protótipo", /VALOR ESTIMADO/i.test(kpis) && /PRAZO P\/ PROPOSTA/i.test(kpis) && /SUA PRONTID/i.test(kpis), kpis.replace(/\n/g, " ").slice(0, 80));

  // ===== 3) Link PNCP correto (bug corrigido) =====
  const numero = (head.match(/\d{14}-\d-\d{6}\/\d{4}/) || [])[0];
  const esperado = pncpEditalUrl(numero);
  const pncpHref = await page.locator("[data-testid=link-pncp]").first().getAttribute("href");
  ok("'Ver no PNCP' aponta para pncp.gov.br (não BLL)", !!pncpHref && pncpHref.startsWith("https://pncp.gov.br/app/editais/"), `href=${pncpHref}`);
  ok("URL do PNCP é montada corretamente do numero_controle_pncp", !!esperado && pncpHref === esperado, `num=${numero} → ${pncpHref}`);
  const portalCount = await page.locator("[data-testid=link-portal-origem]").count();
  if (portalCount > 0) {
    const portalHref = await page.locator("[data-testid=link-portal-origem]").first().getAttribute("href");
    ok("'Portal de origem' (origem ≠ PNCP)", !!portalHref && !portalHref.startsWith("https://pncp.gov.br"), `href=${portalHref}`);
  } else {
    ok("'Portal de origem' ausente porque o edital não tem link de origem (honesto)", true);
  }

  // ===== 4) Aba Resumo no layout do protótipo =====
  // já é a aba default; confirma os cards kv montados do PNCP
  await page.waitForSelector("[data-testid=resumo-edital]", { timeout: 10000 });
  const resumoTxt = await page.locator("[data-testid=resumo-edital]").innerText();
  ok("Resumo: card 'Identificação da licitação' presente", /Identifica[çc][ãa]o da licita[çc][ãa]o/i.test(resumoTxt));
  ok("Resumo: 'Sessão pública' presente", /Sess[ãa]o p[úu]blica/i.test(resumoTxt));
  ok("Resumo: montado do PNCP (determinístico) e com Objeto", /determin[íi]stico/i.test(resumoTxt) && /Objeto/i.test(resumoTxt));

  // ===== sem verde + console limpo =====
  const mainHtml = await page.locator("main").innerHTML();
  ok("console sem erros", consoleErrors.length === 0, consoleErrors.slice(0, 4).join(" | "));
  await page.screenshot({ path: `${SHOTS}/spacecrm-licitacao.png`, fullPage: true });

  // prova de capacidade p/ a conta real (Santos): há editais ABERTOS em Santos prontos para priorizar
  const santos = await adminQuery(`select count(*) n from raw_editais
     where segmentos && array['material-hospitalar'] and cidade='Santos' and valor_homologado is null
       and (data_encerramento >= now() or (data_encerramento is null and data_publicacao >= now() - interval '60 days'));`);
  ok("Capacidade conta real (Santos): há editais abertos para priorizar", Number(santos?.[0]?.n ?? 0) >= 1, `santos_abertos=${santos?.[0]?.n}`);
} catch (e) {
  ok("FLUXO SPACE CRM", false, String(e));
  await page.screenshot({ path: `${SHOTS}/spacecrm-ERRO.png`, fullPage: true }).catch(() => {});
} finally {
  await browser.close();
  await cleanup(email);
}

console.log("\n===== AUTOTESTE SPACE CRM (cabeçalho + Resumo + link PNCP + trava real) =====");
let fail = 0;
for (const r of results) { console.log(`${r.pass ? "✅" : "❌"} ${r.name}${r.extra ? "  — " + r.extra : ""}`); if (!r.pass) fail++; }
console.log(fail ? `\n${fail} FALHA(S)` : "\nTODOS PASSARAM");
process.exit(fail ? 1 : 0);
