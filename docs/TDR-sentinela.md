# TECHNICAL DESIGN REVIEW — SENTINELA AI

**Data:** 02/07/2026 · **Base da auditoria:** código real do repositório (10.447 linhas TS/TSX), banco de produção (projeto `mzaapxkdokfeyzajawzs`: 27 tabelas, políticas RLS, índices, cron jobs), advisors de segurança do Supabase, e os PRDs em `docs/`. Nada foi alterado.

**Método:** este comitê não avaliou intenções. Avaliou o que existe em código e banco hoje, contra o que os 10 princípios declaram. A distinção mais importante deste documento: **a arquitetura DECIDIDA é boa; a arquitetura IMPLEMENTADA ainda não é ela.** O risco não é ter errado a decisão — é construir o agente em cima do que existe hoje sem corrigir a fundação primeiro.

---

## VEREDITO EXECUTIVO (leia isto se não ler mais nada)

O Sentinela hoje é: 13 telas client-side (12 com dados mockados dentro dos próprios arquivos de página), 5 harvesters de excelente disciplina de engenharia, um banco bem modelado com RLS real, e **zero linhas de IA em produção**. Não existe `lib/agent/`, não existe chamada à Claude API, não existe rota de API (`app/api` está vazio), não existe pipeline de embeddings (tabela `edital_embeddings` criada com índice HNSW, 0 linhas).

Isso não é um defeito — é o estágio. O defeito seria começar o agente agora, do jeito que o front está: **as duas únicas telas conectadas ao banco consultam o Supabase direto do browser**, com a UI acoplada ao schema. Se as tools nascerem nesse padrão, o princípio 4 (tools independentes) morre no primeiro commit.

**Nota geral como fundação de 10 anos, no estado atual: 4,5/10.**
**Nota da arquitetura decidida (PRDs), se implementada como escrita: 8/10.**
**A diferença entre as duas notas é o trabalho da Fase A do roadmap (Parte 14).**

---

## PARTE 1 — AUDITORIA DA ARQUITETURA

| Dimensão | Nota | Evidência |
|---|---|---|
| Arquitetura geral | 4 | Front client-heavy sem camada de servidor própria; nenhuma rota de API; nenhum service layer. O "backend" é o PostgREST do Supabase consumido direto do browser. |
| Organização | 6 | Estrutura Next.js limpa e consistente; `docs/` exemplar (PRDs, decisões, handoff — raro em early stage). Mas `lib/` tem só cliente Supabase e tipos gerados. |
| Acoplamento | 3 | **Problema central.** `raio-x/page.tsx` (777 linhas) faz 6+ queries diretas a tabelas com nomes de coluna hardcoded na UI. Mudança de schema = quebra de tela. 12 telas têm arrays mock dentro do próprio componente de página — conectar cada uma será um mini-refactor. |
| Escalabilidade | 5 | Harvesters escopados por município (decisão correta contra dump nacional). Mas leitura client-side não tem cache, não tem paginação por cursor, e cada usuário refaz as mesmas queries. |
| Coesão | 6 | Harvesters são coesos e autocontidos, com `_shared/registrar-incidente.ts` como único módulo comum — bom. Páginas misturam dados, formatação e apresentação num arquivo só. |
| Complexidade | 7 | Baixa complexidade acidental — nada de abstração prematura, nada de microserviço fantasma. Isso é mérito. |
| Separação de responsabilidades | 3 | Não existe: página = query = formatação = UI. Só 1 tela é server component (`uso-ia`); as outras 15 são `"use client"`. |
| Modularização | 4 | Componentes compartilhados: 6 (sidebar, topbar, brand, placeholder, fonte-instavel, modal). O `<LicitacaoCard>` compartilhado — já identificado no handoff — segue não extraído, e é exatamente o componente que a UI generativa vai precisar. |

**Média ponderada: 4,5/10.** O que salva a nota: os harvesters. `pncp-harvester/index.ts` tem retry com backoff exponencial, idempotência por upsert de chave natural, detecção de mudança de contrato da API sem autocorreção, e incidentes gravados em `alertas_integracao` (12 registrados, 21 runs em `harvester_runs`). Esse é o padrão de engenharia que o resto da plataforma precisa herdar.

## PARTE 2 — AI-NATIVE DE VERDADE?

