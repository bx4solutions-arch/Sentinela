# SENTINELA — MAPA DE FONTES E SINAIS PRÉ-EDITAL
### Documento de matéria-prima: o que cada fonte entrega de verdade, e como validar
*Estratégia/pesquisa — não é o PRD. Prioridade: validar fontes antes de construir tela. Régua: PCA é UM sinal, não a origem (lição do F0).*

---

## 0. Princípio

O F0 provou: PCA municipal é raso/ausente, mas a **demanda existe** (23 editais numa cidade). Logo, a antecipação não pode depender do PCA. Ela se reconstrói por **múltiplos sinais oficiais**, priorizando os que (a) cobrem município, (b) têm **API oficial**, (c) dão antecedência real, (d) são baratos. O resto é roadmap ou corte.

---

## 1. MAPA MESTRE — sinal × fonte × viabilidade

| Sinal | Fonte | API oficial? | Cobertura | Antecedência típ. | Confiab. | Camada |
|---|---|---|---|---|---|---|
| **Contrato vencendo** | PNCP `/v1/contratos` (`dataVigenciaFim`) | ✅ aberta | fed+est+**mun** | 30–180d | **Alta** | **NÚCLEO ★** |
| **Compra/dispensa recorrente** | PNCP contratos+contratações (série) | ✅ aberta | todas | padrão (ciclo) | **Alta** | **NÚCLEO ★** |
| **Verba nova** (emenda/transferência) | Transparência/CGU (+Transferegov) | ✅ API (token) | fed → **mun** (transf.) | meses | Média (ruído) | **NÚCLEO ★** |
| Ata vencendo | PNCP `/v1/atas` (`vigenciaFim`) | ✅ aberta | todas | 30–180d | Alta | NÚCLEO |
| Fracassada/deserta/revogada | PNCP (`situacaoCompra`) | ✅ aberta | todas | dias–semanas | Alta | NÚCLEO |
| Sanção concorrente | Transparência CEIS/CNEP | ✅ API | nacional | contexto | Alta | NÚCLEO |
| Capacidade de pagar | Siconfi/Tesouro | ✅ API | todas (periódico) | contexto | Alta | NÚCLEO (contexto) |
| Edital publicado | PNCP contratações | ✅ aberta | todas | 0 (evento) | Alta | NÚCLEO (já commodity) |
| PCA | PNCP `/v1/pca` | ✅ aberta | **fed alta, mun baixa** | até 12m | Alta onde existe | Núcleo fraco (mun) |
| DFD / ETP / IRP | Compras.gov (fed) **+ PNCP documentos/anexos (qualquer esfera, Lei 14.133)** | ✅ API | fed confirmado; **mun A VALIDAR (não presumir ausência)** | 1–6m | Alta (fed); incerta (mun) | NÚCLEO a validar |
| Pagamento recorrente (mun próprio) | TCE / portal do ente | parcial/scraping | municipal | padrão | Média | ROADMAP |
| Atos/decisores (fiscal, comissão, homolog.) | Querido Diário + DOU | ✅ API (cobertura parcial) | mun parcial + fed | varia | Média | ROADMAP |
| TR / minuta | PNCP/diário | parcial | varia | semanas | Média | ROADMAP |

**Corte (o buraco dos 1.400 portais):** portal próprio de cada prefeitura, diário municipal avulso, diário de associação, scraping dos 27 TCEs. Fica fora do MVP — entra seletivo e tardio, se entrar.

---

## 2. NÚCLEO DO MVP — por que estes, e o que destravam

Os três ★ são o motor de antecipação que **sobrevive ao gap do PCA**:

- **Contrato vencendo** — o município *vai* relicitar o serviço recorrente. `dataVigenciaFim` no PNCP dá 30–180 dias de antecedência, com alta confiança, cobrindo município. **É o que o F0 deveria ter medido.**
- **Compra/dispensa recorrente** — série histórica do mesmo objeto+órgão revela o ciclo ("compra dedetização a cada ~12m"). Previsível, barato, municipal.
- **Verba nova (Transparência)** — emenda/transferência que cai na conta do município *antecede* a contratação. Cobre município (o dinheiro federal→municipal é registrado) onde o PCA não cobre.

Mais o contexto barato: sanção (concorrente fora = vaga), fracassada/deserta (republicação provável), ata vencendo, Siconfi (o órgão paga?). **Tudo API oficial. Tudo cobre município. Zero scraping.**

Isso entrega antecipação real municipal **sem** depender de PCA/ETP/IRP — que ficam para as células federais (roadmap, via Compras.gov).

