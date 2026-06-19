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

### Tela 2 — Radar (home / feed diário curado)
A lista de oportunidades da célula, ordenada por relevância. **Princípio:** entrega **5–15 cards curados por dia, nunca 300 alertas.** Cada card diz, além dos índices, **por que apareceu** e a **ação de hoje** — é o que transforma o produto em rotina diária ("se eu não olhar isso hoje, posso perder contrato"), não em lista.

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
Linha do tempo **visual** de cada processo, no estilo do acompanhamento processual do MeuJurídico: `PCA → DFD → ETP → IRP → TR → Edital → Contrato → Vigência`. O **agente avança o card de estágio automaticamente** quando chega atualização (saiu do DFD, entrou no TR → o processo se move sozinho para a posição certa) e **agrupa os documentos por estágio** — a relação de documentos do TR aparece dentro da área do TR. É o "monitorar cada movimento do órgão", agora como **stepper/kanban** onde o cliente vê de relance em que momento o processo está.

**Fecho do ciclo — monitoramento de contrato (recompra).** Ao chegar em Contrato, o card mostra a **vigência/duração** e pergunta: *"Quer monitorar este contrato até o vencimento?"* Se sim, ele entra na trilha de **contratos acompanhados — ganhos e perdidos**: os que o cliente **ganhou** (acompanhar execução, aditivos, prazo) e os que **perdeu** (contrato do concorrente = sua próxima chance). O **vencimento dispara o sinal de recompra**, que devolve o processo ao topo do Radar como nova oportunidade — fechando o loop **antecipação ↔ recompra**. Alimenta o Índice de Iminência via "contrato vencendo" (§7) e o agente diário (notificação de vencimento se aproximando).

### Tela 5 — Minha Empresa
Recorte (setor/região), certidões cadastradas (para o cruzamento de prontidão), perfil. Simples.

**Vigia de Documentos e Certidões** *(módulo do plano Sala de Guerra)*. A empresa depende do contador para saber se as certidões negativas estão em dia ou vencidas. Aqui a plataforma assume isso: puxa automaticamente — via MCP-Brasil / MCP gov + portais oficiais — as certidões da empresa (CND federal, estadual, municipal, CNDT, FGTS) com **data de emissão e prazo de validade**, monitora os prazos e **alerta com antecedência antes de vencer**. Para fontes sem pull automático (CAPTCHA/sem API) e para **documentos técnicos** sem registro central (licença sanitária, alvará, atestados de capacidade, ISO), o cliente **cadastra o documento + a data de validade** e recebe o mesmo alerta. Esses prazos alimentam o checklist do Kit (Tela 6), o Índice de Chance (aderência) e o agente diário (notificação). **Híbrido por necessidade:** automático onde a fonte permite, upload + data manual no resto. **Régua:** são os documentos da própria empresa (dado do cliente, consentido) — armazenados cifrados e por tenant (RLS); o alerta cobre o prazo, não promete que o órgão aceitará o documento.

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

### 9.1 Design System — herança visual do MeuJurídico

**Decisão:** o Sentinela herda a **identidade visual do MeuJurídico** — cor, tipografia, raios, sombras e componentes base idênticos. Separar o que se copia do que se adapta:

- **Identidade visual (copiar fiel, 1:1):** paleta completa (primária, secundária, accent, neutros, semânticas), tipografia, border-radius, sombras, espaçamento. A cor primária do Sentinela é a mesma do MeuJurídico.
- **UX (adaptar ao produto, não copiar):** herdar a *cara*, não o *layout*. **Não** replicar o split-screen de geração de documento nem o fluxo do assistente "Ya" — o Sentinela é dashboard de oportunidades (Radar → Dossiê → Esteira). Usar os componentes do design system para montar as 5 telas (§6).

**Como obter os tokens:** extrair do código-fonte do MeuJurídico (`bx4usa-boamargem/Meu-Juridico.Ai`) — `tailwind.config.{ts,js}`, CSS global (variáveis) e `components/ui` — via GitHub MCP (régua: fetch root "/" → paths; verificar SHA remoto antes de escrever; nunca commitar segredos). Não inventar cor; extrair da fonte.

