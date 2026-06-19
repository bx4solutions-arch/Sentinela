# PROJETO SENTINELA — PRD + BLUEPRINT
### Inteligência Antecipatória de Contratações Públicas
*Documento fundador e fonte única de verdade. Codinome de trabalho.*

---

## 1. Resumo executivo

O Sentinela mostra a empresa privada **quais contratações públicas do seu setor e região vão nascer — meses antes do edital — e se ela tem chance real de ganhar**. Não é um radar de editais (mercado saturado, dominado pela Effecti/Nuvini no pós-edital). É inteligência pré-edital + dossiê de decisão comercial.

**Promessa:** "Enquanto o mercado avisa quando o edital sai, o Sentinela mostra a contratação se formando antes — quem ganhou as últimas duas vezes, por quanto, quanto o órgão está cotando agora, e se você tem chance de fechar."

**Não é:** robô de lances, monitor de chat de pregão, gerador de proposta. Tudo que puxa para a operação da sessão é desvio — ali a Effecti tem 3.000 clientes e capital de bolsa.

---

## 2. Princípios de produto (não negociáveis)

1. **Enxuto.** 5 telas, não 50. Uma empresa abre, entende em 10 segundos se tem chance, e age.
2. **Contundente.** Cada oportunidade entrega informação que o cliente *jamais montaria sozinho* (cruza 6 sistemas). Sem isso, não cobra.
3. **Dado limpo primeiro, brilho depois.** Lança sobre contrato vencendo + histórico (dado confiável); antecipação por esteira entra por cima.
4. **Probabilidade, nunca promessa.** "Alta chance baseada em X", jamais "vai ter licitação".
5. **Custo sob controle.** Nada é pré-carregado. Dado entra quando há cliente pagando por aquele recorte.

---

## 3. ICP e proposta de valor

**Cliente inicial:** empresa de serviço que já vende (ou quer vender) para o governo, num nicho recorrente — controle de pragas, limpeza, manutenção predial, ar-condicionado, segurança eletrônica.

**Dor que resolve:** o fornecedor descobre o edital tarde, corre atrás de certidão, e não sabe se vale entrar (quem é o incumbente? que preço ganha? o órgão paga?). O Sentinela responde isso **antes**, com tempo para se preparar.

---

## 4. DECISÃO ARQUITETURAL CENTRAL — Ingestão sob demanda por célula

Esta é a espinha do projeto e a sua melhor decisão de custo.

**Conceito.** Uma **célula** = (setor × região). Ex: `controle-de-pragas × São Luís/MA`. O servidor nasce **vazio**. Nada é carregado especulativamente.

**Fluxo:**
1. Empresa assina e define seu recorte (CNAE/objeto + região) no onboarding.
2. Isso dispara um **job de backfill da célula**: o worker busca e carrega o histórico daquele recorte (contratos, PCA, atas, sanções, preços, órgãos compradores) no banco.
3. A partir daí, a célula entra em **monitoramento incremental** — só o que muda é varrido, em cadência.
4. Quando a célula é desativada (sem clientes), o monitoramento pausa.

**Por que é poderoso:**
- **Custo proporcional à receita.** Você só paga ingestão de recortes que têm cliente pagando.
- **Margem que melhora com escala.** O primeiro cliente de uma célula paga o custo do backfill; o 2º, 3º, 10º cliente da mesma célula **reusam o mesmo dado**. Cada novo assinante de uma célula já ativa tem custo marginal quase zero.
- **Servidor nunca trabalha à toa.**

**Implementação:** tabela `cells (id, setor, regiao, status, last_backfill, last_incremental)`. Cada célula tem TTL de refresh. Backfill é idempotente. Multi-tenant via `company_id` + RLS no Supabase (padrão que você já usa no ClickOne).

---

## 5. Modelo de dados (entidades principais)

