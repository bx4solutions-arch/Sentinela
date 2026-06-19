# FONTES / APIs — Projeto Sentinela

> Documento **vivo**. Atualizado a cada conector novo.
> Régua: **PNCP-centric, não 1.400 portais.** O Sentinela é pré-edital (Lei 14.133),
> não disputa pregão — por isso não conecta portais operacionais (ComprasNet operacional,
> BEC, Licitações-e, BLL, Bionexo…).

---

## CONTAGEM DE PORTAIS POR FASE

| Fase | Nº de fontes | Quais |
|---|---|---|
| **MVP** | **1** | PNCP (consulta) |
| **F1** | **≈ 6** | PNCP · Compras.gov · Portal da Transparência (inclui CEIS/CNEP) · Siconfi · Querido Diário · DOU |
| **Cobertura nacional pré-edital** | **6–10 + 1 TCE por UF de célula ativa** | núcleo acima + TCE/diário estadual sob demanda |

**Justificativa da contagem:** o concorrente (Effecti) tem ~1.400 portais porque opera disputa
de lances dentro de portais operacionais e nasceu pré-PNCP. Sob a Lei 14.133 o **PNCP é o ponto
único e obrigatório de divulgação**, então 1 fonte cobre o MVP e ~6 cobrem 80–90% do valor nacional.
Cobertura municipal/estadual extra entra **sob demanda por célula** (só a UF que tem cliente pagando).

---

## INVENTÁRIO

### Camada 1 — Núcleo PNCP  ✅ CONECTADO (MVP)

| Fonte | URL | Acesso | Token? | Fornece | Reusa MeuJurídico | Status |
|---|---|---|---|---|---|---|
| PNCP — consulta | `https://pncp.gov.br/api/consulta/v1` | HTTP REST | ❌ não | PCA, editais, atas, contratos | Licinexus/MCP-Brasil (não carregados nesta sessão → HTTP direto) | 🟢 validado |
| PNCP — operacional | `https://pncp.gov.br/api/pncp/v1` | HTTP REST | ❌ | dados complementares | — | ⚪ pendente |
| PNCP — dados abertos | `https://www.gov.br/pncp/pt-br/acesso-a-informacao/dados-abertos` | referência | — | doc | — | 📖 ref |

**Endpoints validados (2026-06-18):**

| Endpoint | Recurso | Status | Paginação |
|---|---|---|---|
| `GET /v1/contratos?dataInicial&dataFinal&pagina` | Contratos (incumbente, valor, vigência, órgão, fornecedor) | 🟢 HTTP 200 | 500/pág |
| `GET /v1/contratacoes/publicacao?dataInicial&dataFinal&codigoModalidadeContratacao&pagina` | Editais publicados (modalidade, UF, município/IBGE, amparo legal) | 🟢 HTTP 200 | 10/pág |
| `GET /v1/pca/?anoPca&codigoClassificacaoSuperior&pagina` | PCA por classe (itens, qtd, valor, catálogo) | 🟢 HTTP 200 | variável |
| `GET /v1/pca/atualizacao?dataInicio&dataFim&codigoClassificacaoSuperior&pagina` | PCA incremental (monitoramento) | 🟢 HTTP 200 | variável |

**Envelope de resposta (uniforme):**
```json
{ "data": [ ... ],
  "totalRegistros": 17865, "totalPaginas": 36,
  "numeroPagina": 1, "paginasRestantes": 35, "empty": false }
```
- **Datas:** formato `AAAAMMDD` nos parâmetros de query; ISO-8601 (`2024-06-01T03:14:29`) nos campos de resposta.
- **Sem autenticação.** API pública.
- **PCA exige** `codigoClassificacaoSuperior` (classe CATMAT/CATSER, ex.: `7` = ELÉTRICO).

### Camada 2 — Esteira pré-edital federal (DFD, ETP, IRP, pesquisa de preços)  ⚪ F1

| Fonte | URL | Token? | Fornece | Status |
|---|---|---|---|---|
| Compras.gov dados abertos | `https://dadosabertos.compras.gov.br/swagger-ui/index.html` | ❌ | DFD/PGC, ETP Digital, IRP, pesquisa de preços | ⚪ pendente |

### Camada 3 — Enriquecimento (incumbente, capacidade, sanções, decisores)  ⚪ F1

| Fonte | URL | Token? | Fornece | Status |
|---|---|---|---|---|
| Portal da Transparência | `https://api.portaldatransparencia.gov.br/swagger-ui/index.html` | ✅ sim (`.env`) | despesas/pagamentos, fornecedor | ⚪ pendente |
| CEIS | `https://portaldatransparencia.gov.br/sancoes/ceis` | (mesmo portal) | empresas inidôneas/suspensas | ⚪ pendente |
| CNEP | `https://portaldatransparencia.gov.br/sancoes/cnep` | (mesmo portal) | empresas punidas | ⚪ pendente |
| Siconfi / Tesouro (FINBRA) | `https://siconfi.tesouro.gov.br` | ❌ | capacidade de pagamento do ente | ⚪ pendente |
| Querido Diário | `https://queridodiario.ok.org.br` (`docs.queridodiario.ok.org.br`) | ❌ | diários municipais, atos/decisores | ⚪ pendente |
| DOU | `https://www.in.gov.br/consulta/-/buscar/dou` | ❌ | publicações federais | ⚪ pendente |

### Camada 4 — Sob demanda por célula (NÃO conectar agora)

- TCE da UF (mural de licitações + dados abertos) e diário estadual / SIGPub — só quando a UF tiver cliente.

---

## MCPs JÁ MAPEADOS (reusar quando carregados)

- **Licinexus MCP** — `https://github.com/Licinexus/licinexus-mcp` · npm `@licinexusbr/mcp` (primário)
- **MCP-Brasil** — `https://github.com/Mcp-Brasil/mcp-brasil` (fallback)

> Nesta sessão nenhum dos dois está carregado → conector PNCP via HTTP direto (`connectors/pncp/`).

---

## NÃO CONECTAR (registro de disciplina)

❌ ComprasNet operacional · ❌ BEC · ❌ Licitações-e · ❌ BLL · ❌ Bionexo
(portais de **disputa** de pregão — o Sentinela não disputa).
