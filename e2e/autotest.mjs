// Autoteste E2E do Bloco 1 — dirige o fluxo real e coleta evidências.
// Uso: node e2e/autotest.mjs  (dev server em :3001)
import { chromium } from "playwright";
import { mkdirSync, readFileSync } from "node:fs";

// Lê credenciais do .env.local (só p/ limpar a PRÓPRIA conta de teste no fim).
function readEnv() {
  const env = {};
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const t = line.trim();
    if (t && !t.startsWith("#") && t.includes("=")) {
      const [k, ...v] = t.split("=");
      env[k.trim()] = v.join("=").trim().replace(/^['"]|['"]$/g, "");
    }
  }
  return env;
}

// Apaga SOMENTE a conta de teste criada por este run (nunca contas reais).
async function cleanupTestAccount(testEmail) {
  try {
    const e = readEnv();
    const url = e.SUPABASE_URL.replace(/\/$/, "");
    const sr = e.SUPABASE_SERVICE_ROLE_KEY;
    const h = { apikey: sr, Authorization: `Bearer ${sr}` };
    const list = await (await fetch(`${url}/auth/v1/admin/users`, { headers: h })).json();
    for (const u of list.users || []) {
      if (u.email === testEmail && u.email.endsWith("@sentinela.test")) {
        await fetch(`${url}/auth/v1/admin/users/${u.id}`, { method: "DELETE", headers: h });
      }
    }
  } catch { /* limpeza best-effort */ }
}

const BASE = "http://localhost:3001";
const SHOTS = "e2e/shots";
mkdirSync(SHOTS, { recursive: true });

const email = `qa_${Date.now()}@sentinela.test`;
const pass = "teste123";
const consoleErrors = [];
const results = [];
const ok = (name, cond, extra = "") => results.push({ name, pass: !!cond, extra });

const browser = await chromium.launch();
const page = await browser.newPage();
page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()); });
page.on("pageerror", (e) => consoleErrors.push("pageerror: " + e.message));

