// Runner agregador da suíte e2e — roda TODOS os autotests em sequência e falha
// se qualquer um falhar. Régua: "rodar a suíte completa e colar a saída".
// Uso: node e2e/run-all.mjs   (dev server em :3001)
import { spawnSync } from "node:child_process";

// Ordem: fluxo base (empresa/onboarding) primeiro, depois as telas.
// tour.mjs é demo (não faz parte do DoD da suíte) → fora.
const SUITE = [
  "e2e/autotest.mjs",            // empresa / onboarding / trocar (fluxo base)
  "e2e/autotest-radar.mjs",
  "e2e/autotest-kanban.mjs",
  "e2e/autotest-dashboard.mjs",
  "e2e/autotest-frontend.mjs",
  "e2e/autotest-licitacao.mjs",
  "e2e/autotest-backfill.mjs",
  "e2e/autotest-pasta.mjs",
  "e2e/autotest-sinais.mjs",
  "e2e/autotest-integracao.mjs",
  "e2e/autotest-harvester.mjs",   // Camada 1 nacional + Teste de Aceitação nº1
];

const summary = [];
const t0 = Date.now();
for (const file of SUITE) {
  console.log(`\n\n########## ${file} ##########`);
  const started = Date.now();
  const r = spawnSync("node", [file], { stdio: "inherit" });
  const secs = ((Date.now() - started) / 1000).toFixed(1);
  const passed = r.status === 0;
  summary.push({ file, passed, secs, status: r.status });
}

const total = ((Date.now() - t0) / 1000).toFixed(1);
console.log("\n\n================ SUÍTE COMPLETA ================");
let fails = 0;
for (const s of summary) {
  console.log(`${s.passed ? "✅" : "❌"} ${s.file}  (${s.secs}s)${s.passed ? "" : `  exit=${s.status}`}`);
  if (!s.passed) fails++;
}
console.log(`\n${summary.length} testes · ${total}s total`);
console.log(fails ? `\n${fails} TESTE(S) FALHARAM` : "\nSUÍTE INTEIRA VERDE ✅");
process.exit(fails ? 1 : 0);
