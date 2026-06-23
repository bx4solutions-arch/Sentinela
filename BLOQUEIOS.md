# BLOQUEIOS — sessões autônomas

## 2026-06-22 — RESOLVIDO: contratos (Camada 2) + deferido: nº de participantes/lances
- **RESOLVIDO** o blocker T4 abaixo: o endpoint `/v1/contratos?dataInicial&dataFinal` funciona **NACIONAL por data**
  (168.794 registros/mês). O 400 anterior era a variante `dataVigenciaInicial` (exige `dataInicial`) ou
  `cnpjOrgao` com `tamanhoPagina` pequeno. Probe: `worker/harvester/probe_contratos.py`.
- **Entregue (Bloco 1):** tabela `contratos` + harvester (`worker/harvester/contratos.py`) → **contrato vencendo**
  (`dataVigenciaFim`) + **quem ganhou** (`niFornecedor`/fornecedor vencedor + valor). Liga ao edital via
  `numeroControlePncpCompra`.
- **DEFERIDO (em ingestão, não forjado):** **nº de participantes / lances / desconto** por item — exige o endpoint
  de *resultado por item* do PNCP (`/contratacoes/{id}/itens/.../resultados`), que está **rate-limited (HTTP 429)**
  e é por-id (pesado). Fica na fila; a inteligência de "quem ganhou + preço" já vem do `contratos`.
- **Ligação edital↔contrato:** hoje baixa porque os contratos coletados (jun/2025) e os editais (recentes) são de
  janelas diferentes; cresce quando as janelas se sobrepõem (backfill).

## 2026-06-21 — T4 contratos: BLOQUEADO (PNCP /contratos → HTTP 400)
- O endpoint PNCP `/v1/contratos?cnpjOrgao=…&dataInicial=…&dataFinal=…` retorna **400** para os órgãos
  municipais coletados (Santos etc.), mesmo com janela ≤364 dias. O harvester original já registrava
  **contratos: 0** no `_meta.json` — a fonte não está fluindo para esses órgãos.
- **Impacto:** o sinal **"contrato vencendo / recompra"** fica **"em ingestão"** (não forjado).
- **Pulei** (régua: anotar e seguir). **Próximo:** investigar a variante correta do endpoint de contratos
  do PNCP (possível `/contratos/atualizacao` ou parâmetros distintos) ou outra fonte (Transparência/SIASG).

## Contornado (sessão 2026-06-20)
- PNCP HTTP 500 em fatias do backfill → worker pula a fatia e continua (Santos: 3.944 editais, 0 puladas).

## Pendências de polish (não bloqueiam)
- Port 1:1 pixel do `sentinela-dossie.html` (a Pasta está rica e funcional, sem-verde, mas não pixel-a-pixel).
- Filtros do Radar (modalidade, faixa de valor, tipo de sinal) — hoje: nicho + cidade. Próximo incremento.
- Pilar "Antecipação (PCA)" no Radar — PCA (17k) ainda não renderizado (dado fino p/ alguns nichos).
- Worker de backfill em loop contínuo (hoje rodado `--once`; produção: `python3 worker/backfill_worker.py`).