**Ressalva de stack:** MeuJurídico é React/Vite, Sentinela é Next.js 16. Os **tokens** (cor/fonte/raio) transferem 1:1; os **componentes** podem exigir ajuste de import/SSR. Priorizar fidelidade visual; adaptar só o que for específico de stack.

**Fonte única:** registrar os tokens extraídos (com os hex reais) em `docs/design-system.md`. Toda tela nova puxa de lá — evita divergência de cor.

### 9.2 Agente Consultor de IA

Copiloto conversacional do **fornecedor**: tira dúvidas sobre a Lei 14.133, orienta como acompanhar e preparar o processo, documentos e proposta, dá insights e dicas, e ajuda a interpretar cada oportunidade. Acessível de qualquer tela.

**Lente:** a base de conhecimento jurídico (Lei 14.133, jurisprudência, doutrina, modelos genéricos) é **reusada do MeuJurídico**, mas a persona é de **consultor do fornecedor** (participar, habilitar, cumprir requisito, impugnar, recorrer) — não de redator do órgão. Mesma base, lente oposta.

**Arquitetura (reusa o padrão Bia/Ya — Approach A):**
- **Tool-calling agent** com tools que leem apenas os dados do **próprio tenant** no Sentinela (oportunidades, dossiê, esteira, preços) via `company_id` + RLS.
- **RAG** sobre a base jurídica compartilhada (Dify ou base vetorial).
- Disclaimer permanente: apoio informativo, **não substitui assessoria jurídica**.

**⚠️ MURALHA DE DADOS (régua dura, inegociável):**
- **Compartilha:** base de conhecimento jurídico genérica (lei, jurisprudência, modelos). Conhecimento público, sem dono.
- **Nunca cruza:** dados operacionais de clientes. Os processos dos clientes-órgão do MeuJurídico **jamais** chegam ao agente do Sentinela, e vice-versa. Cruzar isso = direcionamento + quebra de confidencialidade + risco criminal. Cada tenant só vê o que é seu + a base genérica.

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
- **Simulador de preço (reusa o BoaMargem):** o cliente informa seus custos → o motor V3 do BoaMargem calcula preço mínimo/competitivo → o Sentinela cruza com o preço-alvo público e sinaliza risco de inexequibilidade. Apoio à decisão (o cliente decide o número), não cravar preço. Reuso de ativo, não calculadora nova.
- **Relatório semanal executivo:** pipeline público total, valor em alta probabilidade, oportunidades que esquentaram/esfriaram, ações urgentes. Só agrega dado existente; alto impacto em retenção e na justificativa do preço.
- **Biblioteca de oportunidades parecidas:** editais/TRs/preços anteriores semelhantes, exigências e cláusulas recorrentes — via matching por embeddings já existente no pipeline.
- **Agente Consultor de IA** (§9.2): copiloto conversacional do fornecedor sobre Lei 14.133, acompanhamento, documentos e dicas. Reusa a base jurídica do MeuJurídico (lente do fornecedor) + tools sobre os dados do próprio tenant. **Muralha de dados dura** (§13). Apoio informativo, não substitui advogado.
- **Vigia de Documentos e Certidões** *(módulo do plano Sala de Guerra, §6 Tela 5)*: monitora prazos de validade das certidões da empresa (pull automático via MCP-Brasil/gov — CND federal/estadual/municipal, CNDT, FGTS — com emissão + validade) e de documentos técnicos cadastrados pelo cliente (licença sanitária, alvará, atestados, ISO). Alerta antecipado de vencimento via agente diário/notificação, integrado ao checklist do Kit. Híbrido: automático onde a fonte permite, upload + data manual no resto. Substitui a dependência do contador para o "está em dia?".
- Preparador documental por nicho (modelos por segmento)
- Radar de dinheiro novo federal (Transferegov/emendas) nas células aplicáveis
- Mapa de concorrência por objeto/região
- Score multidimensional refinado e backtested