**Resposta objetiva: hoje, não.** Hoje o Sentinela é um sistema tradicional (aliás, um mock de sistema tradicional) sem IA nenhuma. O modal "Converse com Radar" não faz nenhuma chamada de rede — é UI pura. A tela "Uso de IA" exibe números fixos.

**A arquitetura decidida é AI-native? Sim — com uma condição.** Os PRDs descrevem corretamente: agente como entry point, tools como única fonte de inteligência, rotinas como orquestração das mesmas tools, evolução por adição e não por reescrita. Isso é AI-native de verdade. A condição: **AI-native exige que as tools sejam o único caminho de acesso a dados — inclusive para as telas.** Se as telas continuarem falando com o PostgREST direto e só o chat usar tools, vocês terão dois sistemas paralelos (o "site" e o "agente") — que é exatamente a definição de "IA em cima de sistema tradicional". A decisão que falta tomar (e este comitê recomenda): **as telas passam a consumir as mesmas tools do agente**, via route handlers. A tela vira um "chat congelado": uma pergunta pré-definida com resposta renderizada. Aí sim o fluxo inteiro gira em torno do agente.

## PARTE 3 — TOOLS

`lib/agent/tools` **não existe.** Nada a auditar — e isso é a melhor notícia deste TDR: não há nada errado a desfazer. As tools podem nascer certas. Contrato recomendado (avaliem contra isto quando existirem):

- Cada tool: schema de entrada/saída em Zod, `descricao` para o LLM, flag `read | write`, `tenant_id` injetado pelo runtime (nunca como parâmetro do modelo), execução server-side com service role + filtro de tenant explícito (defesa em profundidade além do RLS).
- Tools `write` retornam `{ proposta, resumo_humano }` e só executam após confirmação — a confirmação é do runtime, não da tool.
- Nenhuma tool importa nada de `components/` ou `app/` (teste de acoplamento: `lib/agent` deve compilar sozinho).
- Virar MCP server amanhã: se o contrato acima for seguido, é empacotamento (~1 semana), porque MCP é exatamente isso — nome, descrição, JSON Schema, handler. Se as tools nascerem importando código de página, é reescrita.

**Dependência perigosa já visível:** `database.types.ts` (1.352 linhas geradas) importado direto nas páginas. As tools devem expor tipos de domínio próprios (ex.: `Licitacao`, `RaioX`), não o tipo da tabela — senão o schema do banco vira contrato público e nunca mais pode mudar barato.

## PARTE 4 — ARQUITETURA DOS AGENTES

A pergunta certa não é "suporta 14 agentes?" — é "o que é um agente aqui?". Recomendação deste comitê, contra a tentação do zoológico de agentes:

**Fase agora: UM orquestrador + tools + system prompts por papel.** "Radar Agent", "Pricing Agent", "Research Agent" não precisam ser processos separados — são o mesmo runtime com prompt e subconjunto de tools diferentes. Um `agent_runs` (tabela) com estados (`planejando → executando → aguardando_confirmacao → concluido/falhou`) dá Planner/Executor/Supervisor de graça como colunas, não como serviços. Critic (revisão da resposta antes de exibir) é uma segunda chamada barata no mesmo run. Memory Manager é o job pós-conversa já decidido no PRD.

**O que a arquitetura atual NÃO suporta e precisa nascer na Fase A:** um **registry de tools** (para o Tool Router ser dado, não código) e a tabela `agent_runs` (para qualquer supervisão existir). Sem isso, tudo fica preso em um único loop de chat — o risco que a pergunta teme se materializa por omissão de infraestrutura, não por falta de "agentes".

Multi-agente de verdade (processos concorrentes, delegação) só se justifica quando as rotinas rodarem em background em escala — e aí é o modelo da Parte 10, não uma reescrita.

## PARTE 5 — FLUXO DO AGENTE

O fluxo ideal proposto no enunciado está correto e **nada dele existe implementado**. Duas correções ao fluxo antes de implementá-lo:

1. **Confirmação está faltando no diagrama.** Entre "Execução" e "Memória" existe o desvio obrigatório para writes: `Execução → [write?] → Proposta → Confirmação humana → Execução efetiva → Audit Log`. O audit log não é a última etapa — writes logam na execução, não no fim da conversa.
2. **Feedback/Aprendizado não é etapa do request** — é assíncrono. Se ficar no caminho síncrono, cada resposta paga a latência do aprendizado. O fluxo síncrono termina no widget + takeaway; um evento é emitido e processado depois.

