# RUNBOOK — Harvester Nacional (Camada 1 · Descoberta)

`worker/harvester/nacional.py` — puxa o **metadado de TODOS os editais novos do Brasil** via PNCP
(`/contratacoes/publicacao`, nacional por data × modalidade). Só metadado; **não baixa documento**.
Upsert direto no Supabase (idempotente). Retry/backoff + checkpoint + **CANARY**.

## Comandos

```bash
# delta do dia (ontem→hoje) — o que o cron roda
python3 worker/harvester/nacional.py

# backfill recente (validação rápida): últimos 30 dias
python3 worker/harvester/nacional.py --dias 30

# estender depois (background): 60–90 dias
python3 worker/harvester/nacional.py --dias 90

# janela explícita
python3 worker/harvester/nacional.py --inicio 20260401 --fim 20260622

# worker contínuo (local/dev por agora; sleep 6h entre passes)
python3 worker/harvester/nacional.py --loop

# ignorar checkpoint (re-coletar tudo da janela)
python3 worker/harvester/nacional.py --dias 30 --reset-checkpoint
```

## Agendamento (worker LOCAL/DEV por agora — produção vai pra VPS depois)
Opção A — cron do macOS/Linux (delta diário às 03:00):
```cron
0 3 * * * cd /Users/severinobione/Sentinela-Licitação && /usr/bin/python3 worker/harvester/nacional.py >> /tmp/harvester-nacional.log 2>&1
```
Opção B — processo contínuo (`--loop`) sob um supervisor (pm2/launchd) na máquina ligada.

> Produção: mover para VPS (M1 da migração MeuJurídico) com systemd/cron. Só alinhamento — não muda nada agora.

## CANARY (anti-falha-silenciosa)
Cada run grava `pncp_data/_canary_nacional.json`: total de editais, UFs distintas, e a taxa de
ausência de cada campo crítico (`numeroControlePNCP`, `orgaoEntidade.cnpj`, `unidadeOrgao.ufSigla`,
`situacaoCompraNome`). **`alerta: true`** se um campo crítico some >2% OU se a diversidade de UF
despencar (<5 UFs num run grande) — sinal de que o PNCP mudou o schema. O risco real é falha
silenciosa, não tamanho.

## Estado / retomada
- `pncp_data/_checkpoint_nacional.json` — fatias `ed|{modalidade}|{di}|{df}` concluídas. Re-rodar retoma.
- Volume típico: ~6–8 mil editais/dia (~3 KB cada) · ~24 MB/dia · ~8 GB/ano (barato).