**Roadmap — Fase 3+**
- Grafo de decisores ("LinkedIn público" completo, via diários)
- Grafo de órgãos compradores
- CRM de oportunidades (pipeline kanban)
- **Rascunho de proposta válida pelo Agente** (evolução do §9.2): gera o rascunho da proposta atendendo aos requisitos do instrumento convocatório. "Válida" = validação de **completude** (todos os documentos/campos do edital presentes), **não** garantia de habilitação ou vitória. Rascunho assistido, revisão humana obrigatória, preço é decisão do cliente.
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
- **Vigia de Documentos e Certidões (Sala de Guerra):** aqui o dado é da **própria empresa cliente** (consentido), não de terceiro — categoria distinta da régua acima. Riscos: (a) armazenar documento sensível do cliente → cifrar em repouso + RLS por tenant + política de retenção; (b) pull automático de certidão muitas vezes esbarra em CAPTCHA/sem API → assumir modelo **híbrido** (auto onde dá, upload manual no resto), nunca prometer captura automática de tudo; (c) o alerta cobre o **prazo de validade**, não garante aceitação pelo órgão — comunicar como lembrete, não como conformidade certificada.
- **Rate-limit das APIs gov:** worker no VPS com cache e backoff; respeitar termos.
- **Competitivo:** Effecti é capitalizada (Grupo Nuvini/Nasdaq) — copia feature rápido. Defesa = categoria (pré-edital + vertical + lado comprador), não funcionalidade. Não migrar para a operação de sessão.
- **Conflito com MeuJurídico / muralha do Agente:** separação societária + muralha de dados + nunca cliente-órgão e cliente-fornecedor no mesmo certame. **Aplica-se ao Agente Consultor (§9.2):** compartilha-se a base jurídica genérica (lei, jurisprudência, modelos); **nunca** os dados operacionais de clientes — os processos dos órgãos no MeuJurídico jamais chegam ao agente do fornecedor no Sentinela. Cruzar = direcionamento + quebra de confidencialidade + risco criminal.
- **Geração de proposta (Kit, Fase 2):** nunca prometer "proposta vencedora" (o vencedor sai de lances ao vivo — é promessa não cumprível). Proposta técnica = rascunho que exige revisão humana. Preço = decisão do cliente (informamos faixa + exequibilidade, não o número). Razão: evita passivo jurídico do cliente recair sobre o produto, e evita o Sentinela escorregar para o pós-edital comoditizado onde a Effecti domina. O valor é o checklist e a prontidão antecipada, não a peça pronta.

---

## 14. Posicionamento (uma linha)

> O mercado avisa quando o edital saiu. O Sentinela mostra meses antes por que ele vai sair, quem ganhou as duas últimas vezes, por quanto, quanto o órgão está cotando agora — e se você tem chance de fechar.

*Próximo passo: F0 — escolher a primeira célula real e rodar o backfill + medição de matéria-prima com o Ruflo.*

---

## 15. CONSOLIDADO v2 — DECISÕES INCORPORADAS
*(dois eixos alvo×objeto, onboarding por CNPJ, mapa de fontes, camada de documentos lazy, mobile/PWA, agente diário; integra o antigo addendum v2)*

## A1. Reframe central (emenda §1, §3)

Sentinela = **monitor da movimentação de um alvo que o usuário escolhe** — como um advogado acompanha um processo —, filtrado pelo objeto que a empresa vende, entregue como **linha do tempo de oportunidade**. O usuário comanda o alvo; o sistema **não vigia a cidade inteira**, só o que foi assinado.

---

## A2. OS DOIS EIXOS (emenda a §4 — a "célula" se desdobra)

A v1 colava "o que o usuário vê" com "o que o servidor puxa". São eixos distintos:

**Eixo de assinatura — o que o usuário comanda.** Um *alvo*, em granularidade escolhida:
> UF → município → **órgão/ente** (Prefeitura de Teresina) → **unidade** (Secretaria de Educação)

O usuário desce até onde quiser. "Prefeitura de Teresina" = todas as secretarias. "Secretaria de Educação" = só ela. O **objeto/setor vem do CNAE** (perfil da empresa) e fica sempre ligado.

**Eixo de ingestão/cache — o que o servidor puxa.** A **célula = objeto × ente**. Ex.: `controle-de-pragas × Prefeitura de Teresina`.