---

## 3. O SCORE — tratar como hipótese, não verdade

Os pesos sugeridos (PCA +10 … IRP +35) são **heurística v1 não calibrada**. Régua #1: probabilidade calibrada por backtesting, nunca promessa. Decisões:
- **Exiba o score desde já** — mas como **prioridade / força-de-sinal, sempre com o porquê** ("Prioridade 89 — porque: contrato vencendo + recorrência + 2 concorrentes"). O que espera o backtest é a **linguagem de probabilidade calibrada** ("89% de chance"), não a visibilidade do número. Mostrar "Prioridade 89, porque X" é honesto; prometer "89% de vitória" não.
- Para **município**, re-pese: **contrato vencendo + recorrência > ETP/IRP** (que o município não publica). O peso atual super-valoriza sinais federais.
- Calibração = quando o Feedback Loop (participou/ganhou) tiver dado suficiente.

---

## 4. PROTOCOLO DE VALIDAÇÃO (a prioridade — rodar no terminal)

Cada fonte núcleo vira uma sonda concreta. **Isto substitui o F0 mal-direcionado.**

- **V1 — Contrato vencendo (o F0 refeito, no sinal certo).** PNCP `/v1/contratos?cnpjOrgao=<Prefeitura São Luís>` por objeto → quantos contratos com `dataVigenciaFim` nos próximos 30–180d; antecedência média. *Pergunta: dá pra prever a recompra?*
- **V2 — Recorrência.** Série histórica contratações do mesmo objeto+órgão → período médio de recompra e estabilidade.
- **V3 — Verba nova.** Registrar token Transparência → emendas/transferências para o município de São Luís → existe sinal antecedente correlacionado ao objeto?
- **V4 — Esteira (federal E municipal — o que o F0 não testou).** (a) Compras.gov → órgão **federal** em São Luís (EBSERH/Exército) tem DFD/ETP/IRP? (b) **PNCP documentos/anexos** das contratações **municipais** de São Luís → há DFD/ETP/TR anexado? Mede a cobertura municipal real da esteira — **sem presumir ausência** (o erro do F0).
- **V5 — Cobertura Querido Diário.** São Luís está coberto? Extrai atos (nomeação de fiscal/comissão, homologação)?

Saída de cada V: tem dado? campos? antecedência? confiabilidade? → entra no MVP ou não.

---

## 5. MAPEAMENTO AO DASHBOARD (o que tem dado real no MVP)

Seguindo a tela que você desenhou — quais blocos nascem com **dado validado** vs **mock até enriquecer**:

| Bloco do dashboard | Sinal que alimenta | MVP? |
|---|---|---|
| Card "Contratos Vencendo" | PNCP contrato `dataVigenciaFim` | ✅ real |
| Card "Editais prováveis 90d" | contrato vencendo + recorrência | ✅ real (derivado) |
| Card "Pipeline monitorado / valor" | PNCP editais+contratos | ✅ real |
| "Atacar Hoje" | contrato vencendo + recorrência + dado-limpo | ✅ real |
| Linha do Tempo: contrato vence / fracassada / sanção / edital | PNCP + Transparência | ✅ real |
| Linha do Tempo: DFD / ETP / IRP detectado | Compras.gov (fed) + PNCP documentos (mun) | 🔶 **validar cobertura municipal** — não presumir ausência (erro do F0) |
| Card "Oportunidades quentes" / Score | motor de score | ✅ exibir como **prioridade + porquê**; só a linguagem de "probabilidade" espera o backtest |
| Radar "Dinheiro novo" | Transparência emendas/transf. | ✅ real (núcleo) |
| Pipeline por estágio (PCA→…) | PNCP onde há; DFD/ETP/IRP federal | parcial (mun: PCA fraco) |

**Conclusão para você:** o dashboard **funciona no MVP** se construído sobre **contrato vencendo + recorrência + dinheiro novo** (tudo API oficial, cobre município). Os elementos PCA/DFD/ETP/IRP-específicos são federal-only ou roadmap — ficam mock no município até o Compras.gov entrar. Tela é fácil; o que sustenta a tela são esses 3 sinais núcleo — e eles são validáveis agora.

---

## 6. Próximo passo

Rodar **V1–V3** (contrato vencendo, recorrência, verba nova) na mesma célula São Luís — é o F0 refeito no sinal certo, e valida o coração do MVP. V4–V5 em seguida para dimensionar o federal e o diário. Só então se liga dado real nas telas.
