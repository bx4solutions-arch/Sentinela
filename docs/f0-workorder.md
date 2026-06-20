# ORDEM DE TRABALHO — F0 (fechamento do gate de matéria-prima)
### Célula: controle de pragas × São Luís/MA · Para execução no Claude Code
*Fonte de verdade: `sentinela-prd-blueprint.md` §6–§13 + `sentinela-f0-gate-protocol.md`. Spec confirmado: PNCP Consulta API `/api/consulta/v1` (SERPRO), OpenAPI 1.0.*

---

## 0. Por que refazer (e não emendar o f0_pull.py atual)

O `worker/f0_pull.py` usa a **search API** (`/api/search`) — a do WAF, que não retorna valor e cujo matching ficou circular (busca por termo + match por termo). A medição correta roda na **Consulta API** (`/api/consulta/v1`), que tem: filtro por município IBGE, valores estimado/homologado, `existeResultado`, datas, modalidade, e — crucial — o **endpoint de PCA com item granular**.

**Descoberta do spec (muda o gate):** a Consulta API tem `PCA → Contratação(edital) → Contrato`. **Não tem DFD/ETP/IRP** (vivem no Compras.gov/SIASG federal). Logo, no município, o único sinal pré-edital é o **próprio PCA**. G2 ("esteira quente") **colapsa em "PCA publicado + converte em edital com lead time"**.

---

## 1. Endpoints reais (sem token; API pública)

Base: `https://pncp.gov.br/api/consulta`

| Uso | Endpoint | Params-chave |
|---|---|---|
| **PCA por classificação** | `GET /v1/pca/` | `anoPca` (2025 e 2026), `codigoClassificacaoSuperior` (req.), `pagina`, `tamanhoPagina` (max 500) |
| **PCA por órgão** | `GET /v1/pca/usuario` | `anoPca`, `idUsuario`, `cnpj`, `pagina` |
| **Editais (contratações)** | `GET /v1/contratacoes/publicacao` | `dataInicial`,`dataFinal`,`codigoModalidadeContratacao` (req.), `codigoMunicipioIbge=2111300`, `uf=MA`, `pagina`, `tamanhoPagina` (max 50) |
| **Contratos (histórico/recompra)** | `GET /v1/contratos` | `dataInicial`,`dataFinal`,`cnpjOrgao`, `pagina` |
| **Detalhe de contratação** | `GET /v1/orgaos/{cnpj}/compras/{ano}/{sequencial}` | — |

`codigoMunicipioIbge` de São Luís = **2111300** (NÃO o `636` interno da search). Datas no formato exigido por cada endpoint (conferir: alguns usam `yyyyMMdd`).

## 2. Campos que destravam os gates (schema confirmado)

- **PCA item (`PlanoContratacaoItemDTO`):** `descricaoItem`, `nomeClassificacaoCatalogo`, `pdmCodigo`/`pdmDescricao`, `codigoItem`, `classificacaoSuperiorCodigo`/`Nome`, `valorTotal`, `valorUnitario`, `quantidadeEstimada`, **`dataDesejada`**, `categoriaItemPcaNome`, `unidadeRequisitante`. PCA traz também `orgaoEntidadeCnpj`, `nomeUnidade`, `dataPublicacaoPNCP`.
- **Edital (`RecuperarCompraPublicacaoDTO`):** `objetoCompra`, `valorTotalEstimado`, `valorTotalHomologado`, `dataPublicacaoPncp`, `existeResultado`(via situacao), `unidadeOrgao{municipioNome, codigoIbge}`, `numeroControlePNCP`, `modalidadeNome`.

---

## 3. Passo a passo (cada passo = STOP para aprovação antes de rodar)

**Etapa A — Descobrir o(s) código(s) CATSER da célula.** Dos editais de São Luís já confirmados como dedetização, ler `classificacaoSuperiorCodigo`/CATSER. Não chutar código: derivar do dado. Saída: lista de 1–N `codigoClassificacaoSuperior` que representam controle de pragas/sanitização. → STOP, me mostra os códigos.

