# SKILL — PNCP Harvester (coleta 100% sem quebrar)
### O motor de dados do Sentinela. Provado em teste de estresse. Aplicar no projeto.

## Veredito do teste de estresse (São Paulo — maior volume do país)
- **Pregão eletrônico, página de 50, SP/maio-2026 → respondeu 76 KB inteiros. NÃO quebrou.** Volume não é o problema.
- A mesma query em página de 10 → voltou vazia. As falhas são **aleatórias/transitórias** (pool instável do PNCP), não de quantidade.
- **Conclusão:** a confiabilidade não vem de "achar uma API melhor" — vem de **colher a API existente do jeito certo**: fatiar + paginar + **retry/backoff** + **checkpoint** + gravar em casa. É o que `pncp_harvester.py` faz.

## A regra (por que não quebra)
1. **Fatiar:** `município × modalidade × janela de data (30d)`. Nunca pedir tudo de uma vez.
2. **Paginar** cada fatia até `paginasRestantes == 0` (tamanhoPagina = 50).
3. **Retry com backoff exponencial** (até 6x) em 429/500/502/503/504/timeout. Distingue 204 (vazio legítimo) de falha.
4. **Checkpoint:** cada fatia concluída é registrada; re-rodar **retoma de onde parou**. Fatia que falhou de vez vai para `_failures.jsonl` para re-rodar — o run nunca morre inteiro.
5. **Gravar em casa** (`raw.jsonl` + `<segmento>.jsonl`). O app consulta o NOSSO banco, nunca o PNCP ao vivo.

## Como rodar
```
python3 worker/harvester/pncp_harvester.py
```
Saídas em `./pncp_data/`: `raw.jsonl` (tudo, dedupe por `numeroControlePNCP`), `<segmento>.jsonl`, `_checkpoint.json`, `_failures.jsonl`.

## Config (topo do script)
- `MUNICIPIOS` — IBGE (ex.: São Paulo `3550308`, Teresina `2211001`, São Luís `2111300`). Adicione quantos quiser.
- `DATA_INICIAL/FINAL`, `JANELA_DIAS` (30 = estável), `TAM_PAGINA` (50 = máx. testado).
- `MODALIDADES` — **todas** (6 Pregão-E, 7 Pregão-P, 4/5 Concorrência, 8 Dispensa, 9 Inexigibilidade, 12 Credenciamento, 2 Diálogo, 3 Concurso, 1/13 Leilão). *Confirmar códigos contra Tabelas de Domínio do PNCP.*
- `SEGMENTOS` — keyword em `objetoCompra`. Já vem com os 3 do teste: controle-de-pragas, material-hospitalar, material-de-expediente.

## Próximos passos de produção
- Trocar JSONL por **Postgres/Supabase** (mesma lógica de upsert por `numeroControlePNCP`).
- Rodar em **cron no VPS** (incremental: só janelas novas + re-tentar `_failures`).
- Estender o mesmo padrão aos endpoints irmãos: `/atas`, `/contratos`, `/pca` (sinais de recompra e PCA).
- Filtro de segmento por **CATSER/CATMAT** além de keyword, quando o item vier catalogado.

## Régua
Só leitura, API pública, sem token, sem segredo. Backoff educado (respeita o PNCP). Este é o backbone — sem ele, qualquer tela é carro sem motor.