**Princípio inviolável de custo: cacheia largo, exibe estreito.** Ingere na grão do **ente** (reutilizável entre as secretarias e entre clientes); "monitorar só Educação" é **filtro de visão** sobre o cache, nunca reingestão. Scopear ingestão na unidade isolada mataria o KPI de amortização (custo de backfill ÷ assinantes — §4 original).

**Mapeia 1:1 no PNCP:** `cnpjOrgao` = ente; `codigoUnidadeAdministrativa` = unidade. O alvo do usuário vira parâmetro de query.

---

## A3. ONBOARDING POR CNPJ (emenda §6, Tela 1)

```
CNPJ → MCP-Brasil puxa razão social + endereço + CNAE/segmento
     → sistema já sabe CIDADE + O QUE A EMPRESA VENDE
     → confirma o objeto com o usuário ("é isto que você vende?")   ← passo anti-mis-escopo
     → mostra ÓRGÃOS SUGERIDOS (≈10 botões: municipal/estadual/federal da cidade)
        + busca livre para outros entes
     → usuário escolhe alvo(s)
     → monitora ALVO × OBJETO
```

O CNAE define o objeto sem fricção e **alimenta o matching** (CNAE → famílias CATMAT/CATSER → filtro de licitação relevante). Passo de confirmação obrigatório: CNAE genérico mis-escopa o cliente logo na entrada.

---

## A4. MAPA DE FONTES (emenda §9 — disciplina, não maximalismo)

Cobertura não pode falhar; dispersão (1.400 portais) também não. Reconciliação: **desde a Lei 14.133/2021 o PNCP é obrigatório** para União, estados, municípios e autarquias — a completude já está centralizada **por lei**. PNCP-cêntrico *é* a jogada de completude.

| Camada | Fonte | Para quê |
|---|---|---|
| **Núcleo** | PNCP Consulta (`/api/consulta/v1`) | Contratações, PCA, contratos, atas — todas as esferas |
| **Núcleo** | MCP-Brasil (CNPJ/Receita) | Onboarding: CNAE, endereço, razão social |
| Enriquec. | Compras.gov/SIASG | Esteira federal (DFD/ETP/IRP) — só alvos federais |
| Enriquec. | Diários Oficiais | Atos e decisores fora do PNCP; canal institucional |
| Enriquec. | Transparência (CEIS/CNEP) | Sanção → concorrente impedido = vaga |
| Enriquec. | Siconfi/FINBRA | Saúde fiscal do ente = capacidade de pagamento |

**Distinção que protege a margem: largura de conexão ≠ volume de pull.** Fia-se os conectores acima uma vez (poucos, justificados); **puxa-se dado só para a célula/alvo com usuário pagando** (on-demand, régua de custo). Conectar é barato; ingerir indiscriminadamente quebra o custo.

---

## A5. CAMADA DE DOCUMENTOS + LOOP DE ENGAJAMENTO (emenda §8)

Extensão do motor de estágio que o PRD já tem (§8). Fluxo barato por construção:

1. **Monitora metadado** (apareceu DFD no órgão X) — leve, já vem na listagem. *Largo.*
2. **Notifica:** "Órgão X publicou um DFD. Quer acessar?" — o gancho de retenção.
3. **Baixa o arquivo só no clique** (lazy). *Estreito.*

**Nunca pré-baixar** documento — explode storage e viola o on-demand. Monitorar é metadado; baixar é sob demanda. O binário (público) é cacheado **uma vez** e servido a todos que assinam o órgão; assinatura/notificação/log são por tenant (RLS).

**Ciclo de vida completo (não só pré-edital):** DFD → ETP → edital → ata → contrato → aditivo, como linha do tempo. Os documentos pós-edital (ata, contrato, aditivo) ainda alimentam o sinal de **recompra** (contrato vencendo).