```
cell                — setor × região, estado de ingestão
organization        — órgão público (ente, esfera, capacidade_pagamento)
demand              — uma contratação se formando (event-sourced)
  ├─ stage_events[] — PCA, DFD, ETP, IRP, TR, edital (cada um com data + fonte)
  └─ indices        — iminência, chance (recalculados a cada evento)
contract_history    — as N últimas contratações do objeto/órgão
  └─ vencedor, valor, vigência, aditivos, sanção?
price_intel         — preço médio, mínimo/vencedor, cotações do ETP, faixa de lances
competitor          — fornecedor (CNPJ, vitórias, órgãos, preço, sanção CEIS/CNEP)
decision_makers     — agente de contratação, fiscal, ordenador + canal institucional
company             — o cliente (CNAE, região, certidões, perfil)
```

---

## 6. AS TELAS (5 — produto enxuto)

### Tela 1 — Onboarding / Recorte
Empresa informa: o que vende (objeto/CNAE), região de atuação, certidões que já possui. Dispara a ingestão da célula. Tela de boas-vindas mostra "Carregando o histórico de [setor] em [região]…" enquanto o backfill roda (minutos), e libera o Radar quando pronto.

### Tela 2 — Radar (home / lista priorizada)
A lista de oportunidades da célula, ordenada por relevância para o cliente.

```
┌─ RADAR · Controle de pragas · São Luís/MA ──────────────────┐
│ Filtros: [Iminência] [Chance] [Valor] [Órgão]               │
├─────────────────────────────────────────────────────────────┤
│ ● Prefeitura de São Luís — Dedetização escolas              │
│   Iminência ALTA · Chance 82 · ~R$ 520k · janela set–out    │
│   Contrato atual vence em 74 dias · incumbente: Empresa X    │
├─────────────────────────────────────────────────────────────┤
│ ● Hospital Estadual — Controle de pragas hospitalar         │
│   Iminência MÉDIA · Chance 64 · ~R$ 210k · PCA 2026         │
├─────────────────────────────────────────────────────────────┤
│ ● UFMA — Serviço fracassado, republicação provável ⚡        │
│   Iminência ALTA · Chance 71 · ~R$ 95k · só 2 concorrentes  │
└─────────────────────────────────────────────────────────────┘
```

### Tela 3 — DOSSIÊ DA OPORTUNIDADE (a tela-rainha)
Tudo numa visão. É aqui que o cliente decide "tenho chance de fechar isto?".

```
┌─ DEDETIZAÇÃO DE ESCOLAS — Prefeitura de São Luís/MA ────────────────┐
│ Iminência: ALTA          Chance de ganhar: 82/100                   │
│ Valor previsto: ~R$ 520k  Janela provável: set–out                  │
├─────────────────────────────────────────────────────────────────────┤
│ ▸ ESTEIRA          PCA ✓ → DFD ✓ → ETP ✓ → IRP ○ → TR ○ → Edital ○ │
│   (ETP publicado há 9 dias — especificação já definida)             │
├─────────────────────────────────────────────────────────────────────┤
│ ▸ INCUMBENTE & HISTÓRICO (2 últimas contratações)                   │
│   2023  Empresa X  R$ 480k  vigência 24m  +1 aditivo (25%)          │
│   2021  Empresa X  R$ 410k  vigência 24m  —                         │
│   → Mesmo fornecedor há 4 anos. Vence em 74 dias.                   │
├─────────────────────────────────────────────────────────────────────┤
│ ▸ PREÇO                                                             │
│   Preço-alvo do órgão (cotação ETP atual): R$ 510k–540k            │
│   Preço médio histórico pago:               R$ 445k                 │
│   Menor preço (vencedor anterior):          R$ 480k                 │
│   Faixa de lances dos concorrentes:         R$ 470k–560k           │
│   Margem provável estimada:                 MÉDIA                   │
├─────────────────────────────────────────────────────────────────────┤
│ ▸ CONCORRÊNCIA                                                      │
│   Nº médio de participantes: 2   ·   Gap 1º–2º: 4%                  │
│   Incumbente forte, mas disputa rasa = espaço para entrar          │
│   Empresa X: sem sanção · atua em 3 órgãos da região               │
├─────────────────────────────────────────────────────────────────────┤
│ ▸ ÓRGÃO                                                             │
│   Capacidade de pagamento: BOA (Siconfi) · prazo médio: 45 dias    │
│   Compra esse serviço todo ano (recorrência alta)                  │
├─────────────────────────────────────────────────────────────────────┤
│ ▸ DECISORES (canal institucional — sem dado pessoal)               │
│   Agente de contratação: [nome/cargo] · Comissão: lic@...gov.br    │
├─────────────────────────────────────────────────────────────────────┤
│ ▸ PLANO DE AÇÃO                                                    │
│   Agora: licença sanitária + responsável técnico + atestado ≥R$300k │
│   Suas certidões: 3 ok · 2 a renovar (CND estadual, CNDT)          │
│   [Fontes: PNCP ⧉ · Compras.gov ⧉ · Transparência ⧉ · Siconfi ⧉]  │
└─────────────────────────────────────────────────────────────────────┘
```