Fluxo corrigido: `Usuário → Contexto da tela (chip) → Montagem de contexto (perfil + memória + cota) → Loop LLM (planeja/seleciona tools/executa; writes pausam para confirmação) → Blocos {widget, props} em streaming → Takeaway → emite eventos (telemetria, memória, custo) → jobs assíncronos consomem`.

## PARTE 6 — UI GENERATIVA

Estado atual: **orientada a nada** — não há renderização de resposta de IA em lugar nenhum. O modal Converse com Radar renderiza texto fixo. Não há contrato de blocos, não há registry de widgets, não há streaming (nenhum SSE no projeto).

O que existe de bom: os componentes visuais que virarão widgets (card Alvo, semáforo do Raio-X, tabelas, kanban) já existem — mas **presos dentro de páginas**, não extraídos como componentes puros de props. Pré-requisito da UI generativa: extrair ~6 componentes para um `components/widgets/` com registry (`{ tipo: "licitacao_card", props }` → componente). Sem isso, a decisão 3 do PRD ("nunca só texto") é inexecutável. Streaming: usar SSE do route handler com blocos JSON delimitados; o erro de renderização visto no print da CLEATUS (markdown quebrado no takeaway) confirma: **o takeaway também deve ser um bloco tipado, não markdown livre.**

## PARTE 7 — APRENDIZADO (4 CAMADAS)

As quatro camadas decididas são corretas e nenhuma tem infraestrutura hoje: não existem tabelas `memorias`, `eventos`, `agent_runs`; `orgao_score` existe (0 linhas) e `audit_logs` existe (0 linhas, nada escreve nela).

**Quinta camada que falta: RESULTADO (ground truth).** As 4 camadas aprendem com comportamento e contexto — nenhuma aprende com o desfecho real: *o cliente participou e ganhou? o edital previsto pela emenda saiu mesmo? o preço recomendado venceu?* Sem registrar previsão → desfecho, o Sentinela nunca saberá se o Raio-X acerta — e "estimar probabilidade de publicação" (objetivo declarado) é impossível de calibrar. É também a única defesa contra o risco principal do feedback implícito: **feedback loop degenerativo** (cliente arquiva categoria por engano → sistema rebaixa → cliente nunca mais vê → nunca corrige). Mitigações: pesos com teto, decay temporal, e a camada de resultado como corretor.

**Risco LGPD real na camada 2:** memória extraída de conversa pode capturar dado pessoal de terceiros citado pelo cliente. A memória editável resolve o direito de retificação; falta política de retenção e exclusão em cascata ao encerrar contrato.

**Risco na camada 4:** com poucos tenants, "anonimizado" é reidentificável (se só existe 1 cliente de uniformes no PI, o "benchmark da categoria" é ele). Regra mínima: agregados cross-tenant só com N ≥ 5 tenants na célula.

## PARTE 8 — BANCO

O melhor artefato do projeto. 27 tabelas, nomenclatura consistente, comentários de tabela documentando decisões (raro e valioso), RLS habilitado em 100% das tabelas.

- **RLS:** tabelas de tenant com 4 políticas (CRUD por membership via `is_org_member` etc.); dados de mercado compartilhados com 1 política de leitura — modelo correto. 3 tabelas operacionais (`harvester_config`, `harvester_runs`, `alertas_integracao`) com RLS habilitado e zero políticas = trancadas para tudo exceto service role. Provavelmente intencional, mas **não documentado** — se for acidente, o painel BX4 admin não vai conseguir lê-las; documentar ou criar política de admin.
- **Índices:** `licitacoes` tem UF e data de abertura, mas **não tem índice em `orgao_id`** — e o Raio-X faz exatamente `count(*) where orgao_id = X`. Com 189 linhas é invisível; com 1 milhão é a primeira query a morrer. Falta também busca textual (`objeto_compra` sem GIN/trigram — "pregões de TI" vai virar `ILIKE '%ti%'` sequencial).
- **Falha canônica conhecida e ainda aberta:** `licitacoes.orgao_id` não aponta para o ente canônico criado pelo SICONFI (registrado em memória do projeto). Isso quebra o join central do produto (Raio-X = SICONFI × PNCP × emendas no mesmo órgão). **É a dívida de dados mais crítica do projeto.**
- **Vetores:** `edital_embeddings` com HNSW já criado — prematuro mas inofensivo. Decisão pendente: modelo de embedding e dimensão ainda não fixados em migration → fixar antes da primeira carga, mudar depois custa reindexar tudo.
- **O que falta para os princípios 6–8:** `eventos` (append-only, particionada por mês), `memorias`, `agent_runs`, `agent_mensagens`, `uso_ia` (medição de cota). **A tabela `eventos` deveria existir desde já** — telemetria não tem backfill: cada semana sem ela é aprendizado perdido para sempre.

