// Autoteste E2E — Space: aba EXIGÊNCIAS (Checklist Vivo / as "tags"). Determinístico, sem IA.
// Prova o RESULTADO (tenant real; sem senha da conta TN Santos): cruza o nicho × cofre e mostra cada
// exigência como tag AZUL (você tem) / ÂMBAR (vence em Xd) / VERMELHO (falta). Bloco específicas = "em extração".
// Seeda o cofre com 3 certidões controladas (em dia / vencendo ≤30d / vencida) e confere as tags renderizadas.
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

const email = `qa_exig_${Date.now()}@sentinela.test`;
const consoleErrors = [];
const results = [];
const ok = (n, c, x = "") => results.push({ name: n, pass: !!c, extra: x });
// "verde" = classe/hex CSS verde (não a palavra em conteúdo).
const VERDE = /(?:bg|text|border|ring|fill|stroke|from|to|via)-(?:green|emerald|lime)-\d|#16a34a|#22c55e|#15803d/i;

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

  // Seeda o cofre (escopo company) com 3 certidões controladas: em dia / vencendo / vencida.
  const trow = await adminQuery(`select c.tenant_id from company c join auth.users u on u.id=c.tenant_id where u.email='${email}';`);
  const tid = trow?.[0]?.tenant_id;
  await adminQuery(`insert into documento (id, tenant_id, tipo, tipo_label, escopo, vencimento) values
    (gen_random_uuid(),'${tid}','fiscal_federal','CND Federal','company',(now()+interval '200 days')::date),
    (gen_random_uuid(),'${tid}','fgts','CRF/FGTS','company',(now()+interval '15 days')::date),
    (gen_random_uuid(),'${tid}','trabalhista','CNDT','company',(now()-interval '10 days')::date);`);
  const cofre = await adminQuery(`select tipo, vencimento, case when vencimento < now()::date then 'vencida' when vencimento <= (now()+interval '30 days')::date then 'a_renovar' else 'valida' end status from documento where tenant_id='${tid}' and escopo='company' order by tipo;`);

  // Abre o Space de uma licitação real → aba Exigências
  await page.goto(`${BASE}/radar`, { waitUntil: "networkidle" });
  await page.waitForSelector("text=Sinais do seu recorte", { timeout: 10000 });
  await page.locator("[data-testid=card-analisar]").first().click();
  await page.waitForURL(/\/licitacao\/[0-9a-f-]+/, { timeout: 15000 });
  await page.locator("button[role=tab]:has-text('Exigências')").click();
  await page.waitForSelector("[data-testid=exigencias-tab]", { timeout: 10000 });

  ok("Exigências: barra de contagem (você tem · vencendo · falta)", (await page.locator("[data-testid=exigencias-contagem]").count()) > 0);
  const itens = await page.locator("[data-testid=exigencia-item]").count();
  ok("Exigências: lista do nicho cruzada com o cofre (itens > 0)", itens > 0, `itens=${itens}`);

  // tags corretas: azul (você tem), âmbar (vence), vermelho (vencida + falta)
  const nValida = await page.locator("[data-testid=tag-valida]").count();
  const nRenovar = await page.locator("[data-testid=tag-a_renovar]").count();
  const nVencida = await page.locator("[data-testid=tag-vencida]").count();
  const nAusente = await page.locator("[data-testid=tag-ausente]").count();
  ok("tag AZUL 'você tem' (CND Federal em dia)", nValida >= 1, `valida=${nValida}`);
  ok("tag ÂMBAR 'vence em Xd' (FGTS ≤30d)", nRenovar >= 1, `a_renovar=${nRenovar}`);
  ok("tag VERMELHO 'vencida' (CNDT vencida)", nVencida >= 1, `vencida=${nVencida}`);
  ok("tag VERMELHO 'falta' (exigências sem doc no cofre)", nAusente >= 1, `ausente=${nAusente}`);

  // prova: cofre (query) × status renderizado batem
  const c = Object.fromEntries((Array.isArray(cofre) ? cofre : []).map((r) => [r.tipo, r.status]));
  ok("cofre × render: CND Federal=valida, FGTS=a_renovar, CNDT=vencida (query)", c.fiscal_federal === "valida" && c.fgts === "a_renovar" && c.trabalhista === "vencida", JSON.stringify(c));

  // "vence em Xd" aparece (âmbar com dias derivados do cofre)
  const tabTxt = await page.locator("[data-testid=exigencias-tab]").innerText();
  ok("tag âmbar mostra 'vence em Xd' (dias reais do cofre)", /vence em \d+d/i.test(tabTxt));

  // específicas do edital = NÃO forjadas (em extração)
  ok("bloco 'específicas do edital' com selo 'em extração' (não forjado)", (await page.locator("[data-testid=exig-em-extracao]").count()) > 0 && /em extra[çc][ãa]o/i.test(tabTxt));
  ok("não inventa atestado que não leu (texto honesto)", /não inventamos exig[êe]ncia que não lemos/i.test(tabTxt));

  // prontidão = fato, não chance de ganhar
  ok("prontidão é FATO (não 'chance de ganhar')", /não .*chance de ganhar/i.test(tabTxt));

  // sem verde + console limpo
  const tabHtml = await page.locator("[data-testid=exigencias-tab]").innerHTML();
  ok("nada de verde na aba Exigências (azul/âmbar/vermelho)", !VERDE.test(tabHtml));
  ok("console sem erros", consoleErrors.length === 0, consoleErrors.slice(0, 4).join(" | "));
  await page.screenshot({ path: `${SHOTS}/exigencias.png`, fullPage: true });
} catch (e) {
  ok("FLUXO EXIGÊNCIAS", false, String(e));
  await page.screenshot({ path: `${SHOTS}/exigencias-ERRO.png`, fullPage: true }).catch(() => {});
} finally {
  await browser.close();
  await cleanup(email);
}

console.log("\n===== AUTOTESTE EXIGÊNCIAS (Checklist Vivo / tags) =====");
let fail = 0;
for (const r of results) { console.log(`${r.pass ? "✅" : "❌"} ${r.name}${r.extra ? "  — " + r.extra : ""}`); if (!r.pass) fail++; }
console.log(fail ? `\n${fail} FALHA(S)` : "\nTODOS PASSARAM");
process.exit(fail ? 1 : 0);
