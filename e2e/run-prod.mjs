// Runner ESTÁVEL — build de PRODUÇÃO 1x + UM servidor (next start :3001) reusado por todos os grupos.
// Roda os testes em GRUPOS por domínio (e2e/groups.mjs), cada grupo num subprocesso próprio → a memória
// do runner/Chromium é liberada ENTRE grupos, evitando o run-inteiro morrer (OOM) na máquina.
//
// USO:
//   node e2e/run-prod.mjs                 # build 1x + roda TODOS os grupos em sequência (placar por grupo)
//   node e2e/run-prod.mjs --grupo=raiox   # build 1x + roda SÓ o grupo "raiox"
//   node e2e/run-prod.mjs --grupo=raiox --no-build   # reusa o .next existente (sem rebuildar)
//   node e2e/run-prod.mjs --no-build      # todos os grupos, sem rebuildar
// Grupos: empresa · descoberta · dados · dashboard · inteligencia · raiox · ia  (ver e2e/groups.mjs)
import { spawn, spawnSync } from "node:child_process";
import { GROUPS } from "./groups.mjs";

const log = (m) => console.log(`[run-prod] ${m}`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function up(url, tries = 60) {
  for (let i = 0; i < tries; i++) {
    try { const r = await fetch(url, { signal: AbortSignal.timeout(2500) }); if (r.status === 200) return true; } catch { /* ainda subindo */ }
    await sleep(1000);
  }
  return false;
}

// --grupo=NOME (um grupo) ou nada (todos). Valida o nome.
const grupoArg = (process.argv.find((a) => a.startsWith("--grupo=")) || "").split("=")[1];
if (grupoArg && !GROUPS[grupoArg]) {
  log(`grupo desconhecido: "${grupoArg}". Grupos: ${Object.keys(GROUPS).join(", ")}`);
  process.exit(2);
}
const ordem = grupoArg ? [grupoArg] : Object.keys(GROUPS);

// 1) libera a porta 3001 (dev ou prod anterior)
spawnSync("pkill", ["-f", "next dev"]);
spawnSync("pkill", ["-f", "next start"]);
await sleep(1500);

// 2) build de produção (1x)
if (!process.argv.includes("--no-build")) {
  log("next build…");
  if (spawnSync("npm", ["run", "build"], { stdio: "inherit" }).status !== 0) { log("BUILD FALHOU"); process.exit(1); }
}

// 3) UM servidor de produção, reusado por todos os grupos
log("next start -p 3001…");
const srv = spawn("npx", ["next", "start", "-p", "3001"], { stdio: "ignore" });
const placar = [];
try {
  if (!await up("http://localhost:3001/login")) { log("prod não subiu a tempo"); throw new Error("server timeout"); }
  log(`prod pronto — grupos: ${ordem.join(", ")}`);
  for (const g of ordem) {
    log(`▶ grupo "${g}" (${GROUPS[g].length} testes)`);
    const started = Date.now();
    // subprocesso por grupo: ao sair, libera memória do runner/Chromium antes do próximo grupo.
    const st = spawnSync("node", ["e2e/run-all.mjs", ...GROUPS[g]], { stdio: "inherit" }).status ?? 1;
    placar.push({ grupo: g, ok: st === 0, secs: ((Date.now() - started) / 1000).toFixed(1) });
    await sleep(3000); // respiro p/ o SO recuperar memória entre grupos
  }
} finally {
  srv.kill("SIGKILL");
  spawnSync("pkill", ["-f", "next start"]);
}

console.log("\n================ PLACAR POR GRUPO ================");
let fails = 0;
for (const p of placar) { console.log(`${p.ok ? "✅" : "❌"} grupo ${p.grupo}  (${p.secs}s)`); if (!p.ok) fails++; }
console.log(fails ? `\n${fails} GRUPO(S) FALHARAM` : `\n${placar.length}/${placar.length} GRUPOS VERDES ✅`);
log("fim. Reinicie o dev com 'npm run dev' se for continuar desenvolvendo.");
process.exit(fails ? 1 : 0);