try {
  // 1) Criar conta
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.fill("input[name=email]", email);
  await page.fill("input[name=password]", pass);
  await page.click("button[value=signup]");
  await page.waitForURL("**/onboarding", { timeout: 20000 });
  ok("signup → /onboarding (wizard)", page.url().includes("/onboarding"));
  await page.screenshot({ path: `${SHOTS}/01-wizard-cnpj.png` });

  // 2) Passo CNPJ (Banco do Brasil)
  await page.fill("#cnpj", "00000000000191");
  await page.click("button:has-text('Consultar')");
  await page.waitForSelector("text=É essa a sua empresa?", { timeout: 25000 });
  const temBB = await page.locator("text=BANCO DO BRASIL").count();
  ok("BrasilAPI retornou a empresa (BB)", temBB > 0);
  await page.screenshot({ path: `${SHOTS}/02-wizard-confirma.png` });
  await page.click("button:has-text('Sim, continuar')");

  // 3) Nichos
  await page.waitForSelector("text=Seus nichos", { timeout: 10000 });
  await page.screenshot({ path: `${SHOTS}/03-wizard-nichos.png` });
  await page.click("button:has-text('Continuar')");

  // 4) Certidões — cadastra 1 vencimento
  await page.waitForSelector("text=Certidões de habilitação", { timeout: 10000 });
  await page.locator("input[type=date]").first().fill("2026-12-31");
  await page.screenshot({ path: `${SHOTS}/04-wizard-certidoes.png` });
  await page.click("button:has-text('Concluir')");

  // 5) Minha Empresa — ficha completa
  await page.waitForURL("**/empresa", { timeout: 20000 });
  await page.waitForSelector("text=Identificação", { timeout: 10000 });
  const body = await page.locator("body").innerText();
  ok("ficha: Identificação", body.includes("Identificação"));
  ok("ficha: Capital social (label + valor R$)", /capital social/i.test(body) && body.includes("R$"));
  ok("ficha: Endereço & contato", body.includes("Endereço"));
  ok("ficha: Atividades (CNAEs)", body.includes("Atividades"));
  ok("ficha: Quadro societário (QSA)", body.includes("Quadro societário"));
  ok("prontidão presente", /\d+%/.test(body));
  ok("checklist com 'Ausente'", body.includes("Ausente"));
  ok("ficha: município/UF renderizados (BB → BRASILIA/DF)", /BRAS[IÍ]LIA/i.test(body) && /\bDF\b/.test(body));
  ok("banner mock ausente em /empresa", !body.includes("ILUSTRATIVOS") && !body.toLowerCase().includes("mock"));
  await page.screenshot({ path: `${SHOTS}/05-empresa-ficha.png`, fullPage: true });

  // 6) Documento custom ("Outro…")
  await page.selectOption("#tipo-extra", "__outro__");
  await page.fill("input[name=tipo_custom]", "Registro CRQ (teste QA)");
  await page.fill("#venc-extra", "2027-03-15");
  await page.click("button:has-text('Adicionar')");
  await page.waitForSelector("text=Registro CRQ (teste QA)", { timeout: 10000 });
  ok("documento custom aparece na Vigia", true);
  await page.screenshot({ path: `${SHOTS}/06-empresa-custom-doc.png`, fullPage: true });

  // 7) Trocar empresa (modal → novo CNPJ de SP)
  await page.click("button:has-text('Trocar empresa')");
  await page.waitForSelector("text=Trocar a empresa monitorada?", { timeout: 10000 });
  await page.screenshot({ path: `${SHOTS}/07-trocar-modal.png` });
  await page.click("button:has-text('Sim, trocar empresa')");
  await page.waitForURL("**/onboarding**", { timeout: 15000 });
  ok("trocar → /onboarding?trocar=1", page.url().includes("trocar=1"));
  await page.fill("#cnpj", "47960950000121"); // Magazine Luiza (Franca/SP)
  await page.click("button:has-text('Consultar')");
  await page.waitForSelector("text=É essa a sua empresa?", { timeout: 25000 });
  await page.click("button:has-text('Sim, continuar')");
  await page.waitForSelector("text=Seus nichos", { timeout: 10000 });
  await page.click("button:has-text('Continuar')");
  await page.waitForSelector("text=Certidões de habilitação", { timeout: 10000 });
  await page.click("button:has-text('Concluir')");
  await page.waitForURL("**/empresa", { timeout: 20000 });
  const body2 = await page.locator("body").innerText();
  ok("após trocar: empresa nova (Magazine, Franca/SP)", body2.includes("MAGAZINE") && /FRANCA/i.test(body2) && /\bSP\b/.test(body2));
  ok("após trocar: doc custom antigo sumiu (recomeçou do zero)", !body2.includes("Registro CRQ (teste QA)"));
  await page.screenshot({ path: `${SHOTS}/08-empresa-trocada.png`, fullPage: true });

  ok("console sem erros", consoleErrors.length === 0, consoleErrors.slice(0, 5).join(" | "));
} catch (e) {
  ok("FLUXO COMPLETO", false, String(e));
  await page.screenshot({ path: `${SHOTS}/ERRO.png`, fullPage: true }).catch(() => {});
} finally {
  await browser.close();
  await cleanupTestAccount(email); // limpa só a própria conta qa_*@sentinela.test
}

console.log("\n===== RESULTADO AUTOTESTE =====");
let fail = 0;
for (const r of results) {
  console.log(`${r.pass ? "✅" : "❌"} ${r.name}${r.extra ? "  — " + r.extra : ""}`);
  if (!r.pass) fail++;
}
console.log(`\nEMAIL_TESTE=${email}`);
console.log(fail ? `\n${fail} FALHA(S)` : "\nTODOS PASSARAM");
process.exit(fail ? 1 : 0);