### Tela 4 — Esteira / Acompanhamento
Linha do tempo da demanda com alertas de avanço de estágio. Cada vez que o órgão sobe um documento novo (DFD→ETP→IRP→TR), o estágio avança e o cliente é notificado. É o "monitorar cada movimento do órgão".

### Tela 5 — Minha Empresa
Recorte (setor/região), certidões cadastradas (para o cruzamento de prontidão), perfil. Simples.

### Tela 6 — Kit de Habilitação e Proposta *(detalhe, abre do Dossiê — não é tela de navegação principal)*
Não conta como "6ª tela" da navegação: é um painel de detalhe acionado a partir do Dossiê quando a oportunidade amadurece (estágio TR/edital). O diferencial não é "gerar proposta" — é **prontidão antecipada**: como vemos a esteira, entregamos o checklist meses antes do edital sair, coisa que a Effecti (pós-edital) não faz.

```
┌─ KIT — Dedetização escolas · Prefeitura de São Luís/MA ─────────────┐
│ ▸ CHECKLIST DE HABILITAÇÃO (ordenado, cruzado com sua empresa)      │
│   Jurídica       ✓ contrato social · ✓ procuração                  │
│   Fiscal         ✓ CND federal · ⚠ CND estadual (vence em 12d)     │
│   Trabalhista    ⚠ CNDT a renovar                                  │
│   Técnica        ✓ licença sanitária · ⚠ atestado ≥ R$300k (falta) │
│   Econômica      ✓ balanço · ✓ índices contábeis                   │
├─────────────────────────────────────────────────────────────────────┤
│ ▸ ANEXOS PRÉ-MONTADOS                                               │
│   • Declarações padrão (geradas conforme modelo do edital)         │
│   • Estrutura da planilha de custos (esqueleto — valores você põe) │
├─────────────────────────────────────────────────────────────────────┤
│ ▸ PREÇO — você decide o número                                     │
│   Faixa-alvo do órgão: R$ 510k–540k · análise de exequibilidade ✓  │
│   (informamos a faixa e o risco de inexequibilidade; o valor é seu)│
├─────────────────────────────────────────────────────────────────────┤
│ ▸ RASCUNHO DE PROPOSTA TÉCNICA (a partir do TR)                    │
│   ⚠ RASCUNHO — exige sua revisão e aprovação. Não é peça final.     │
└─────────────────────────────────────────────────────────────────────┘
```

**Régua deste módulo (inegociável):** nunca rotular como "proposta vencedora/impecável". A proposta técnica é **rascunho assistido que exige revisão humana**; o **preço é decisão do cliente** (informamos faixa e exequibilidade, não o número); o valor central é o **checklist + anexos**, não a geração da proposta. Isso evita prometer vitória, evita virar a Effecti comoditizada (pós-edital) e evita carregar risco jurídico do cliente.

---

## 7. OS DOIS ÍNDICES (separar é o que evita confusão)

O cliente pergunta duas coisas diferentes. Não misture num número só.

**Índice de Iminência (vai virar edital? quando?)**
Função do estágio na esteira + contrato vencendo + recorrência do órgão + dotação.
`PCA = frio · DFD = morno · ETP = quente · IRP = muito quente · TR = iminente`

**Índice de Chance (eu ganho?) — 0 a 100**
Combina: concorrência histórica (nº participantes, gap 1º-2º) + força do incumbente + folga de preço (preço-alvo vs. seu custo) + aderência do cliente (certidões/atestados que ele já tem). Calibrado por backtesting.