**Etapa B — Existência do PCA (o teste do §13).** `GET /v1/pca/?anoPca=2025&codigoClassificacaoSuperior=<code>` e `anoPca=2026`, paginando, **filtrando client-side** por `município = São Luís` (via `orgaoEntidadeCnpj`/`nomeUnidade`). Pergunta binária: **São Luís publica PCA para esta classe no PNCP?** Se 0 itens → forte sinal de cenário C; STOP e reportar.

**Etapa C — Editais + contratos da célula.** `/v1/contratacoes/publicacao` varrendo as modalidades relevantes (pregão eletrônico = 6, dispensa = 8, etc. — iterar as que aparecem) por `codigoMunicipioIbge=2111300`, janela 24 meses. `/v1/contratos` para histórico de incumbente/preço. Dedupe por `numeroControlePNCP`.

**Etapa D — Calcular gates e persistir.** Cruzar PCA (B) com editais (C) por objeto+órgão. Gerar o relatório (§4). Commit isolado.

---

## 4. Fórmulas dos gates + contrato de saída

| Gate | Fórmula | Piso |
|---|---|---|
| **G1 granularidade** | % de itens-PCA da célula com `descricaoItem` + `classificacaoCatalogo` + `valorTotal` + `dataDesejada` preenchidos | ≥ 70% |
| **G2 (redefinido) conversão PCA→edital + lead time** | % de itens-PCA da célula com edital correspondente na janela **E** lead time mediano (dataPublicacaoPNCP do PCA / `dataDesejada` → `dataPublicacaoPncp` do edital) > 0 | ≥ 50% convertendo · lead time mediano reportado |
| **G3 cobertura do Dossiê** | % dos campos do Dossiê (§6 PRD) preenchíveis com o dado puxado (esteira-PCA, incumbente, preço estimado/homologado, concorrência, órgão) | > 80% |
| **G4 matching (redefinido)** | precisão/recall da classificação por CATSER/PDM contra **gold set de ~30–50 itens rotulados à mão** — incluindo casos ambíguos (menciona "praga" mas não é; é controle de pragas com outro nome) | > 80% |

**n obrigatório:** nº de itens-PCA da célula e nº de editais. Abaixo de ~30, veredito provisório.

**Saída (commitada, não /tmp):**
- `docs/f0-evidence/f0_dataset.json` — bruto (PCA + editais + contratos, com fonte/link).
- `docs/f0-evidence/f0_gold_set.csv` — os 30–50 itens rotulados à mão (auditável).
- `docs/f0-evidence/f0-report.md` — os 4 gates + n + informacionais (conversão PCA→edital, antecedência mediana, tempo de backfill) + veredito preliminar contra a matriz §2 do protocolo.

---

## 5. Régua de execução (inegociável)

- **Plan mode primeiro.** Apresentar o plano, **STOP**, aprovação, só então rodar.
- **Commit isolado** por etapa; mensagens claras; **nunca** commitar segredo (não há token aqui — API pública).
- Rate-limit: `tamanhoPagina` no teto de cada endpoint, backoff exponencial, sem paralelismo agressivo. A Consulta API é oficial (SERPRO) e menos sujeita a WAF que a search.
- **Só leitura.** Nenhuma escrita em órgão/terceiro. LGPD: só dado institucional; nada de pessoal.

---

## 6. Aprovação para começar

Confirmar antes de o terminal rodar:
1. Janela de medição: **24 meses** (default) ou outra?
2. Anos de PCA a varrer: **2025 + 2026**?
3. Pisos: G1 ≥70%, **G2 ≥50% convertendo** (substitui o "esteira quente"), G4 >80% — ok?

Ao OK, o terminal entra em plan mode e para para sua aprovação antes do primeiro pull.
