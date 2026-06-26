// Autoteste E2E — NAVEGAÇÃO DO SIDEBAR (clicando, não page.goto).
// Pega a classe de bug que os outros e2e NÃO pegam: sidebar morto por hidratação/SW quebrado.
// Os demais testes navegam por URL (page.goto) e por isso nunca exercitam o clique no menu.
// Aqui: faz onboarding, e CLICA em cada item do sidebar provando que a URL muda e a tela renderiza.
// Bônus: garante que NENHUM service worker fica registrado (o "porteiro" que matava a navegação).
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
async function cleanup(email) {
  const list = await (await fetch(`${SB}/auth/v1/admin/users`, { headers: H })).json();
  for (const u of list.users || []) if (u.email === email && u.email.endsWith("@sentinela.test")) await fetch(`${SB}/auth/v1/admin/users/${u.id}`, { method: "DELETE", headers: H });
}
async function onboard(page, email) {
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
}

// Itens do sidebar (devem casar com NAV em components/shell.tsx) + uma âncora de conteúdo real por rota.
const ROTAS = [
  { label: "Dashboard", path: "/dashboard", marca: /Dashboard Sentinela|Oportunidades no Radar/i },
  { label: "Radar", path: "/radar", marca: /Radar de Oportunidades/i },
  { label: "Licitações", path: "/space", marca: /Licita/i },
  { label: "Minha Empresa", path: "/empresa", marca: /Minha Empresa|CNPJ|Identifica/i },
  { label: "Kanban", path: "/kanban", marca: /Kanban/i },
  { label: "Configurações", path: "/configuracoes", marca: /Configura|Perfil da Empresa/i },
];

const email = `qa_nav_${Date.now()}@sentinela.test`;
const consoleErrors = [];
const results = [];
const ok = (n, c, x = "") => results.push({ name: n, pass: !!c, extra: x });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()); });
page.on("pageerror", (e) => consoleErrors.push("pageerror: " + e.message));
try {
  await onboard(page, email);

  // Garante que NENHUM service worker está registrado (o "porteiro" que matava a navegação client-side).
  const swRegs = await page.evaluate(async () => {
    if (!navigator.serviceWorker) return 0;
    const r = await navigator.serviceWorker.getRegistrations();
    return r.length;
  });
  ok("nenhum service worker registrado (sem 'porteiro' p/ travar navegação)", swRegs === 0, `regs=${swRegs}`);

  // Vai pro dashboard como ponto de partida estável e clica CADA item do sidebar.
  await page.goto(`${BASE}/dashboard`, { waitUntil: "networkidle" });
  await page.waitForSelector("aside nav", { timeout: 10000 });

  for (const r of ROTAS) {
    // parte SEMPRE de uma rota DIFERENTE da alvo, p/ provar que o clique realmente troca a URL
    // (senão o item da rota atual — ex.: Dashboard partindo do Dashboard — daria "não mudou" falso).
    const from = r.path === "/dashboard" ? "/radar" : "/dashboard";
    if (new URL(page.url()).pathname !== from) {
      await page.goto(`${BASE}${from}`, { waitUntil: "networkidle" });
      await page.waitForSelector("aside nav", { timeout: 10000 });
    }
    const antes = new URL(page.url()).pathname;
    // CLICA no link do sidebar (não page.goto!)
    await page.locator(`aside nav a:has-text("${r.label}")`).first().click();
    let navegou = false;
    try { await page.waitForURL(`**${r.path}`, { timeout: 12000 }); navegou = true; } catch { /* não navegou */ }
    const depois = new URL(page.url()).pathname;
    const corpo = await page.locator("main").innerText().catch(() => "");
    ok(`sidebar → "${r.label}": clique navega p/ ${r.path}`, navegou && depois === r.path && depois !== antes, `antes=${antes} depois=${depois}`);
    ok(`sidebar → "${r.label}": tela renderiza conteúdo`, r.marca.test(corpo) && corpo.length > 40, `len=${corpo.length}`);
  }

  await page.screenshot({ path: `${SHOTS}/navegacao-sidebar.png`, fullPage: true });
  ok("console sem erros durante a navegação", consoleErrors.length === 0, consoleErrors.slice(0, 4).join(" | "));
} catch (e) {
  ok("FLUXO NAVEGAÇÃO SIDEBAR", false, String(e));
  await page.screenshot({ path: `${SHOTS}/navegacao-ERRO.png`, fullPage: true }).catch(() => {});
} finally {
  await browser.close();
  await cleanup(email);
}

console.log("\n===== AUTOTESTE NAVEGAÇÃO DO SIDEBAR (clicando) =====");
let fail = 0;
for (const r of results) { console.log(`${r.pass ? "✅" : "❌"} ${r.name}${r.extra ? "  — " + r.extra : ""}`); if (!r.pass) fail++; }
console.log(fail ? `\n${fail} FALHA(S)` : "\nTODOS PASSARAM");
process.exit(fail ? 1 : 0);
