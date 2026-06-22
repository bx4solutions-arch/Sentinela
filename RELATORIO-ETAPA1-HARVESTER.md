# RELATÓRIO — ETAPA 1: Camada 1 (Harvester Diário Nacional) — 2026-06-22

**Objetivo:** puxar o metadado de TODOS os editais novos do Brasil, diário, via PNCP — destravando
buscar qualquer cidade/nicho e o **Teste de Aceitação nº1** ("controle de vetores no Piauí"). Só metadado;
documento é Camada 3 (on-demand no clique). Aditivo, sem push, IA só BYOK.

## 1.1 Probe (decisão de arquitetura)
`/contratacoes/publicacao` aceita consulta **NACIONAL por data** (sem município/UF); `codigoModalidadeContratacao`
é **obrigatório**. → Eixo de iteração = **(janela de data × modalidade 1..14), nacional**. NUNCA itera
município (5570) nem UF (27). Detalhe: `worker/harvester/PROBE-NACIONAL.md`.

## 1.2 Harvester nacional (`worker/harvester/nacional.py`)
- Metadado → **upsert direto** no Supabase (`raw_editais` on_conflict=numero_controle_pncp; `orgao` on_conflict=cnpj). Idempotente.
- **Não baixa documento.** Retry/backoff + checkpoint por fatia (`_checkpoint_nacional.json`).
- **CANARY** (`_canary_nacional.json`): valida campos críticos (numeroControlePNCP, cnpj, ufSigla, situacaoCompraNome) + diversidade de UF; `alerta:true` se o PNCP mudar schema (falha silenciosa é o risco real). Último run: **alerta:false**.

## 1.3 Backfill + cron
- **Smoke 1 dia:** +5.687 editais, **27 UFs**, canary ok, ~10min.
- **Backfill 30 dias:** rodando (worker local/dev). Cron/delta diário + `--loop` documentados em `worker/harvester/RUNBOOK-NACIONAL.md`. Produção → VPS depois (só alinhamento).

## 1.4 Radar: busca por nicho + situação (migration 0012)
- **Migration aditiva 0012** (APLICADA, gate de schema OK): `pg_trgm` + **índice GIN trigram** em `raw_editais.objeto`. EXPLAIN confirma `Bitmap Index Scan on ix_edit_objeto_trgm` (ilike por substring não varre a tabela).
- **Busca livre** no Radar (`lib/nichos.ts` + `app/(shell)/radar/page.tsx`): campo de objeto + UF; **sinônimos** (`controle de vetores`, `dengue`, `endemias`, `dedetização`, `controle de pragas`…) — `ilike "mosquito"` sozinho voltaria vazio. UF inferida do texto ("no Piauí"→PI) ou explícita. Filtro de **abertas** (exclui Revogada/Anulada; prazo futuro ou desconhecido). Caminho default do Radar inalterado (suíte não regride).

## 1.5 Prova (autoteste `e2e/autotest-harvester.mjs` — RESULTADO, não presença)
| Prova | Resultado |
|---|---|
| Harvest nacional: UFs distintas | **27** (Brasil inteiro) |
| `situacao_nome` presente | 100% (0 nulos em 68.555) |
| Busca-aberta de vetor/pragas (Brasil) | **32 abertos** |
| **PI coberto** | **4.853 editais** |
| **PI vetor/pragas (real)** | **9 editais** |
| PI vetor **aberto** esta semana | 0 → **vazio verdadeiro, não bug** (capacidade provada, sem aberto no PI nesta janela) |
| Busca UI "controle de vetores" em SP | **14 cards reais** (screenshot) |
| Aceitação nº1 — vetor no PI na UI | renderiza certo (vazio honesto) — screenshots `e2e/shots/harvester-*.png` |

**Teste de Aceitação nº1 = capacidade provada:** a busca por nicho funciona (sinônimos casam) e o **PI está
coberto no banco** com editais reais de vetor/pragas. Quando houver um vetor **aberto** no PI numa semana, ele aparece.

### Crescimento (antes → depois do harvest nacional)
- `raw_editais`: 53.433 → **68.555+** (backfill em andamento) · UFs: **2 → 27** · `orgao`: 321 → **~5.000+**.
- Distribuição: todas as 27 UFs presentes (SP dominante pelo histórico anterior; PI 4.853; RS/SC/MG/PR/RJ/DF/BA/GO… no ar).

## Suíte
`node e2e/run-all.mjs` → **11/11 verde** (2 runs seguidos; integração endurecida com poll-until-condition no lugar de sleeps fixos). tsc + lint + build verdes. Console limpo. Commit local, sem push.

## Próximo (não nesta etapa)
Etapa 2 (antecipação: classificar PCA→nicho + linha do tempo, busca semântica) · estender backfill 60–90d · contratos/atas/resultado na fila.
