// Autoteste E2E — BLOCO 6: Gerente de Participação (gerador seccionado + matriz + DOCX real).
// Prova o RESULTADO: montar a proposta seção por seção (confirmar) e EXPORTAR DOCX (download .docx);
// a Matriz de Atendimento liga item→evidência. Peça processual travada (gate).
import { chromium } from "playwright";
import { mkdirSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

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
async function cleanup(email) {
  const list = await (await fetch(`${SB}/auth/v1/admin/users`, { headers: H })).json();
  for (const u of list.users || []) if (u.email === email && u.email.endsWith("@sentinela.test")) await fetch(`${SB}/auth/v1/admin/users/${u.id}`, { method: "DELETE", headers: H });
}

const email = `qa_prop_${Date.now()}@sentinela.test`;
const consoleErrors = [];
const results = [];
const ok = (n, c, x = "") => results.push({ name: n, pass: !!c, extra: x });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
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

  await page.goto(`${BASE}/radar`, { waitUntil: "networkidle" });
  await page.waitForSelector("text=Sinais do seu recorte", { timeout: 10000 });
  await page.locator("[data-testid=card-analisar]").first().click();
  await page.waitForURL(/\/licitacao\/[0-9a-f-]+/, { timeout: 15000 });
  await page.waitForSelector("[data-testid=raiox-relatorio]", { timeout: 15000 });
  // aba Criador de Documentos: onde vive o gerador de proposta
  await page.locator("[data-testid=raiox-tab-criador]").click(); await page.waitForTimeout(400);

  ok("Gerador de Proposta presente", (await page.locator("[data-testid=proposta-gerador]").count()) > 0);
  const secoes = await page.locator("[data-testid=secao-proposta]").count();
  ok("Proposta montada por SEÇÕES (pré-preenchidas)", secoes >= 4, `seções=${secoes}`);
  ok("Matriz de atendimento (item → evidência) presente", (await page.locator("[data-testid=matriz-atendimento]").count()) > 0);

  // ===== Fatia 2 — editor por seção (editar · reordenar · adicionar · melhorar com IA) =====
  const MARK = `QAEDIT${Date.now()}`;
  const ta = page.locator("[data-testid=secao-textarea]");
  ok("seções têm textarea EDITÁVEL", (await ta.count()) >= 4, `textareas=${await ta.count()}`);
  // edita a 3ª seção (objeto) — permanece confirmada até a geração
  await ta.nth(2).fill(`${MARK} conteudo reescrito pelo usuario`);

  // reordenar (mover ↓ a 1ª seção troca a ordem dos títulos)
  const titulo = () => page.locator("[data-testid=secao-proposta]").first().locator("p.font-semibold").first().innerText();
  const tAntes = await titulo();
  await page.locator("[data-testid=mover-baixo]").first().click();
  const tDepois = await titulo();
  ok("reordenar seção (mover ↓ muda a ordem)", tAntes !== tDepois, `antes="${tAntes}" depois="${tDepois}"`);

  // adicionar seção (+1)
  const nAntes = await page.locator("[data-testid=secao-proposta]").count();
  await page.locator("[data-testid=add-secao]").click();
  const nDepois = await page.locator("[data-testid=secao-proposta]").count();
  ok("adicionar seção (+1)", nDepois === nAntes + 1, `${nAntes}→${nDepois}`);

  // melhorar com IA — graceful: sucesso (reescreve) OU honesto "em ingestão" sem chave; nunca quebra
  await page.locator("[data-testid=melhorar-ia]").first().click();
  await page.waitForSelector("[data-testid=ia-status]", { timeout: 25000 });
  const iaStatus = (await page.locator("[data-testid=ia-status]").first().innerText()).trim();
  ok("melhorar com IA responde (sucesso ou honesto 'em ingestão')", iaStatus.length > 0, iaStatus.slice(0, 70));

  // confirmar/des-confirmar uma seção (interação real)
  await page.locator("[data-testid=confirmar-secao]").first().click();
  // preço definido pela empresa
  await page.locator("[data-testid=input-preco]").fill("R$ 120.000,00");

  // EXPORTAR DOCX — captura o download real
  const [download] = await Promise.all([
    page.waitForEvent("download", { timeout: 15000 }),
    page.locator("[data-testid=gerar-docx]").click(),
  ]);
  const fn = download.suggestedFilename();
  ok("EXPORTA DOCX real (download .docx)", fn.endsWith(".docx"), `arquivo=${fn}`);
  const path = await download.path();
  ok("DOCX tem conteúdo (arquivo salvo)", !!path);
  ok("confirmação 'DOCX gerado' na UI", (await page.locator("[data-testid=docx-gerado]").count()) > 0);

  // PROVA da edição: o texto reescrito pelo usuário foi INJETADO no DOCX (document.xml do .docx/zip)
  let docXml = "";
  try { docXml = execFileSync("unzip", ["-p", path, "word/document.xml"], { encoding: "utf8", maxBuffer: 20 * 1024 * 1024 }); } catch (e) { docXml = "ERRO_UNZIP:" + String(e).slice(0, 60); }
  ok("edição do usuário INJETADA no DOCX (texto editado presente no document.xml)", docXml.includes(MARK), `markerNoDocx=${docXml.includes(MARK)}`);

  // ===== Fatia 3 — timbre + PDF + Kit de Habilitação (ZIP ordenado + índice) =====
  ok("timbre da empresa no DOCX (cabeçalho de identificação)", docXml.includes("CNPJ"), `temCNPJ=${docXml.includes("CNPJ")}`);
  ok("timbre-preview visível na UI", (await page.locator("[data-testid=timbre-preview]").count()) > 0);

  // PDF real
  const [dlPdf] = await Promise.all([
    page.waitForEvent("download", { timeout: 15000 }),
    page.locator("[data-testid=gerar-pdf]").click(),
  ]);
  ok("EXPORTA PDF real (download .pdf)", dlPdf.suggestedFilename().endsWith(".pdf"), `arquivo=${dlPdf.suggestedFilename()}`);
  ok("confirmação 'PDF gerado' na UI", (await page.locator("[data-testid=pdf-gerado]").count()) > 0);

  // Kit de Habilitação (ZIP)
  const [dlZip] = await Promise.all([
    page.waitForEvent("download", { timeout: 15000 }),
    page.locator("[data-testid=baixar-kit]").click(),
  ]);
  ok("Kit de Habilitação exporta ZIP (.zip)", dlZip.suggestedFilename().endsWith(".zip"), `arquivo=${dlZip.suggestedFilename()}`);
  const zpath = await dlZip.path();
  let zlist = ""; try { zlist = execFileSync("unzip", ["-l", zpath], { encoding: "utf8" }); } catch (e) { zlist = "ERRO:" + String(e).slice(0, 50); }
  ok("ZIP contém índice + proposta", zlist.includes("00-INDICE.txt") && zlist.includes("01-proposta.docx"), zlist.replace(/\s+/g, " ").slice(0, 110));
  let idx = ""; try { idx = execFileSync("unzip", ["-p", zpath, "00-INDICE.txt"], { encoding: "utf8" }); } catch { /* */ }
  ok("índice na ORDEM do edital (numerado 01., 02. …)", /KIT DE HABILITA/i.test(idx) && /\b01\./.test(idx), idx.split("\n").filter(Boolean).slice(0, 2).join(" | "));
  ok("confirmação 'Kit gerado' na UI", (await page.locator("[data-testid=kit-gerado]").count()) > 0);

  // ===== Fatia 4 — Matriz [Gerar]: declaração exigida que falta → inclui no documento =====
  await page.locator("[data-testid=toggle-decl]").first().click(); // desliga a 1ª declaração (idoneidade/"impeditivo")
  const matrizGerar = page.locator("[data-testid=matriz-item][data-tipo=declaracao] [data-testid=matriz-gerar]");
  ok("matriz: declaração desligada vira 'falta' + [Gerar]", (await matrizGerar.count()) >= 1, `gerar=${await matrizGerar.count()}`);

  // DOCX SEM a declaração — prova o gap real
  const [dlA] = await Promise.all([page.waitForEvent("download", { timeout: 15000 }), page.locator("[data-testid=gerar-docx]").click()]);
  let xmlA = ""; try { xmlA = execFileSync("unzip", ["-p", await dlA.path(), "word/document.xml"], { encoding: "utf8", maxBuffer: 20 * 1024 * 1024 }); } catch { /* */ }
  ok("matriz: declaração ausente NÃO está no DOCX (gap real)", !xmlA.includes("impeditivo"), `tinhaImpeditivo=${xmlA.includes("impeditivo")}`);

  // clica [Gerar] na matriz → amarra checklist → documento
  await matrizGerar.first().click();
  ok("matriz: [Gerar] marca a declaração como 'no documento ✓'", (await page.locator("[data-testid=matriz-item][data-tipo=declaracao] [data-testid=matriz-no-doc]").count()) >= 1);

  // DOCX agora COM a declaração — prova que [Gerar] injetou
  const [dlB] = await Promise.all([page.waitForEvent("download", { timeout: 15000 }), page.locator("[data-testid=gerar-docx]").click()]);
  let xmlB = ""; try { xmlB = execFileSync("unzip", ["-p", await dlB.path(), "word/document.xml"], { encoding: "utf8", maxBuffer: 20 * 1024 * 1024 }); } catch { /* */ }
  ok("matriz [Gerar] INJETOU a declaração no DOCX (item → evidência → gerar)", xmlB.includes("impeditivo"), `agoraImpeditivo=${xmlB.includes("impeditivo")}`);

  const body = await page.locator("body").innerText();
  ok("Gate jurídico: peça processual travada + revisar antes de protocolar", /travado|travados/i.test(body) && /revise antes de protocolar/i.test(body));
  await page.screenshot({ path: `${SHOTS}/proposta-gerador.png`, fullPage: true });

  ok("console sem erros", consoleErrors.length === 0, consoleErrors.slice(0, 4).join(" | "));
} catch (e) {
  ok("FLUXO PROPOSTA", false, String(e));
  await page.screenshot({ path: `${SHOTS}/proposta-ERRO.png`, fullPage: true }).catch(() => {});
} finally {
  await browser.close();
  await cleanup(email);
}

console.log("\n===== AUTOTESTE GERADOR DE PROPOSTA (Bloco 6) =====");
let fail = 0;
for (const r of results) { console.log(`${r.pass ? "✅" : "❌"} ${r.name}${r.extra ? "  — " + r.extra : ""}`); if (!r.pass) fail++; }
console.log(fail ? `\n${fail} FALHA(S)` : "\nTODOS PASSARAM");
process.exit(fail ? 1 : 0);
