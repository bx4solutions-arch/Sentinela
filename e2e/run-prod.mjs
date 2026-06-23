// Runner ESTÁVEL — roda a suíte e2e contra um build de PRODUÇÃO (next start), não o dev server.
// O dev server (Turbopack + HMR) degrada sob 17 testes sequenciais e gera flake; produção é estável
// (sem recompilação por request, sem vazamento de HMR). Uso:
//   node e2e/run-prod.mjs            # build + start prod :3001 + suíte + stop
//   node e2e/run-prod.mjs --no-build # pula o build (reusa o .next existente)
import { spawn, spawnSync } from "node:child_process";

const log = (m) => console.log(`[run-prod] ${m}`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function up(url, tries = 60) {
  for (let i = 0; i < tries; i++) {
    try { const r = await fetch(url, { signal: AbortSignal.timeout(2500) }); if (r.status === 200) return true; } catch { /* ainda subindo */ }
    await sleep(1000);
  }
  return false;
}

// 1) libera a porta 3001 (dev ou prod anterior)
spawnSync("pkill", ["-f", "next dev"]);
spawnSync("pkill", ["-f", "next start"]);
await sleep(1500);

// 2) build de produção
if (!process.argv.includes("--no-build")) {
  log("next build…");
  if (spawnSync("npm", ["run", "build"], { stdio: "inherit" }).status !== 0) { log("BUILD FALHOU"); process.exit(1); }
}

// 3) sobe o servidor de produção
log("next start -p 3001…");
const srv = spawn("npx", ["next", "start", "-p", "3001"], { stdio: "ignore" });
let code = 1;
try {
  if (!await up("http://localhost:3001/login")) { log("prod não subiu a tempo"); throw new Error("server timeout"); }
  log("prod pronto — rodando suíte");
  // 4) roda a suíte (run-all já tem retry-once)
  code = spawnSync("node", ["e2e/run-all.mjs"], { stdio: "inherit" }).status ?? 1;
} finally {
  // 5) derruba o prod
  srv.kill("SIGKILL");
  spawnSync("pkill", ["-f", "next start"]);
  log(`fim (exit ${code}). Reinicie o dev com 'npm run dev' se for continuar desenvolvendo.`);
}
process.exit(code);
