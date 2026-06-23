// Runner agregador da suíte e2e — roda TODOS os autotests em sequência e falha
// se qualquer um falhar. Régua: "rodar a suíte completa e colar a saída".
// Uso: node e2e/run-all.mjs   (servidor em :3001)
// CONFIÁVEL (recomendado): `node e2e/run-prod.mjs` roda contra um BUILD DE PRODUÇÃO — estável sob
// carga (o dev server/Turbopack degrada com HMR após muitas rodadas e gera flake). Este runner tem
// retry-once para flake residual.
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
  "e2e/autotest-antecipacao.mjs", // Etapa 2: Antecipação (PCA + recorrência) + Linha do Tempo
  "e2e/autotest-contratos.mjs",   // Bloco 1: Camada 2 (contrato vencendo + quem ganhou)
  "e2e/autotest-sala.mjs",        // Bloco 2: Sala de Guerra (inteligência) + Dashboard (tarefas)
  "e2e/autotest-pesquisa.mjs",    // Bloco 3: Pesquisa livre (concorrente/órgão/item)
  "e2e/autotest-preco.mjs",       // Bloco 4/M2: Motor de Preço (faixa/CV/inexequibilidade)
  "e2e/autotest-consultor.mjs",   // Bloco 5: Consultor determinístico citando Lei 14.133
];

const summary = [];
const t0 = Date.now();
for (const file of SUITE) {
  console.log(`\n\n########## ${file} ##########`);
  const started = Date.now();
  let r = spawnSync("node", [file], { stdio: "inherit" });
  let retried = false;
  // retry UMA vez: flake de carga (dev server sob 16 testes) passa no re-run; falha 2x = falha real.
  if (r.status !== 0) {
    console.log(`\n--- ${file} falhou; retry 1x (flake de carga?) ---`);
    retried = true;
    r = spawnSync("node", [file], { stdio: "inherit" });
  }
  const secs = ((Date.now() - started) / 1000).toFixed(1);
  summary.push({ file, passed: r.status === 0, secs, status: r.status, retried });
}

const total = ((Date.now() - t0) / 1000).toFixed(1);
console.log("\n\n================ SUÍTE COMPLETA ================");
let fails = 0;
for (const s of summary) {
  console.log(`${s.passed ? "✅" : "❌"} ${s.file}  (${s.secs}s)${s.retried ? " [retry]" : ""}${s.passed ? "" : `  exit=${s.status}`}`);
  if (!s.passed) fails++;
}
console.log(`\n${summary.length} testes · ${total}s total`);
console.log(fails ? `\n${fails} TESTE(S) FALHARAM` : "\nSUÍTE INTEIRA VERDE ✅");
process.exit(fails ? 1 : 0);
