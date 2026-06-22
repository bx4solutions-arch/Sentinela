# PROMPT — SUÍTE 100% VERDE + BUGS REAIS (auditoria do Codex CONFIRMADA por evidência)

**Contexto:** o Codex auditou e está **correto em todos os pontos** (verificado linha a linha). O teste de integração principal passa, MAS a suíte completa **não está verde** por testes velhos virando **falso-negativo**, + **2 bugs reais** (Recharts, dedupe de cidade). Corrigir tudo até a **suíte INTEIRA** ficar verde e o console 100% limpo.

**Régua:** `docs/REGUA-DE-EXECUCAO-E-AUTOTESTE.md`. **Use graphify** para navegar (economia de token). Autoteste prova o **RESULTADO**. **Sem push.** Migration aditiva — **cuidado com a unique constraint** (dedupe antes). IA só BYOK.

---

## FIX 1 — Testes velhos clicam no botão ERRADO (falso-negativo)
Arquivos: `e2e/autotest-radar.mjs` (L82), `autotest-kanban.mjs` (L28), `autotest-dashboard.mjs` (L59), `autotest-frontend.mjs` (L34).
- **Problema:** `button:has-text('Monitorar').first()` pega o botão **"Monitorar cidade"** (que hoje aparece ANTES dos cards), não o card → "Monitorando" nunca aparece → timeout.
- **Fix:** escopar o seletor ao **card do edital** (container do card, ou `getByRole`/texto do objeto, ou um **`data-testid="card-monitorar"`** no botão do card). Proibido `.first()` global. Mesma correção nos 4 testes.

## FIX 2 — `autotest-licitacao` desatualizado
Arquivo: `e2e/autotest-licitacao.mjs` (L32–33).
- **Problema:** espera aba "Concorrentes" e `'Analisar com IA'.isDisabled()`; a UI atual tem outras abas e mostra **"Ligar IA (Configurações)"** sem BYOK.
- **Fix:** atualizar para as abas reais da Pasta + os dois estados do botão: **sem BYOK → "Ligar IA"** (link p/ Configurações, inerte como ação de IA); **com BYOK → "Analisar com IA"** habilitado. Testar os dois caminhos.

## FIX 3 — `autotest-backfill` desatualizado
Arquivo: `e2e/autotest-backfill.mjs` (L28).
- **Problema:** espera "estado SP fallback (sem cidade)" no radar inicial, mas o onboarding **já monitora a cidade da empresa automaticamente** (commit 7976985).
- **Fix:** atualizar o estado inicial esperado (cidade da empresa já monitorada) **ou** usar uma empresa cuja cidade NÃO esteja coletada para testar o fluxo "pendente".

## FIX 4 — Recharts width/height -1 (bug visual real)
Arquivos: `components/charts.tsx` (ResponsiveContainer `height="100%"` L26/48/80) + `app/(shell)/dashboard/page.tsx`.
- **Problema:** `ResponsiveContainer height="100%"` sem altura explícita no pai → warning "-1" no console + risco do gráfico não renderizar.
- **Fix:** dar **altura explícita** ao wrapper de cada gráfico (ex.: `<div style={{height:220}}>…</div>` ou `height={220}` no ResponsiveContainer). DoD: **console limpo de verdade, zero warning do Recharts.**

## FIX 5 — Duplicação / normalização de cidade
Arquivos: `app/(shell)/radar/actions.ts` (`monitorarCidade`), `lib/ibge.ts`, migration da `celula`.
- **Problema:** o `upsert(..., onConflict:"tenant_id,codigo_ibge")` precisa de uma **UNIQUE (tenant_id, codigo_ibge)** que **não existe** nas migrations → dedupe pode falhar/duplicar. O `municipio` não é normalizado.
- **Fix:** (a) **dedupe as linhas duplicadas existentes de `celula`** e então criar `UNIQUE (tenant_id, codigo_ibge)` (migration aditiva; **se precisar APAGAR duplicata real, PARA e confirma** — gate destrutivo); (b) **normalizar o nome** (`trim` + Title Case) na gravação e exibição; (c) o CityPicker não deixa adicionar a mesma cidade duas vezes.

## FIX 6 — `RELATORIO-INTEGRACAO.md` honesto
- Deixar explícito: o **teste principal (integração) passa**; os testes velhos eram **falso-negativo** e foram corrigidos; e **"100%" = 100% das conexões EXISTENTES, não "produto completo"**. Listar o que segue "em ingestão" (contratos/atas/decisores).

---

## DoD — a SUÍTE INTEIRA verde (não só a integração)
1. **TODOS** os autotests verdes: radar, kanban, dashboard, frontend, **licitacao, backfill**, pasta, sinais, integracao, empresa. Rodar a suíte completa e colar a saída.
2. **Console limpo INCLUINDO zero warning do Recharts.**
3. Migration da unique constraint aplicada **sem perder dado** (dedupe antes; se for apagar duplicata, anota e confirma).
4. `graphify update .` · build/lint/tsc verdes · **commit local, sem push**.
5. Relatório atualizado + tabela "qual teste estava velho × o que foi corrigido".

## Anti-falsa-confiança
Não basta "consertar o teste pra passar" — o teste tem que clicar no **botão certo do card** e provar o **resultado real** (registro/rota certos). Teste que passa clicando no lugar errado é tão ruim quanto teste que falha por isso.
