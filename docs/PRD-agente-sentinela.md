# PRD — Agente Sentinela (camada AI-native)

**Decidido pelo Bione em 02/07/2026**, após análise do painel "Ask CLEATUS" (print), de `engenharia-reversa-cleatus.md` e dos PRDs existentes. Este documento fixa a arquitetura; nenhuma tela nova começa sem modelo de referência (regra do projeto).

## O que o print da CLEATUS ensinou (além do doc de engenharia reversa)

O painel do agente é **UI generativa**, não chat de texto: a pergunta "what's in my pipeline" retorna widgets em sequência (Pipeline loaded → card do Pursuit com match/compliance/due/contrato/tasks → Pipeline Snapshot com 4 métricas, pizza por fase, tabela, "Main takeaway") e só ao final uma recomendação textual com próxima ação. Botões de ação dentro do chat ("Open in CLEATUS", "Archive") tornam o agente operador, não só consultor. Rodapé com seletor de contexto ("@ to add context" + chip do objeto) ancora a conversa numa entidade específica.

## Decisões (8, fechadas)

| # | Tema | Decisão |
|---|---|---|
| 1 | Posição UX | **Home + painel lateral.** Chat vira entry point da plataforma (convive com Alvos Quentes) e abre como painel lateral em qualquer tela, herdando o contexto da tela atual. |
| 2 | Poderes | **Leitura + escrita com confirmação.** Toda escrita (pipeline, tarefa, agenda) exige confirm-before-change explícito + audit log. "Copiloto, nunca piloto" continua valendo. |
| 3 | Formato | **UI generativa reusando componentes existentes** (card `Alvo`, semáforo do Raio-X, tabela de licitações) renderizados dentro do chat + takeaway em texto com fonte citada. |
| 4 | Sequência | **Agente primeiro, sobre dado real** (152 licitações Teresina, SICONFI, PCA; emendas quando o token entrar). Conectar as 12 telas mock ao Supabase vira fase seguinte. Agente = prova de valor da Fase 0. |
| 5 | Emendas | **Lista negativa vale no agente.** Cita emenda como contexto de demanda (valor, prazo, categoria); recusa busca por parlamentar/partido (guardrail no system prompt + filtro de tools). Prospecção política, se existir, é ferramenta interna BX4 separada, sem marca Sentinela. |
| 6 | Custo IA | **Cota mensal por tenant.** X interações/mês incluídas no contrato de consultoria, medidas na tela "Uso de IA"; excedente = upsell. Valor de X a calibrar no piloto. |
| 7 | MCP externo | **Fase 2.** Tools nascem desacopladas do chat (mesmo contrato interno), para que expor como MCP server depois seja empacotamento, não reescrita. |
| 8 | Tools dia 1 | **As 4:** buscar/filtrar licitações (PNCP) · Raio-X do órgão (SICONFI+PNCP) · pipeline write em Minhas Licitações (com confirmação) · pesquisa de preços. |

## Arquitetura decorrente

- **Camada de tools** (`lib/agent/tools/`): funções tipadas sobre o Supabase (RLS do tenant), independentes do chat — pré-requisito da decisão 7. Cada tool declara `read` ou `write`; `write` obriga payload de confirmação.
- **Camada de chat**: streaming com tool-calling (Claude API), respostas estruturadas em blocos `{widget, props}` que o front resolve para os componentes já construídos.
- **Guardrails**: system prompt com a lista negativa de emendas + recusa padrão; nenhuma tool aceita parâmetro `autor/parlamentar/partido`.
- **Medição**: cada interação grava tokens/custo em tabela de uso por tenant (alimenta a tela "Uso de IA" e a cota da decisão 6).
- **Contexto de tela** (painel lateral): a tela ativa injeta a entidade em foco (órgão, licitação) como contexto inicial — equivalente ao chip "@ context" da CLEATUS.

## Padrões de UI confirmados (prints CLEATUS, 02/07/2026 — modelos de referência aprovados)

