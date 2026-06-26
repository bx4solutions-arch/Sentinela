# RUNBOOK — Harvester por Célula (Camada 1 · Descoberta)

`worker/harvester/nacional.py` — puxa o **metadado dos editais das CÉLULAS ATIVAS** (setor × região)
via PNCP (`/contratacoes/publicacao`). Só metadado; **não baixa documento** (Camada 3 é on-demand).
Upsert direto no Supabase (idempotente). Retry/backoff + checkpoint + **CANARY**.

> ⚠️ **Mudou (2026-06):** NÃO faz mais crawl nacional. O escopo vem de `cidade_coletada`
> (status `pronta`/`pendente`) via `scope.py`. Sem célula ativa → não coleta nada (nasce vazio).
> Guarda 2D **região × segmento**: só grava o que casa com a cidade/UF E os segmentos da célula.

## Escopo = quem o CLIENTE definiu

- Fonte da verdade: tabela `cidade_coletada`. Cada linha é uma **unidade de coleta**:
  - `nivel='municipio'` → filtro server-side `codigoMunicipioIbge`
  - `nivel='estado'`    → filtro server-side `uf=` (estado inteiro numa query — eficiente)
  - `segmentos[]` → corte por setor (vazio = todos). Editais fora do segmento não são gravados.
- O cliente define isso na UI **Configurações → Monitoramento** (cidade/estado + segmentos).
  Ao salvar, cria a `celula` (do tenant) e faz upsert em `cidade_coletada` (`status='pendente'`).

## Dois modos

**1. Automático (cron diário)** — delta para as `pronta` + backfill para as `pendente`:
```bash
python3 worker/harvester/nacional.py            # delta (ontem→hoje) p/ prontas; pendentes puxam 1 ano e viram prontas
```
Toda unidade `pendente` é coletada desde `hoje - BACKFILL_DIAS` (365d) e **promovida a `pronta`**
ao fim do run (o Radar passa a exibi-la como recorte preciso). As `pronta` só pegam o delta.

**2. Manual (on-demand)** — onboarding de um cliente novo / forçar um recorte agora:
```bash
# cliente acabou de definir o escopo (virou 'pendente'): rode já para backfillar e promover
python3 worker/harvester/nacional.py

# janela explícita (ex.: backfill maior pontual)
python3 worker/harvester/nacional.py --inicio 20250101 --fim 20260626
```

## Comandos
```bash
python3 worker/harvester/nacional.py                 # produção: delta + backfill dos pendentes
python3 worker/harvester/nacional.py --dias 30       # janela últimos 30d (validação)
python3 worker/harvester/nacional.py --loop          # contínuo (local/dev; sleep 6h)
python3 worker/harvester/nacional.py --reset-checkpoint
python3 worker/harvester/scope.py                    # AUTOTESTE: lista células ativas + testa a guarda 2D
```

## Agendamento (cron diário às 03:00)
```cron
0 3 * * * cd /Users/severinobione/Sentinela-Licitação && /usr/bin/python3 worker/harvester/nacional.py >> /tmp/harvester.log 2>&1
```
> Produção: mover para o VPS com systemd/cron. O script já lê o escopo do banco — não precisa de
> argumento de cidade. Sem célula ativa, sai vazio (seguro rodar de qualquer jeito).

## CANARY (anti-falha-silenciosa)
`pncp_data/_canary_nacional.json`: total de editais e taxa de ausência dos campos críticos
(`numeroControlePNCP`, `orgaoEntidade.cnpj`, `unidadeOrgao.ufSigla`, `situacaoCompraNome`).
`alerta:true` se um campo crítico some >2% — sinal de que o PNCP mudou o schema.
(A antiga checagem de "poucas UFs" foi removida: coleta por célula tem poucas UFs por natureza.)

## Estado / retomada
- `pncp_data/_checkpoint_nacional.json` — fatias `ed|{nivel}:{chave}|{modalidade}|{di}|{df}` concluídas. Re-rodar retoma.
- Guarda 2D em `scope.py` (`Escopo.aceita`): região (ibge/uf) × segmento. Também aplicada em `load_supabase.py`.
