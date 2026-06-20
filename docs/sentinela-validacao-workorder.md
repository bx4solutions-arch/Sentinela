# ORDEM DE TRABALHO — VALIDAÇÃO DE SINAIS (F0 refeito no sinal certo)
### Célula: controle de pragas × São Luís/MA · Para o terminal · Mock do front-end segue em paralelo
*Base: `docs/sentinela-mapa-fontes-sinais.md` + `docs/f0-evidence/f0-investigacao-falso-negativo.md`. Régua: PCA é um sinal, não a origem. Nunca marcar sinal como ausente sem medir.*

---

## Objetivo
Validar os sinais que o mapa marcou como NÚCLEO — começando pelos dois que decidem a tese: **V1 contrato vencendo** e **V4b esteira municipal via documentos**. Saída por sinal: tem dado? campos? antecedência média? confiabilidade? → entra no MVP ou não.

## Insumos já no repo (Etapa A do F0)
- Entes de São Luís em `docs/f0-evidence/etapa_a_catser.json`. Municipais: **Prefeitura `06307102000130`**, **Câmara `05495676000117`**; + 14 federais/estaduais (EBSERH, Exército, Min. Saúde, TSE, DNIT…).
- IBGE São Luís = **2111300**. Formato de data confirmado no F0.

## Régua (inegociável)
- **Plan mode → STOP → aprovação** antes de cada V. Commit isolado por V. Evidência em `docs/validacao/` (não `/tmp`).
- Só leitura. **Token da Transparência (V3) é segredo** → variável de ambiente, `.gitignore`, **nunca commitar**.
- Rate-limit: `tamanhoPagina` no teto, backoff (o PNCP cai com 500 de pool). PNCP Consulta API base: `https://pncp.gov.br/api/consulta/v1`.

---

## PRIORIDADE 1

### V1 — Contrato vencendo (o teste que o F0 deveria ter feito)
- **Endpoint:** `GET /v1/contratos?dataInicial=&dataFinal=&cnpjOrgao=<ente>&pagina=&tamanhoPagina=500`.
- **Como:** para a Prefeitura (`06307102000130`) e a Câmara (`05495676000117`) — depois os 14 federais/estaduais — puxar contratos publicados nos últimos **~36 meses** (janela cobre vigências ainda ativas). Paginar.
- **Filtrar client-side:** objeto = controle de pragas (keywords: praga, dedetiz, desinsetiz, desratiz, descupiniz, controle de vetor) em `objetoContrato`; e `dataVigenciaFim` caindo nos próximos **30 / 60 / 90 / 180 dias** a partir de hoje.
- **Capturar:** `objetoContrato`, `dataVigenciaInicio/Fim`, `valorGlobal`, `niFornecedor`+`nomeRazaoSocialFornecedor` (incumbente), `orgaoEntidade`, `unidadeOrgao{municipioNome,codigoIbge,codigoUnidade}`, `numeroControlePNCP`.
- **Medir:** nº de contratos da célula vencendo em cada janela; **lead time** (hoje → `dataVigenciaFim`); incumbente; valor.
- **Veredito:** "contrato vencendo" dá sinal de antecipação **municipal** utilizável? Se sim → a rota municipal funciona sobre dado-limpo (era o que faltava provar).
- Saída: `docs/validacao/v1_contratos_vencendo.json`. → STOP, reporto n + lead time + incumbentes.

### V4b — Esteira municipal via documentos (não presumir ausência)
- **Confirmar primeiro** o endpoint de arquivos/anexos da contratação (provável `/v1/orgaos/{cnpj}/compras/{ano}/{sequencial}/arquivos` — validar no swagger/integração antes de varrer).
- **Como:** para as contratações municipais de São Luís já achadas (Etapa A), puxar o **detalhe + os documentos anexados** e classificar por tipo: há **DFD / ETP / TR** anexado, ou só edital?
- **Medir:** % de contratações municipais com algum documento de fase preparatória; quais tipos; antecedência (data do documento vs publicação do edital).
- **Veredito:** a esteira existe no município via PNCP-documentos (mesmo sem PCA catalogado) ou realmente não há? **Mede, não presume.**
- Saída: `docs/validacao/v4b_esteira_municipal.json`. → STOP, reporto.

---

## PRIORIDADE 2 (encadear após aprovação de V1+V4b)

### V2 — Recorrência
Série histórica de contratações/contratos do mesmo objeto+órgão (PNCP) → **período médio de recompra** e estabilidade. Saída: `docs/validacao/v2_recorrencia.json`.

### V3 — Verba nova (Transparência) · exige token
- Registrar token grátis (`chave-api-dados`) → **env var, não commitar**. API: `api.portaldatransparencia.gov.br`.
- Consultar **emendas parlamentares + transferências** para o município de São Luís (IBGE 2111300) → há verba vinculada a áreas que geram contratação? Antecedência?
- Saída: `docs/validacao/v3_verba_nova.json` (sem token no arquivo).

### V4a — Esteira federal
Compras.gov dados abertos → um órgão **federal** em São Luís (EBSERH/Exército) tem DFD/ETP/IRP rastreável? Dimensiona onde a antecipação plena funciona. Saída: `docs/validacao/v4a_esteira_federal.json`.

### V5 — Cobertura Querido Diário
API Querido Diário → São Luís/MA está coberto? Extrai atos (nomeação de fiscal/comissão, homologação, ratificação de dispensa)? Saída: `docs/validacao/v5_diario.json`.

---

## Entrega final
`docs/validacao/validacao-report.md`: por sinal → tem dado / campos / antecedência média / confiabilidade / **MVP sim-não**. Mais o veredito que faltou: **a tese de antecipação se sustenta para a célula via contrato-vencendo + recorrência (+ verba nova)?** — medido, não presumido.
