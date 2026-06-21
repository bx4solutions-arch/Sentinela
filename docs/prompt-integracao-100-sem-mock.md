# PROMPT — INTEGRAÇÃO BACK ↔ FRONT 100% SEM MOCK + PROVA DE CADA CONEXÃO E BOTÃO

**Objetivo (Bione):** zero mock; o backend ligado ao front em **100% das conexões**, com **evidência** de que tudo roda; e ao clicar **qualquer** botão, **nada vai para o lugar errado** — tudo certo.

**Régua:** `docs/REGUA-DE-EXECUCAO-E-AUTOTESTE.md`. **"Verde" só conta se a asserção provar o RESULTADO** (dado real + registro certo + URL/rota certa), nunca a presença do elemento. Aditivo, **sem push**, sem segredo, IA só BYOK. **Use o graphify** (`graphify query/path/explain`) para mapear as conexões e economizar tokens; `graphify update .` ao final.

---

## PARTE 0 — Matar o mock DE VEZ
- Migrar ou **REMOVER** toda tela que ainda importa `lib/mock` (hoje: `app/(shell)/dossie/[id]`, `app/(shell)/esteira/`, `app/(shell)/esteira/[id]`). Se forem telas órfãs (fora do menu), **deletar**.
- **Evidência obrigatória:** `grep -rl "lib/mock" app components` retorna **VAZIO**. Em seguida, deletar `lib/mock.ts` (se nada mais o usa) e rodar o grep de novo → vazio. Confirmar via graphify que `mock.ts` **não é mais god node**.

## PARTE 1 — MATRIZ DE CONEXÕES (todo dado do front vem do back real)
Use graphify para enumerar: cada **rota/página** e cada **componente que lê dado** → a **server action/query** → a **tabela/endpoint** Supabase. Monte a matriz para TODAS as telas (Dashboard, Radar, Pasta `licitacao/[id]`, Kanban, Minha Empresa, Configurações, Onboarding, Consultor):

| Tela / Componente | Fonte (action / query / tabela) | Lê dado REAL? | Evidência |
|---|---|---|---|

- Cada linha prova que retorna **dado real do Supabase** (não mock, não vazio forjado): contagem + 1 sample da query.
- **Cobertura no fim:** "Conexões: N/N = 100%" ou lista explícita do que falta e por quê.

## PARTE 2 — MATRIZ DE BOTÕES/AÇÕES (nada no lugar errado)
Enumerar **TODO** elemento interativo de **TODA** tela (botão, link, form, toggle, filtro, drag do Kanban). Para cada: o destino/efeito **esperado** + a **prova do efeito real**, conferindo que é o **CERTO**:

| Tela | Elemento | Ação esperada | Prova (resultado correto) | Status |
|---|---|---|---|---|

**Regras de "lugar certo" (o que o Bione exige):**
- **Navegação:** a rota de destino contém o **ID/recurso certo** — ex.: "Analisar" a licitação X → `/licitacao/X` (o id de X, não outro), e a Pasta carrega os dados **de X**.
- **Ação de estado:** muda o **registro certo** — "Monitorar X" → linha de **X** em monitorando/Kanban (não outra); "Descartar X" → só **X** some + motivo salvo.
- **Form:** salva os **campos certos no registro certo** (query confirma).
- **Toggle/filtro:** muda exatamente o que promete (contagem antes ≠ depois **e** o conteúdo bate o filtro).
- **Desabilitado "em breve":** realmente **inerte** (não navega), com rótulo claro.
- **Nenhum elemento pode:** navegar pro lugar errado · salvar no registro errado · clicar-e-morrer.

## PARTE 3 — AUTOTESTE E2E QUE PROVA (não seleciona)
- Playwright percorre cada tela, clica **cada** elemento da matriz e **ASSERTA o resultado**: URL/rota certa, **row certa no banco via query**, estado mudou, screenshot.
- **Console do navegador: zero erro.** **Network: nenhuma 4xx/5xx inesperada** nas ações.
- Rodar com a conta **real (TN Santos)** e com a de teste; conferir que os dados são do **tenant certo** (RLS isolando).

---

## ENTREGA / EVIDÊNCIA (o que comprova 100%)
1. **`RELATORIO-INTEGRACAO.md`** com as **2 matrizes** (Conexões + Botões), cada linha com status ✅ e a evidência (query/URL/screenshot). Cabeçalho: **"Conexões 100% (N/N) · Botões 100% (M/M)"**.
2. **grep final** provando zero `lib/mock` + graphify confirmando que mock saiu dos god nodes.
3. **Build/lint/tsc verdes, console limpo, network sem erro.**
4. Pasta `e2e/shots/integracao/` com um screenshot por tela/ação crítica.
5. **Commit local. Sem push.**

## Régua anti-falsa-confiança (a lição das vezes anteriores)
Botão que **existe mas não faz nada**, ou faz a **coisa errada** (navega/salva no lugar errado), é **❌**, não ✅. Se algo não fechar 100%, **listar explicitamente** o que falta — proibido maquiar com seletor verde. O Bione vai conferir a matriz linha a linha.
