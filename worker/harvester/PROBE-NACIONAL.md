# PROBE — endpoint nacional do PNCP (Etapa 1.1) — 2026-06-22

**Endpoint:** `GET https://pncp.gov.br/api/consulta/v1/contratacoes/publicacao`

## Veredito
**A consulta NACIONAL por data funciona** — não precisa iterar município nem UF.

| Cenário | Params | Resultado |
|---|---|---|
| Nacional (só data + modalidade) | `dataInicial,dataFinal,codigoModalidadeContratacao` | **200 · 9.687 registros** (modalidade 6, 7 dias) · 194 páginas · editais de 12+ UFs já na 1ª página |
| Por UF | `+ uf=PI` | 200 · 132 registros (filtro UF funciona) |
| Por município | `+ codigoMunicipioIbge=2211001` | 200 · 21 registros (comportamento atual) |
| Sem modalidade | só `dataInicial,dataFinal` | **400** — `codigoModalidadeContratacao` é **obrigatório** |

## Decisão de arquitetura (eixo de iteração)
- **Iterar por `(janela de data × modalidade 1..14)` — NACIONAL.** Sem `codigoMunicipioIbge`, sem `uf`.
- `codigoModalidadeContratacao` é obrigatório → o eixo mínimo é a modalidade (14 valores), não a UF (27) nem o município (5570).
- `tamanhoPagina`: usar **50** (valor pequeno como 5 retornou 400; 50 funciona). Paginar via `totalPaginas`.

## Campos do payload (mapa p/ raw_editais / orgao)
- `unidadeOrgao`: `municipioNome` (→ `cidade`), `ufSigla` (→ `orgao.uf_sigla`), `codigoIbge` (→ `orgao.codigo_ibge`), `ufNome`, `nomeUnidade`.
- `orgaoEntidade`: `cnpj`, `razaoSocial`, `poderId`, `esferaId`.
- `numeroControlePNCP` (PK), `objetoCompra`, `modalidadeId/Nome`, `situacaoCompraNome` (ex.: "Divulgada no PNCP"), `valorTotalEstimado`, `valorTotalHomologado`, `dataPublicacaoPncp`, `dataAberturaProposta`, `dataEncerramentoProposta`, `linkSistemaOrigem`.

Script: `worker/harvester/probe_nacional.py` (read-only, stdlib).