## PARTE 9 — EXECUÇÃO

- **O que existe:** pg_cron → pg_net → Edge Functions (3 jobs agendados), retry com backoff dentro dos harvesters, run log (`harvester_runs`), incidentes (`alertas_integracao`). Para ingestão de dados públicos em escala piloto: **adequado e bem feito**.
- **O que não existe:** queues (sem pgmq), DLQ (o retry é in-process; se a function morre no meio, o run se perde — a idempotência salva os dados, não a observação), workers de longa duração (Edge Function tem timeout ~150s — suficiente para harvest municipal, insuficiente para rotinas de agente multi-passo), streaming (nenhum SSE), observabilidade (sem tracing; logs = tabelas + console).
- **Riscos concretos:** (1) o comando do cron embute o JWT anon hardcoded no banco — o anon key é público por natureza, mas as functions de harvest deveriam exigir um segredo próprio (`x-harvester-secret`) para não serem invocáveis por qualquer um que conheça a URL; (2) fan-out futuro (rotina semanal × 1.000 tenants) não cabe em pg_cron+pg_net — precisa de queue. **Adotar pgmq (extensão Supabase) quando as rotinas nascerem: `rotina agendada → enfileira 1 msg/tenant → worker consome com retry/DLQ`.** É o mesmo Postgres, zero infra nova, e a migração futura para SQS/Temporal é troca de driver.

## PARTE 10 — ROTINAS

Resposta direta: **Scheduler + Event-driven + State Machine no dado. Não usar engine de workflow, não usar DAG engine.**

Justificativa: o princípio 10 já decidiu certo — rotinas são orquestrações das mesmas tools. Um DAG engine (Airflow/Temporal) introduz uma segunda linguagem de execução, viola o princípio e não paga seu custo com rotinas de 3–6 passos majoritariamente lineares. O modelo: rotina = **plano declarativo em JSON** (sequência de tools + prompt de síntese) numa tabela `rotinas`, disparada por cron (agenda) ou evento (ex.: harvester detecta contrato vencendo → enfileira). Cada execução = linha em `agent_runs` com state machine explícita (`agendada → executando → aguardando_confirmacao → concluida/falhou`) — retry e auditoria vêm do dado, não de engine. Quando (se) as rotinas ficarem realmente complexas em 2–3 anos, esse JSON declarativo é traduzível para Temporal sem reescrever tools — a saída de emergência existe.

## PARTE 11 — ESCALABILIDADE (10.000 empresas · 100 agentes · 100M embeddings · 1M conversas)

A arquitetura decidida sobrevive com upgrades planejáveis; a implementada não chega nem perto — mas o gargalo não é onde parece:

**Ordem em que as coisas quebram:**
1. **Primeiro (já em ~50 tenants):** leitura client-side sem cache — cada usuário refaz as mesmas agregações do Raio-X contra o Postgres. Resolve-se com a própria Fase A (tools server-side) + views materializadas para agregados de órgão (o dado é diário, não precisa ser computado por request).
2. **~500–1.000 tenants:** pg_cron/pg_net como orquestrador de fan-out. Resolve com pgmq (Parte 9).
3. **~10–20M embeddings:** pgvector/HNSW no mesmo Postgres transacional — a manutenção do índice compete com OLTP. Resolve movendo embeddings para instância Postgres separada (mesma tecnologia) ou serviço dedicado. 100M embeddings, aliás, é improvável: o corpus é editais do recorte dos clientes, não a internet — com pré-extração no harvest (decisão já tomada), 100M viraria ~5–10M úteis.
4. **~5.000+ tenants:** RLS com subquery de membership em toda query. Resolve com claim de `org_id` no JWT (política vira comparação de constante) — mudança de política, não de arquitetura.
5. **O que NUNCA quebra se a Fase A for feita:** o contrato das tools. Esse é o ponto da arquitetura decidida — o runtime embaixo das tools pode trocar (Edge → workers → filas) sem que agente, telas ou rotinas percebam.