---

## 8. PIPELINE DE DADOS — a esteira + monitoramento de estágio

| Estágio | Artefato | Fonte | Papel |
|---|---|---|---|
| Planejamento | PCA | PNCP API | Intenção (frio) |
| Formalização | DFD | PGC/Compras.gov | Demanda real (morno) |
| Viabilidade | ETP | ETP Digital/Compras.gov | **Especificação + preço-alvo (quente)** |
| Cotação | Pesquisa preço / IRP | Compras.gov | Iminência (muito quente) |
| Especificação | TR | PNCP/diário | Quase certo |
| Publicação | Edital | PNCP | Evento (já é commodity) |
| Histórico | Contratos | PNCP | Incumbente + recompra (dado limpo) |
| Sanções | CEIS/CNEP | Transparência | Concorrente impedido = vaga |
| Saúde do ente | Siconfi/FINBRA | Siconfi | Capacidade de pagamento |
| Atos/decisores | Diários | Querido Diário | Canal institucional |

**Motor de estágio:** cada `demand` é uma máquina de estados. Um job incremental varre as células ativas, detecta novo artefato, avança o estágio, recalcula os índices e dispara alerta. É o "LinkedIn do alvo público" no nível da oportunidade.

---

## 9. A FERRAMENTA (stack concreta — reuso total dos seus ativos)

| Camada | Tecnologia | Observação |
|---|---|---|
| App / UI | Next.js 16 + React 19 + TypeScript + Tailwind | Deploy Vercel (seu padrão) |
| Dados | Supabase: Postgres + pgvector + RLS + Edge Functions (Deno) | Multi-tenant via `company_id` |
| Worker de ingestão/backfill | Node/TS no seu **VPS (2.25.130.31)** | Tira a carga pesada do Vercel/Edge; controla rate-limit das APIs gov |
| Agendador | cron no VPS + pg_cron | Refresh incremental só das células ativas |
| Conectores | PNCP (`/api/consulta/v1`), Compras.gov dados abertos, Transparência (CEIS/CNEP), Siconfi, Querido Diário | Via **Licinexus MCP + MCP-Brasil** onde aplicável |
| Matching de objeto | Embeddings (pgvector) + CATSER | O nó técnico difícil — medir acerto (>80%) |
| Construção | **Claude Code CLI + Ruflo** (squads/ondas) | Seu fluxo primário |

---

## 10. CATÁLOGO DE FEATURES (todas, priorizadas)

**MVP — Fase 1 (prova de valor, dado limpo)**
- Onboarding + ingestão sob demanda por célula
- Radar (lista priorizada): contratos vencendo + PCA + deserta/fracassada
- Dossiê da Oportunidade (tela-rainha completa, §6)
- Histórico das 2 últimas contratações + incumbente
- Bloco Preço (médio, mínimo/vencedor, cotações ETP, faixa de lances)
- Concorrência (nº participantes, gap, sanção CEIS/CNEP)
- Capacidade de pagamento (Siconfi)
- Dois índices (Iminência + Chance)
- Esteira com alerta de avanço de estágio (PCA→DFD→ETP→IRP→TR)
- Plano de ação / prontidão de certidões
- Feedback Loop ligado desde o dia 1 (participou? ganhou? — calibra o índice)

**V1 — Fase 2 (enriquecimento)**
- **Kit de Habilitação e Proposta** (detalhe do Dossiê): checklist de habilitação ordenado e cruzado com a empresa + anexos pré-montados (declarações + esqueleto da planilha) + faixa de preço com análise de exequibilidade + rascunho de proposta técnica assistido. Valor central = checklist/anexos e **prontidão antecipada**; proposta = rascunho que exige revisão; preço = decisão do cliente. Nunca "proposta vencedora pronta".
- Preparador documental por nicho (modelos por segmento)
- Radar de dinheiro novo federal (Transferegov/emendas) nas células aplicáveis
- Mapa de concorrência por objeto/região
- Score multidimensional refinado e backtested

