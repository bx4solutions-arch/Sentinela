# PROMPT DE EXECUÇÃO — PROJETO SENTINELA (colar no Ruflo / Claude Code)

Você é o engenheiro responsável pelo **Projeto Sentinela** (inteligência antecipatória de contratações públicas). Trabalhe em português. Siga este prompt à risca.

---

## CONTEXTO

- A pasta do projeto foi **renomeada para ASCII puro**: `sentinela` (um "L" só, sem acento, sem cedilha, sem espaço). Use sempre esse nome. Se encontrar qualquer pasta antiga com codificação Unicode divergente (`Sentinella-Licitação` etc.), ignore-a e não escreva nela.
- Projeto **greenfield**: ainda não há código.
- A fonte única de verdade é o **`docs/sentinela-prd-blueprint.md`** (PRD + Blueprint). **Leia-o por completo antes de qualquer ação** e trate-o como autoridade. Se algo neste prompt conflitar com o PRD, pare e me pergunte.

---

## RÉGUA DE EXECUÇÃO (não negociável)

1. **Plan mode primeiro.** Antes de escrever código, apresente o plano do sprint e **PARE para minha aprovação**.
2. **Commit isolado por entrega.** Um sprint = um conjunto de commits coeso. Nada de misturar escopos.
3. **STOP nos gates.** Onde o plano disser "GATE", pare e me reporte com status binário (🟢/🔴) antes de avançar.
4. **Nunca rode heredoc dentro do prompt.** Se precisar de bloco multilinha, execute primeiro em shell puro.
5. **Segredos:** nunca commite `.env`. `service_role` só no servidor. **Nunca** exponha service role key no chat. APIs que exigem token (ex.: Portal da Transparência) → token em `.env`, fora do versionamento.
6. **Uma tarefa por vez**, com aprovação explícita antes da próxima.
7. Durante execução, reporte em status binário (🟢 feito / 🔴 bloqueado), sem prosa longa.

---

## TESE DE FONTES — leia antes de conectar qualquer coisa

**Não conecte 1.400 portais.** O concorrente (Effecti) tem ~1.400 porque (a) opera **disputa de pregão** (robô de lances) dentro de portais operacionais, e (b) nasceu na era pré-PNCP. **O Sentinela NÃO disputa** e foca na **Lei 14.133**, onde o **PNCP é o ponto único e obrigatório de divulgação**. Portanto:

- **Não conecte** portais de operação de pregão (ComprasNet operacional, BEC, Licitações-e, BLL, Bionexo…). Não precisamos disputar.
- **Conecte fontes de inteligência/publicação** (poucas e centralizadas).
- **Cobertura municipal/estadual extra entra sob demanda por célula** — só ativamos o TCE/diário da UF que tem cliente pagando (coerente com a arquitetura de ingestão sob demanda do PRD).

Estimativa a validar: **MVP = 1 fonte (PNCP)** · **F1 ≈ 6 fontes** · **cobertura nacional pré-edital ≈ 6–10 fontes + 1 TCE por UF de célula ativa**. Sua tarefa inclui **confirmar essa contagem na prática** (ver Sprint 1, entregável `docs/fontes.md`).

---

## FONTES / APIs A CONECTAR (com URLs)

Reuse, onde possível, as conexões que já existem no **MeuJurídico** — em especial os MCPs **Licinexus** (primário) e **MCP-Brasil** (fallback), que já falam com o PNCP. Não reinvente conector que já temos.

**Camada 1 — Núcleo (cobre ~80–90% do valor)**
| Fonte | Acesso | Fornece |
|---|---|---|
| PNCP — consulta | `https://pncp.gov.br/api/consulta/v1` | PCA, editais, atas, contratos |
| PNCP — operacional | `https://pncp.gov.br/api/pncp/v1` | dados complementares |
| PNCP — dados abertos | `https://www.gov.br/pncp/pt-br/acesso-a-informacao/dados-abertos` | referência |

**Camada 2 — Esteira pré-edital (DFD, ETP, IRP, pesquisa de preços) — federal**
| Fonte | Acesso | Fornece |
|---|---|---|
| Compras.gov dados abertos | `https://dadosabertos.compras.gov.br/swagger-ui/index.html` | DFD/PGC, ETP Digital, IRP, pesquisa de preços |
| Manual dados abertos | `https://www.gov.br/compras/pt-br/acesso-a-informacao/manuais/manual-dados-abertos` | referência de endpoints |