Supabase como plataforma aguenta esse caminho até bem longe (Postgres gerenciado escala verticalmente muito além do que 10k tenants de B2B nicho geram). O risco de plataforma real é **lock-in de Edge Functions/pg_net** — mitigado se as tools forem TypeScript puro (portável para qualquer runtime Node).

## PARTE 12 — SEGURANÇA

| Item | Estado | Ação |
|---|---|---|
| RLS | Sólido no modelo; 3 tabelas ops sem política (documentar intenção) | Baixa |
| Advisors ativos | `SECURITY DEFINER` helpers (`is_org_member` etc.) executáveis via REST por qualquer autenticado — vazamento de informação de membership possível | **Alta: revogar EXECUTE do role `authenticated`** (as políticas continuam funcionando; a exposição via `/rest/v1/rpc/` não) |
| Proteção de senha vazada | Desabilitada (advisor WARN) | Alta: ligar (1 clique) |
| Segredos | `.env` fora do git ✓; service role só em Edge Functions ✓; JWT anon no comando do cron (aceitável, mas adicionar segredo próprio de harvester) | Média |
| Tenant isolation | RLS + (futuro) tenant_id injetado no runtime das tools, nunca vindo do modelo | Fase A |
| LGPD | Dados públicos governamentais = ok; risco está na memória do agente (Parte 7) — retenção + exclusão em cascata não desenhadas | Média (antes da camada 2) |
| **Prompt injection** | **A superfície mais séria do produto futuro** — o agente vai ler editais (PDFs de terceiros!) e um edital malicioso/errado pode conter instruções. Defesas: conteúdo de edital SEMPRE marcado como dado não-confiável no prompt; tools write jamais executáveis a partir de conteúdo de documento; confirmação humana como última linha | **Crítica no design da Fase B** |
| Tool injection | Registry fechado (sem tool dinâmica), parâmetros validados por Zod, tenant_id fora do alcance do modelo | Fase A |
| Confirmação de escrita | Decidida, inexistente. Deve ser transacional: proposta persistida em `agent_runs`, confirmação = update auditado, execução lê a proposta persistida (nunca re-gera) | Fase C |

## PARTE 13 — DÍVIDA TÉCNICA

**Crítica** (bloqueia o agente ou corrompe o futuro):
1. `licitacoes.orgao_id` não aponta pro ente canônico — quebra o join central do produto.
2. Ausência da tabela `eventos` — telemetria perdida a cada dia, sem backfill possível.
3. Acesso a dados client-side sem camada de servidor — se as tools nascerem copiando esse padrão, o princípio 4 morre.

**Alta:**
4. 12 telas com mock embutido no componente — o custo de conexão cresce a cada tela nova aprovada.
5. `SECURITY DEFINER` exposto via REST + proteção de senha vazada desligada.
6. Índices ausentes: `licitacoes(orgao_id)`, busca textual em `objeto_compra`.
7. Widgets não extraídos (componentes presos em páginas) — pré-requisito da UI generativa.

**Média:**
8. Sem segredo próprio nos harvesters (invocáveis com anon key).
9. Modelo/dimensão de embedding não fixado antes da primeira carga.
10. `audit_logs` existe mas nenhum caminho de escrita — falsa sensação de auditoria.
11. Regra N≥5 da inteligência cross-tenant não especificada em lugar nenhum.

**Baixa:**
12. `database.types.ts` importado direto em páginas (trocar por tipos de domínio quando as tools existirem).
13. `tsconfig.check.tsbuildinfo` e artefatos de build commitáveis sem repo Git ainda criado (aliás: **não existe repositório Git** — isso deveria ser resolvido esta semana, é backup e auditoria de graça).

## PARTE 14 — PLANO DE REFATORAÇÃO (roadmap técnico, sem código)

**Fase A — Fundação (antes de qualquer linha do agente):**
Criar repo Git privado · corrigir vínculo canônico `licitacoes.orgao_id` · criar tabelas `eventos`, `agent_runs`, `memorias`, `uso_ia` · índices faltantes · revogar EXECUTE dos helpers / ligar proteção de senha · nascer `lib/agent/tools/` com contrato Zod + registry + tenant injetado, server-side, cobrindo leitura de licitações e Raio-X · route handlers (`app/api/agent`, `app/api/tools`) como única porta do browser · extrair 6 widgets para `components/widgets/` com registry.