**Roadmap — Fase 3+**
- Grafo de decisores ("LinkedIn público" completo, via diários)
- Grafo de órgãos compradores
- CRM de oportunidades (pipeline kanban)
- Copiloto comercial ("o que faço agora?")
- Atas com saldo
- Radar de Segunda Chance — *opcional; só com cruzamento histórico que a Effecti não tem; cuidado para não virar operação de sessão*
- Simulador de edital provável — *apenas ilustrativo, com disclaimer de probabilidade*

**Cortados (registro de disciplina — não voltar)**
- ❌ Alerta de exigência restritiva / direcionamento (risco estratégico + conflito com MeuJurídico)
- ❌ Radar de dor operacional por notícia (dado ruidoso, falso-positivo alto)

---

## 11. ROADMAP POR FASES

| Fase | Foco | Entrega | Gate |
|---|---|---|---|
| **F0** | Validação de matéria-prima | Backfill de 1 célula real + medir conversão PCA→edital, granularidade, acerto de matching | Limiares atingidos (ver §13) |
| **F1** | MVP | 5 telas + ingestão sob demanda + Dossiê completo (dado limpo) | 1 célula vendável, 1º cliente pagante |
| **F2** | Esteira + enriquecimento | DFD/ETP/IRP monitorados + preparador documental + backtesting do score | Antecedência média comprovada |
| **F3** | Defensabilidade | Grafo de decisores + dinheiro novo + CRM | Moat que a Effecti não copia rápido |

---

## 12. MÉTRICAS DE SUCESSO

- **Ativação:** tempo de backfill por célula < 10 min; cobertura do dossiê (% campos preenchidos) > 80%.
- **Preditiva:** acerto do matching de objeto > 80%; antecedência média sobre o edital (dias) medida e crescente por estágio.
- **Negócio:** conversão trial→pago; custo de backfill por célula **amortizado pelo nº de assinantes da célula** (KPI-chave da arquitetura sob demanda); retenção mensal.
- **Engajamento:** % de oportunidades abertas; % marcadas "vou participar"; Feedback Loop (ganhou/perdeu) alimentando o índice.

---

## 13. RISCOS E RÉGUA

- **Matéria-prima (maior risco):** a esteira pré-edital é mais rica no federal que no municipal. F0 mede isso por célula antes de prometer antecipação. Se o recorte for raso, o produto se sustenta no dado limpo (contrato vencendo + histórico + preço + concorrência).
- **Matching de objeto:** se erra, o dossiê sai errado e queima confiança. Medir e travar em >80% antes de F1.
- **LGPD:** só dado público institucional. Nome + cargo + função + canal institucional = ok. **Nunca** celular/e-mail pessoal, WhatsApp, CPF. Mostrar fonte e link oficial em cada dado.
- **Rate-limit das APIs gov:** worker no VPS com cache e backoff; respeitar termos.
- **Competitivo:** Effecti é capitalizada (Grupo Nuvini/Nasdaq) — copia feature rápido. Defesa = categoria (pré-edital + vertical + lado comprador), não funcionalidade. Não migrar para a operação de sessão.
- **Conflito com MeuJurídico:** se ambos coexistirem, separação societária + muralha de dados + nunca cliente-órgão e cliente-fornecedor no mesmo certame.
- **Geração de proposta (Kit, Fase 2):** nunca prometer "proposta vencedora" (o vencedor sai de lances ao vivo — é promessa não cumprível). Proposta técnica = rascunho que exige revisão humana. Preço = decisão do cliente (informamos faixa + exequibilidade, não o número). Razão: evita passivo jurídico do cliente recair sobre o produto, e evita o Sentinela escorregar para o pós-edital comoditizado onde a Effecti domina. O valor é o checklist e a prontidão antecipada, não a peça pronta.

---

## 14. Posicionamento (uma linha)

> O mercado avisa quando o edital saiu. O Sentinela mostra meses antes por que ele vai sair, quem ganhou as duas últimas vezes, por quanto, quanto o órgão está cotando agora — e se você tem chance de fechar.

*Próximo passo: F0 — escolher a primeira célula real e rodar o backfill + medição de matéria-prima com o Ruflo.*
