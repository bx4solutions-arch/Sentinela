# PROMPT DE KICKOFF — INÍCIO DA TRANSFORMAÇÃO (Claude Code)

**Fonte de verdade:** `docs/00-PLANO-MESTRE-CONSTRUCAO.md` (leia primeiro — tem o fluxo, as 3 trilhas, a arquitetura de 3 camadas e o teste de aceitação nº1).
**Régua:** `docs/REGUA-DE-EXECUCAO-E-AUTOTESTE.md`. **Use graphify** pra navegar (economia de token); `graphify update` ao final. Autoteste prova o **RESULTADO** (registro/rota certos), **zero botão fake**. Aditivo, **sem push**, sem segredo, IA só BYOK. Suíte INTEIRA verde a cada entrega.

---

## ETAPA 0 — ESTABILIZAR (antes de qualquer feature nova)
1. **Commitar o fix que ficou solto** (o erro 529 interrompeu antes do commit): testes escopados ao card (`data-testid`), Recharts com altura explícita, dedupe/normalização de cidade — em `app/`, `lib/`, `components/`, `e2e/`.
2. **Concluir `docs/prompt-fix-suite-100.md`** → a **SUÍTE INTEIRA verde**: radar, kanban, dashboard, frontend, **licitacao, backfill**, pasta, sinais, integracao, empresa. **Console limpo (zero warning Recharts -1).**
3. **🚦 STOP — reportar a suíte 100% verde** (colar a saída) antes da Etapa 1.

## ETAPA 1 — CAMADA 1: HARVESTER DIÁRIO NACIONAL (Descoberta)
O que destrava a busca por qualquer cidade/nicho e o **teste de aceitação nº1** (mosquito no PI).
- **Construir o job que puxa o METADADO de TODOS os editais novos do Brasil, diário, via PNCP** — **não** por cidade fixa. Sondar o endpoint de publicação por **data nacional** (`/contratacoes/publicacao` por `dataInicial/dataFinal` + modalidade); se exigir município, iterar — é **job noturno**, não tempo real.
- **Só metadado** (KB por edital — órgão, objeto, valor, datas, modalidade, **situacao**), grava em `raw_editais`/`orgao`. **Não baixar documento** aqui (Camada 3, no clique).
- **Expor `situacao`** para filtrar **abertas / em andamento** (prazo não passou) — o produto mostra o que está **lançado e ainda aberto**, não só histórico.
- **Resiliência:** retry/backoff/checkpoint + **CANARY** (alerta se o PNCP mudar de schema ou sumir — o risco real é falha silenciosa). Agendar (cron/worker contínuo), **não só `--once`**.
- **Autoteste (prova o resultado):** rodar o harvest de 1 dia → a contagem de `raw_editais` cresce com editais de **várias UFs** (não só SP/PI). Conferir `situacao` presente.
- **Teste de aceitação nº1 (DoD desta etapa):** com o PI coberto, **buscar "controle de mosquito / vetor no Piauí"** no Radar → **retorna editais reais, abertos, de órgãos do PI**. Screenshot.

Migrations aditivas; commit local (sem push); relatório com as contagens por UF + a prova do teste de aceitação.

---

## Depois (só pra você saber a direção — não construir ainda)
Etapa 2 acender a Antecipação (classificar PCA→nicho + Linha do Tempo) · Etapa 3 migração infra+motor de preço · Etapa 4 Camada 2 (resultado/participação) · Etapa 5 pesquisa livre · Etapa 6 Consultor + Gerente de Participação. Detalhe em `docs/00-PLANO-MESTRE-CONSTRUCAO.md`.

## NÃO fazer agora
- Não baixar documento de tudo (Camada 3 é on-demand no clique).
- Não construir as Etapas 2+ antes da Etapa 0 (suíte) e da Etapa 1 (descoberta) fecharem.
- Não forjar dado que não existe; não congelar feature por falta de dado — a fonte está na fila.