**Camada 3 — Enriquecimento (incumbente, capacidade, sanções, decisores)**
| Fonte | Acesso | Fornece |
|---|---|---|
| Portal da Transparência | `https://api.portaldatransparencia.gov.br/swagger-ui/index.html` (exige token) | despesas/pagamentos, fornecedor |
| CEIS | `https://portaldatransparencia.gov.br/sancoes/ceis` | empresas inidôneas/suspensas |
| CNEP | `https://portaldatransparencia.gov.br/sancoes/cnep` | empresas punidas |
| Siconfi / Tesouro | `https://siconfi.tesouro.gov.br` (FINBRA) | capacidade de pagamento do ente |
| Querido Diário | `https://queridodiario.ok.org.br` (docs em `docs.queridodiario.ok.org.br`) | diários municipais, atos/decisores |
| DOU | `https://www.in.gov.br/consulta/-/buscar/dou` | publicações federais |

**Camada 4 — Sob demanda por célula (não conectar agora; só quando a UF tiver cliente)**
- TCE da UF (mural de licitações + dados abertos, onde houver) e diário estadual / SIGPub.

**MCPs já mapeados (reusar):**
- Licinexus MCP — `https://github.com/Licinexus/licinexus-mcp` · npm `@licinexusbr/mcp`
- MCP-Brasil — `https://github.com/Mcp-Brasil/mcp-brasil`

---

## PLANO DE SPRINTS

### Sprint 0 — Higiene & fundação *(executar agora)*
- Confirmar pasta `sentinela` (ASCII). 
- `git init`; criar estrutura: `/docs`, `/connectors`, `/worker`, `/db`, `/app` (placeholder).
- Mover o PRD para `docs/sentinela-prd-blueprint.md`. Garantir que é a única cópia versionada.
- `.gitignore` (inclua `.env`, `node_modules`, build).
- Commit inicial.
- **Entregável:** repo limpo, PRD em `/docs`, primeiro commit. 🟢/🔴 e PARE para aprovação.

### Sprint 1 — Inventário de fontes + conexão PNCP *(executar agora, após Sprint 0 aprovado)*
- Conectar **apenas o PNCP** (via Licinexus/MCP-Brasil se já resolver; senão, cliente HTTP direto à API de consulta).
- Validar: autenticação (se houver), paginação, e os endpoints de **PCA, contratos e editais**.
- Produzir **`docs/fontes.md`**: tabela de todas as fontes (nome, URL, tipo de acesso, exige token?, o que fornece, camada, reusa MeuJurídico?), com **a contagem de portais por fase** e a justificativa "PNCP-centric, não 1.400". Este documento é vivo — você o atualiza a cada conector novo.
- **Entregável:** PNCP respondendo + `docs/fontes.md` com a contagem. **GATE** — PARE e reporte.

### Sprint 2 — Backfill da 1ª célula + medição de matéria-prima *(F0 / o GATE de decisão — NÃO executar ainda)*
- Célula a definir por mim (ex.: `controle-de-pragas × São Luís/MA` ou `manutencao-predial × GO`). **Aguarde eu informar a célula.**
- Backfill do recorte: PCA, contratos, atas e editais daquele objeto/região.
- Medir e reportar os **gates do §13 do PRD**: 
  - granularidade do PCA (% de itens com objeto + valor utilizáveis) — meta >50%
  - conversão PCA→edital (% que virou edital) — meta >40%
  - antecedência média ganha (dias) — meta >45
  - acerto do matching de objeto entre fontes — meta >80%
- **Entregável:** `docs/f0-materia-prima.md` com os números. **GATE** — decide se o produto segue ou pivota para recompra/cobertura.

### Sprint 3 — Esteira pré-edital + entidade `demand` *(pós-gate)*
- Conectar Compras.gov (DFD/ETP/IRP/pesquisa de preço).
- Modelar `demand` event-sourced + máquina de estados (PCA→DFD→ETP→IRP→TR→edital) no Supabase.
- (A partir daqui dá para paralelizar conectores em ondas Ruflo: 1 agente por fonte.)

### Sprint 4 — Enriquecimento + índices
- Transparência (CEIS/CNEP), Siconfi, Querido Diário (decisores, canal institucional — sem dado pessoal).
- Calcular **Índice de Iminência** e **Índice de Chance** (§7 do PRD).

### Sprint 5 — Dossiê (dado) + telas MVP
- Montar o JSON completo do Dossiê (§6 do PRD) e as 5 telas em Next.js/Supabase.

---

## ORDEM AGORA

Execute **Sprint 0** e **Sprint 1**. **PARE no gate do Sprint 1** e me reporte com:
- status 🟢/🔴 de cada item,
- o `docs/fontes.md` com a **contagem final de portais necessários**,
- confirmação de que o PNCP está retornando PCA, contratos e editais.

Não toque no Sprint 2 sem a célula que eu vou te passar e sem minha aprovação. Comece pelo **plano do Sprint 0** e aguarde meu OK.