- **Duas superfícies**: aba "Agente" ao lado de "Painel" (chat como página inteira, com histórico de threads na lateral direita: Hoje / Últimos 7 dias, busca de chats, novo chat) + painel lateral persistente que acompanha a navegação em todas as telas até ser fechado.
- **Estado vazio anti-blank-page**: saudação + placeholder com exemplo de pergunta + 3 cards de sugestão categorizados ("Encontre novas licitações" / "Confira meu pipeline" / "O que vence esta semana") + histórico recente.
- **Widgets com ação dentro do chat**: cards de licitação com botões "Adicionar ao Pipeline" / "Dispensar" / "Abrir" — cada clique é também um label de feedback (camada 3 do aprendizado). Blocos colapsáveis por etapa ("Recomendações carregadas ▾", "Trabalhando... ▾", "Completo ▾") mostrando o agente executando em passos.
- **Snapshot final**: cards de métrica + alerta de urgência ("Aja primeiro no prazo de 07/07") + takeaway em texto com recomendação de próxima ação.
- **Chip de contexto** no rodapé do input ("@ para adicionar contexto") — ancora a conversa em órgão/licitação específica; telas injetam a entidade em foco automaticamente no painel lateral.
- **Medidor de completude do perfil** no topo ("Add capabilities — 17%") + modal explicando por que perfil incompleto degrada o matching ("a IA está adivinhando"). Alimenta a camada 1 do aprendizado.
- **Disclaimer** "Versão inicial" nas respostas (gerencia expectativa, reforça copiloto).

## Arquitetura de aprendizado (como o agente "aprende" — decidido 02/07/2026)

Princípio: **o modelo nunca aprende; o sistema aprende.** Sem fine-tuning por cliente (caro, lento, risco LGPD). O agente melhora porque lê contexto melhor a cada dia, em 4 camadas:

| Camada | O quê | Fonte | Fase |
|---|---|---|---|
| 1. Perfil vivo do tenant | CNPJ, CNAEs, certidões, UFs, capacidade financeira, histórico de vitórias — melhora o matching de todos os alvos | Tela Minha Empresa + auto-import futuro (SICAF/Transparência) | 1 |
| 2. Memória explícita | Fatos duráveis extraídos pós-conversa por job barato (Haiku): "não atua fora do PI", "margem mínima 15%". Injetados no system prompt. **Visível e editável pelo cliente** (LGPD + corrige aprendizado errado) | Conversas do chat | 1 |
| 3. Feedback implícito | Cada ação é label: Dispensar = negativo, Adicionar ao Pipeline = positivo, vitória = positivo forte → ajusta pesos do score do tenant. Por regras primeiro; ML só com volume. Nunca autoajuste sem log auditável | Telemetria da plataforma | 2 |
| 4. Inteligência cross-tenant | Agregada e anonimizada, nunca dado de um cliente exposto a outro: baseline preço-que-ganha, taxa emenda→edital por órgão, tempo empenho→edital. Moat da BX4 — melhora com cada cliente novo | Harvesters + resultados observados | 3 |

Guardrails: camadas 1–3 isoladas por RLS/tenant; memória injetada enxuta (fatos, não histórico inteiro — protege a cota da decisão 6).

## Rotinas — automações pré-carregadas (decidido 02/07/2026)

Avaliação do "Workflows" da CLEATUS: **builder no-code visual NÃO entra** (semanas de build, complexidade desnecessária, cliente de consultoria não monta fluxo). **Automações pré-carregadas ENTRAM** — tecnicamente são sequências pré-definidas das mesmas tools do agente + agendamento pg_cron (já usado nos harvesters). Não é produto novo; é o agente com roteiro fixo.

Encaixe estratégico que a CLEATUS não tem: **as rotinas são o entregável da consultoria** — a BX4 configura na implantação (categorias, órgãos-alvo, recorte), justificando o ticket R$5–30k e diferenciando de SaaS self-service.

Rotinas candidatas (todas sobre as tools do dia 1): radar semanal de novas licitações do perfil · leitura de edital → checklist de habilitação + prazos → agenda · pesquisa de preços pré-proposta · dossiê de concorrente · alerta de contrato vencendo (pré-bid 12–18 meses). Resultado entregue como thread no chat + notificação. Cada execução consome a cota do tenant.

**Sequência:** fase imediatamente seguinte ao agente (depende das tools prontas — é orquestração, não build novo).

## Fora de escopo (agora)

MCP server externo (Fase 2) · builder no-code de workflows (nunca no MVP; rotinas são pré-carregadas pela BX4) · tool de emendas até o token `PORTAL_TRANSPARENCIA_TOKEN` entrar e a copy do PRD-emendas estar em produção · robô de lances/monitoramento (fora do MVP por regra do projeto) · busca por parlamentar (nunca — lista negativa).

## Próximo passo

Modelos de referência completos (prints CLEATUS: home+painel, página Agente com histórico, widgets com ação, estado vazio, workflows). Ordem de build: tools read-only (busca + raio-x) → chat com widgets → writes com confirmação + labels de feedback → memória explícita → cota/medição → rotinas pré-carregadas.