**A linha que não pode borrar (régua #3):** monitorar/entregar documento e timeline = **sim**; operar a sessão (lance, chat de pregão, segunda chance) = **não**. Observador que avisa e entrega papel, nunca operador que dá lance.

---

## A6. ARMAZENAMENTO E GOOGLE (decisão de arquitetura)

- **Sistema de registro = seu** (Supabase + object storage do servidor): assinaturas, monitoramento, Dossiê, propostas, cache de documentos públicos.
- **Google Drive ≠ backend.** Entra como **login (entrar com Google, fricção zero — onde os ~95% de Google pagam)** e **export/backup opcional** ("salvar cópia no meu Drive"). Construir o workflow dentro do Drive/Docs = refém de API/quota/ToS + perda do dado e da inteligência (o Kit estruturado vira Doc genérico).
- **Propostas (Fase 2) = nativas no app**, com a inteligência (checklist × certidões, exequibilidade), e export para Drive/PDF/Word.
- **Storage do documento monitorado:** persiste a *extração estruturada* (texto, leve, permanente); trata o *PDF* como **cache evictível** (re-busca do PNCP se sumir — o original fica lá).

---

## A7. MOBILE — PWA (nova seção)

PWA no Next.js entrega mobile **e push notification** sem fricção de loja. O push É o motor do loop "quer acessar?" → retenção. Cuidado técnico: push no **iOS** exige PWA na home (iOS 16.4+); Android tranquilo. F1 = shell PWA; push conectado ao motor de notificação.

---

## A8. SEQUÊNCIA (emenda §11 — roadmap)

| | Entrega | Régua |
|---|---|---|
| **F1** | Onboarding CNPJ → alvo · monitora metadado → **notifica → baixa no clique** → mostra documento · PWA + push · **agente diário (versão template)** (A10) | Já entrega valor: recebe o DFD antes do mercado |
| **F2** | **Lê o PDF, extrai e resume** "o que o órgão está contratando" → alimenta Dossiê e índices (o "extremamente inteligente" / análise preditiva com Claude) · propostas nativas + Kit · **agente diário interpreta o movimento** | Engenharia pesada (parsing/OCR) — não pode inchar o F1 |

Cravado: **extração profunda é F2**; **operação de sessão fica fora** (régua #3).

---

## A9. MODELO DE DADOS — deltas (emenda §5)

```
subscription      — company_id × alvo (ente + unidade?) + objeto; o recorte do usuário
cell              — objeto × ente (cache compartilhado); estado de ingestão
document          — arquivo público (órgão, demand, tipo, url_pncp, hash, cache_status)
  └─ extraction   — conteúdo estruturado extraído (F2): objeto, qtd, valor, exigências
notification      — company_id × evento (novo documento/estágio) + status (lido/acessado)
```
`document` e `cell` são compartilhados (dado público, reuso); `subscription` e `notification` são por tenant (RLS).

---

## A10. AGENTE DIÁRIO — CONCIERGE DE RETENÇÃO (nova seção)

Um agente por conta acompanha os processos assinados e **interage todo dia** — é a face conversacional do motor de estágio (§8) + notificação (A5), e o principal motor de retenção.

**Comportamento:**
- **Dia com movimento:** informa **onde** (órgão/unidade) e **o quê** (tipo de documento/estágio). Em F2, resume *o que aquele movimento significa* para o cliente (puxa a extração).
- **Dia sem movimento:** status curto "seus processos estão parados hoje" + **nudge de expansão** ("quer ampliar sua atuação para outros órgãos?"). Transforma o dia morto — momento de risco de churn — em gancho de crescimento.

**Disciplinas (senão vira o contrário do que se quer):**
1. **Nudge com rate-limit.** Contato pode ser diário; a *pergunta de upsell* **não** — todo dia vira súplica e treina o usuário a ignorar. Status diário sim; convite de expansão em cadência espaçada (ex.: semanal) ou configurável.
2. **LLM só no sinal.** Dia com movimento → Claude interpreta (custo justificado). Dia parado → mensagem **template** (custo ~zero). Não gastar token para dizer "nada aconteceu".
3. **Fato, não hype** (régua #1): relata o movimento, não promete resultado.
4. **Telemetria de upsell:** registrar quais nudges convertem — alimenta o motor de crescimento.

**Arquitetura:** job agendado por tenant (cron/worker), lê `notification`/`stage_events` das `subscription` da conta, compõe o digest, entrega via push (PWA) + in-app. Não confundir com tarefas agendadas de ferramenta — é worker de backend do produto.

---

*Próximo: refletir A1–A10 nas seções do PRD fundador (merge) quando aprovado, e ajustar o work order do F0 para capturar `codigoUnidadeAdministrativa` (prova de filtro por unidade).*