**Fase B — Agente v1 (read-only):** loop LLM com tool-calling + SSE + blocos `{widget, props}` · painel lateral + página Agente · takeaway tipado · eventos de telemetria emitidos · guardrail de emendas no system prompt e no registry.

**Fase C — Writes:** confirmação transacional persistida em `agent_runs` · audit log escrevendo de verdade · labels de feedback (Adicionar/Dispensar) gravados em `eventos`.

**Fase D — Aprendizado e custo:** job pós-conversa de extração de memória (visível/editável na UI) · medição de tokens por run → cota por tenant · primeira versão da camada de resultado (participou/ganhou).

**Fase E — Rotinas:** pgmq + worker de rotinas · planos declarativos em `rotinas` · 3 rotinas pré-carregadas do PRD.

**Fase F — Escala (sob demanda, não antecipar):** views materializadas de agregados · claim org_id no JWT · embeddings em instância própria · MCP server externo (empacotamento das tools da Fase A).

Estimativa honesta: A+B são a maior parte do valor e do risco. Tudo que está em C–F fica barato se A for feita direito, e caro se não for.

## PERGUNTA FINAL — "Você faria esta arquitetura?"

**Sim para a plataforma e o modelo; não para dois pontos do desenho atual — e este comitê os mudaria antes de escrever o agente.**

**O que este CTO manteria (e por quê):** Supabase + Next.js + Vercel para este estágio é a escolha certa, e não por conveniência — Postgres com RLS é o melhor modelo de multi-tenancy B2B existente; pg_cron/pgmq/pgvector no mesmo banco elimina três infraestruturas; e o negócio (consultoria R$5–30k, dezenas→centenas de tenants, não milhões) não justifica Kubernetes, microserviços nem event bus dedicado. Quem monta arquitetura de 10.000 tenants no dia 1 gasta os 10 anos pagando por ela. Os 10 princípios estão certos, especialmente o 4 e o 10 — tools como átomo único de inteligência é o que garante os "10 anos sem reescrever": tudo acima (chat, telas, rotinas, MCP) e tudo abaixo (runtime, filas, workers) pode trocar sem tocar no contrato.

**O que este CTO mudaria (e vai custar caro se não mudar agora):**
1. **Inverteria a relação telas↔dados.** Não existe "conectar as telas ao Supabase" no roadmap deste CTO — existe "conectar as telas às tools". A tela é um consumidor do agente, não um irmão dele. Isso transforma as 12 telas mock de dívida em vantagem: elas viram as especificações visuais dos widgets.
2. **Começaria pelo evento, não pelo chat.** A tabela `eventos` append-only é a decisão mais barata e mais irreversível do projeto (histórico não tem backfill). Toda a promessa de "aprender continuamente" depende dela existir antes do primeiro usuário real.

**Desenho que este comitê adotaria** (o mesmo decidido, com as duas correções acima explícitas):

```
                    ┌─────────────────────────────────────────┐
                    │   SUPERFÍCIES: telas · chat · rotinas · │
                    │   futuro MCP externo — todas clientes    │
                    │   do MESMO runtime de agente             │
                    └───────────────┬─────────────────────────┘
                                    │ route handlers (única porta)
                    ┌───────────────▼─────────────────────────┐
                    │  AGENT RUNTIME  (agent_runs, streaming,  │
                    │  confirmação de write, cota, guardrails) │
                    └───────────────┬─────────────────────────┘
                                    │ registry
                    ┌───────────────▼─────────────────────────┐
                    │  TOOLS (lib/agent/tools — Zod, tenant    │
                    │  injetado, TS puro, portável p/ MCP)     │
                    └──────┬──────────────────────┬────────────┘
                           │                      │ emite
                    ┌──────▼───────┐      ┌───────▼───────────┐
                    │  POSTGRES    │      │  EVENTOS (append-  │
                    │  RLS·pgvector│      │  only) → jobs de   │
                    │  ·pgmq·cron  │      │  memória/score/uso │
                    └──────▲───────┘      └───────────────────┘
                           │ harvesters (padrão já validado)
                    PNCP · SICONFI · CGU · PCA · Diários (futuro)
```

A frase que resume o TDR: **o Sentinela decidiu a arquitetura certa e ainda não a construiu — e o maior risco dos próximos 60 dias é a pressa de ver o agente funcionando fazer vocês construí-lo em cima do padrão errado que já está na tela.** A Fase A custa dias e compra os 10 anos.
