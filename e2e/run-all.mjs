// Runner por LISTA — roda os testes passados como argumentos (ou a suíte inteira se nenhum),
// cada um no seu próprio processo (memória liberada por teste), com retry-once p/ flake de carga.
// Uso:
//   node e2e/run-all.mjs                         # suíte inteira (precisa do servidor em :3001)
//   node e2e/run-all.mjs e2e/autotest-radar.mjs  # só esses arquivos
// CONFIÁVEL: orquestre via `node e2e/run-prod.mjs [--grupo=NOME]` (build 1x + servidor + grupos).
import { spawnSync } from "node:child_process";
import { SUITE } from "./groups.mjs";

const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const list = args.length ? args : SUITE;

const summary = [];
const t0 = Date.now();
for (const file of list) {
  console.log(`\n\n########## ${file} ##########`);
  const started = Date.now();
  let r = spawnSync("node", [file], { stdio: "inherit" });
  let retried = false;
  // retry UMA vez: flake de carga passa no re-run; falha 2x = falha real.
  if (r.status !== 0) {
    console.log(`\n--- ${file} falhou; retry 1x (flake de carga?) ---`);
    retried = true;
    r = spawnSync("node", [file], { stdio: "inherit" });
  }
  const secs = ((Date.now() - started) / 1000).toFixed(1);
  summary.push({ file, passed: r.status === 0, secs, status: r.status, retried });
}

const total = ((Date.now() - t0) / 1000).toFixed(1);
console.log("\n\n================ RESULTADO ================");
let fails = 0;
for (const s of summary) {
  console.log(`${s.passed ? "✅" : "❌"} ${s.file}  (${s.secs}s)${s.retried ? " [retry]" : ""}${s.passed ? "" : `  exit=${s.status}`}`);
  if (!s.passed) fails++;
}
console.log(`\n${summary.length} teste(s) · ${total}s`);
console.log(fails ? `\n${fails} TESTE(S) FALHARAM` : "\nTODOS VERDES ✅");
process.exit(fails ? 1 : 0);
