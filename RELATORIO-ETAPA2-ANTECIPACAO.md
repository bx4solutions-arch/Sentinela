# RELATÓRIO — ETAPA 2: Acender a Antecipação (PCA → nicho + Linha do Tempo) — 2026-06-22

**Objetivo:** sair de "descobrir o edital aberto" (Etapa 1) para **ver a licitação se FORMANDO antes do edital**.
O sinal já estava no banco (raw_pca 17k + recorrência dos homologados); faltava **classificar por nicho** e **mostrar**.
Régua: probabilidade, nunca promessa. Aditivo, sem push, IA só BYOK, suíte INTEIRA verde.

## T1 — PCA pesquisável por nicho
- **Migration 0013** (aplicada): `pg_trgm` + **GIN trigram** em `raw_pca.descricao_item` — o PCA fica pesquisável por nicho como o edital.
- `lib/nichos.ts`: sinônimos apertados (tokens distintos) reusados na busca de PCA e edital.

## T2 — Radar com 2 pilares
- `app/(shell)/radar/page.tsx`: abas por URL (`?pilar=`) — **Licitação do Dia** (abertos) × **Antecipação** (pré-edital).
- **Antecipação = PCA (planejado) + recorrência (homologados)**. PCA municipal é raro (lição F0) → a recorrência preenche onde o PCA falta. `lib/antecipacao.ts` centraliza as duas queries.
- Cada card: órgão, objeto, valor, data; selo "PCA {ano}" ou "recorrência". **Linguagem calibrada:** "planejado — pode virar edital" / "já contratou — tende a repetir". Sem número de chance.

## T3 — Linha do Tempo de Sinais (Dashboard)
- `app/(shell)/dashboard/page.tsx`: seção "Linha do Tempo de Sinais" — **só o que tem dado**: PCA publicado, recorrência detectada, republicação (fracassada/deserta via `situacao`). Contrato vencendo segue **"em ingestão"** (não forjado). `montarLinhaDoTempo` em `lib/antecipacao.ts`.

## Performance — busca nacional em escala (o trabalho duro desta etapa)
A busca livre por (nicho × UF) sobre 100k+ editais **dava timeout**: nem o join `orgao.uf_sigla` (lento na recorrência) nem `cnpj_orgao IN (...)` (estoura em UF grande como SP) escalavam.
- **Migration 0015** (aplicada, **gate de schema com seu OK**): **denormaliza `uf_sigla`** em `raw_editais`/`raw_pca` (coluna + backfill via orgao + índice). Busca = `uf_sigla` (índice) + `objeto` (trigram) na mesma tabela = **BitmapAnd rápido em qualquer UF**.
- **Migration 0014**: índice `orgao(uf_sigla)`.
- Recorrência: **sem `ORDER BY` no banco** (caro sobre o conjunto homologado nacional) → ordena em memória após o limit.
- Harvester (`nacional.py`) atualizado para gravar `uf_sigla` nos novos editais.
- **Medições (pós-fix):** busca aberta SP **1.9s** · PI/MG/RS **<250ms** · recorrência SP **0.66s** · PI **0.26s**. Sem timeout.

## Prova (autoteste `e2e/autotest-antecipacao.mjs` — RESULTADO)
| Prova | Resultado |
|---|---|
| Índice GIN trgm do PCA | existe |
| PCA pesquisável por nicho (vetor/pragas BR) | 3 |
| **Antecipação vetor no PI = PCA + recorrência** | PCA 0 + **recorrência 8** ≥ 1 ✅ |
| Radar com 2 pilares | ✅ |
| **Aceitação antecipação: vetor no PI** | **8 cards reais** (recorrência) — capacidade provada |
| Linguagem calibrada (probabilidade, não promessa) | ✅ |
| Linha do Tempo no Dashboard | **14 sinais reais** |

**Aceitação nº1 (nível antecipação):** buscar "controle de vetores/dengue no Piauí" no pilar Antecipação →
retorna itens reais de órgãos do PI (recorrência, já que o PCA de vetor no PI é vazio verdadeiro). PCA + recorrência
garante sinal mesmo onde o PCA é fraco — exatamente a estratégia anti-frustração.

## Suíte
`node e2e/run-all.mjs` → **12/12 verde**. tsc + lint + build verdes. Console limpo. `graphify update`. Commit local, sem push.

## Honestidade / em ingestão (não forjado)
- PCA municipal é raro → Antecipação combina PCA + recorrência (não só PCA).
- Contrato vencendo, participação/resultado seguem **na fila** (Camada 2), marcados "em ingestão".

## Próximo (não nesta etapa)
Migração M1+M2 (infra VPS + motor de preço → Sala de Guerra preço + busca item+cidade) · Camada 2 (resultado/participação) · estender backfill 60–90d.
