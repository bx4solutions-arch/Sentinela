# BLOQUEIOS — sessão autônoma 2026-06-20

Nenhum bloqueio duro impediu a fila. Registros de contornos e pendências:

## Contornado
- **PNCP devolve HTTP 500 em algumas fatias** (ex.: modalidade 11 / janelas específicas). O worker
  abortava a cidade inteira. **Corrigido**: `backfill_worker.py` agora pula a fatia ruim e continua;
  só marca `erro` se NENHUMA fatia coletar. Santos coletou 3.944 editais com 0 fatias puladas.

## Pendências (não bloqueiam — qualidade/escopo, ficaram para a próxima)
- **Port 1:1 pixel do `docs/sentinela-dossie.html`** na Pasta: a Pasta está funcional (abas Resumo/Veredito/
  Riscos/Empresa×Edital/Documentos + análise IA real), com a paleta sem-verde, mas **não** está pixel-a-pixel
  com o accordion de 16 seções do mockup. Próximo passo: portar o accordion denso.
- **Card de licitação 1:1**: o card do Radar é funcional e sem-verde, com órgão/objeto/valor/cidade/situação/
  origem + ações. Falta o tratamento pixel do mockup (anel de score em todo card, chip de veredito, linha de
  ações IA "Resumo/Pergunte ao Edital"). As ações de IA dependem de baixar o documento (Camada 2 / Q5).
- **Passo dedicado UF→multi-cidades no wizard**: entregue de forma equivalente (a cidade da empresa entra
  automática no onboarding + `CityPicker` no Radar para adicionar outras). Um passo visual dedicado no wizard
  é polish.
- **Worker em loop contínuo**: rodei `--once` (valida). Para produção, deixar `python3 worker/backfill_worker.py`
  rodando ao lado do dev para processar novas células `pendente` automaticamente.
