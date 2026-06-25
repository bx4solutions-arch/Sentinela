# INVENTÁRIO — MeuJurídico.ai → Sentinela
*Fase 1 de 2 — análise somente, zero migração*
*Data: 2026-06-25 | Autor: Claude Code (análise direta do repositório)*

---

## CONTEXTO EXECUTIVO

O MeuJurídico.ai (`/Users/severinobione/Antigravity -meu-juridico-ai`) é uma plataforma
**do lado do comprador** (órgãos públicos) que automatiza geração de documentos de licitação.
O Sentinela é do **lado do vendedor** (empresas licitantes). Mesmo substrato de dados (PNCP,
Lei 14.133/2021), perspectiva oposta. O que migra é **motor**, não produto.

> O plano de migração já foi redigido em `docs/PLANO-MIGRACAO-MEUJURIDICO-SENTINELA.md`.
> Este inventário documenta o estado **real** do código para sustentar decisões de escopo.

---

## ⚠️ DECISÃO CRÍTICA DE DESIGN — LEIA ANTES DE TUDO

### Dois sistemas visuais coexistem hoje

| Atributo | MeuJurídico (fonte) | Sentinela — LicitaPro overhaul |
|---|---|---|
| Primary color | navy `224 85% 29%` (`#0B2D89`) | petróleo `204 77% 26%` (`#0F4C75`) |
| Success/positivo | verde `142 72% 29%` | **azul** `217 91% 60%` (zero verde — regra do Bione) |
| Border radius | `0.5rem` (8px) | `0.75rem` (12px) — LicitaPro |
| Font-size xs | `0.75rem` (12px Tailwind padrão) | `0.8125rem` (13px — floor de legibilidade LicitaPro) |
| Shadows | padrão Tailwind | `card: 0 4px 24px rgba(15,76,117,0.06)` LicitaPro |
| Stack | React + Vite + React Router | Next.js App Router + RSC |
| Componentes UI | ~50 arquivos em `src/components/ui/` (Radix/shadcn) | `components/ui.tsx` (barrel compacto) |
| Sidebar | dark navy `222 47% 11%` | dark navy igual — match perfeito |

**O design system MeuJurídico foi declarado como base 1:1 do Sentinela** (ver
`docs/design-system.md` e comentário em `tailwind.config.ts`), **mas o overhaul LicitaPro
mudou primary + success + radius**. Os dois já divergiram.

### Qual manda?

```
╔═══════════════════════════════════════════════════════════════════════╗
║  OPÇÃO A — MeuJurídico vira a base                                   ║
║  Navy #0B2D89 · verde retorna · radius 8px · componentes MeuJurídico ║
║  Prós: componentes ricos prontos (50+ files), identidade juridica     ║
║  Cons: desfaz o overhaul LicitaPro; verde volta; reconfigura stack   ║
╠═══════════════════════════════════════════════════════════════════════╣
║  OPÇÃO B — LicitaPro manda (Sentinela atual)                         ║
║  Petróleo #0F4C75 · zero verde · radius 12px · componentes portados  ║
║  Prós: overhaul intacto, zero verde cumprida, stack Next.js moderno  ║
║  Cons: portar ~20 componentes do MeuJurídico no visual LicitaPro     ║
╚═══════════════════════════════════════════════════════════════════════╝
```

**Recomendação do sócio crítico:** **OPÇÃO B** — LicitaPro manda. O Bione aprovou o overhaul
petróleo/âmbar. "Zero verde" é regra sua. Voltar ao navy do MeuJurídico seria desfazer
trabalho recente. O custo de portar componentes é menor que o custo de desfazer o overhaul.

**Escolha aqui (Bione decide):** ☐ OPÇÃO A — MeuJurídico base | ☐ OPÇÃO B — LicitaPro base

---

## PARTE A — INVENTÁRIO VISUAL

### A.1 Stack e estrutura

```
MeuJurídico
├── React 18 + Vite + React Router v6
├── TypeScript + Tailwind 3 + shadcn/ui (Radix primitives)
├── ~80 componentes TypeScript / TSX
├── ~35 páginas em src/pages/
└── src/index.css — design tokens HSL

Sentinela
├── Next.js App Router + React 19 + TypeScript
├── Tailwind 3.4 + shadcn barrel em components/ui.tsx
├── ~3 componentes (shell.tsx, charts.tsx, ui.tsx)
└── app/globals.css — LicitaPro tokens
```

### A.2 Design tokens — comparativo preciso

| Token | MeuJurídico | Sentinela LicitaPro | Diverge? |
|---|---|---|---|
| `--primary` | `224 85% 29%` (navy) | `204 77% 26%` (petróleo) | ✅ sim |
| `--success` | `142 72% 29%` (verde) | `217 91% 60%` (azul) | ✅ sim |
| `--destructive` | `0 84% 50%` (vermelho) | `6 78% 57%` (vermelho-salmão) | ✅ sim |
| `--radius` | `0.5rem` | `0.75rem` | ✅ sim |
| `--sidebar-background` | `222 47% 11%` | `222 47% 11%` | ✔ igual |
| `--warning` | `38 92% 50%` (âmbar) | `38 92% 50%` (âmbar) | ✔ igual |
| `--background` | `210 40% 98%` | `214 33% 97%` | ~ quase |
| Fonte | Inter | Inter (via next/font) | ✔ igual |

### A.3 Inventário de componentes MeuJurídico

#### Layout e navegação (6 componentes)
| Componente | Localização | O que faz | Portabilidade Sentinela |
|---|---|---|---|
| `AppLayout` | `components/layout/AppLayout.tsx` | Wrapper com sidebar + topbar | Substituível pelo `Shell` |
| `AppSidebar` | `components/layout/AppSidebar.tsx` | Sidebar colapsável Radix | Portar para Shell (rica) |
| `TopBar` | `components/layout/TopBar.tsx` | Header com busca + notificações | Portar |
| `NotificationBell` | `components/layout/NotificationBell.tsx` | Sino com badge realtime | Portar |
| `DocumentLayout` | `components/layout/DocumentLayout.tsx` | Layout de editor de documentos | Específico comprador |
| `NavLink` | `components/NavLink.tsx` | Link ativo de nav | Já existe no Shell |

#### Cards e KPIs (4 componentes)
| Componente | Localização | O que faz | Portabilidade |
|---|---|---|---|
| `KpiCard` | `components/KpiCard.tsx` | Card métrica: ícone + label + valor | ⭐ Portar direto |
| `ProcessCard` | `components/ProcessCard.tsx` | Card de processo (kanban/lista) | Adaptar para licitação |
| `ScorePill` / `ScoreCircle` | `components/score/ScorePill.tsx` | Badge score + anel SVG 90px | ⭐⭐ Portar para Veredito |
| `ScoreBar` | `components/score/ScoreBar.tsx` | Barra de progresso score | ⭐ Portar |

#### Inteligência e AI (8 componentes)
| Componente | O que faz | Portabilidade |
|---|---|---|
| `LexiaChat` | Chat UI com Léxia (análise jurídica streaming) | ⭐⭐⭐ **CORE** — portar como Consultor Sentinela |
| `ChatJuridico` | Chat contexto-processo com histórico | ⭐⭐ Portar como chat da Pasta |
| `SidebarAssistant` | Painel lateral AI durante wizard | Específico comprador |
| `IntelligenceTimeline` | Timeline legislativa realtime (TCU/DOU/AGU) | ⭐⭐ Portar — o Sentinela não tem |
| `AlertaSuperfaturamento` | Alerta de preço acima de referência | ⭐⭐ Portar no Raio-X de Preço |
| `AuditTrail` | Histórico de ações no documento | Específico comprador |
| `DocumentChainView` | Cadeia de aprovação visual | Específico comprador |
| `KanbanBoard` | Board drag-and-drop de processos | Sentinela tem Kanban próprio |

#### Documento — wizard de geração (15 componentes)
> Todos específicos do fluxo comprador (DFD/ETP/TR/etc). **NÃO portar** como wizard.
> Portar apenas os sub-componentes neutros:

| Componente | Portabilidade |
|---|---|
| `SectionCard` | Adaptar para exibir seções do edital na Pasta |
| `RichTextEditor` | ⭐⭐ Portar para editor de proposta/declarações |
| `PriceResearchDrawer` | ⭐⭐⭐ **CORE** — motor de preço UI (Sheet + gráfico recharts) |
| `DocGenProgress` | Adaptar para geração do Kit de Participação |
| `NormativasSidebar` | ⭐⭐ Portar como sidebar de leis na Pasta |
| `FeedbackPanel` | Portar para feedback do Consultor |

#### Score e conformidade (5 componentes)
| Componente | Portabilidade |
|---|---|
| `OrgaoScorePanel` | Adaptar: Painel de Veredito/Chance |
| `ProcessoScorePanel` | Adaptar: Score de adequação da empresa |
| `ScorePill` | ⭐⭐⭐ Portar direto — universal |
| `ScoreBar` | ⭐⭐ Portar direto |
| `CertificadoLisura` | Não aplicável (comprador) |

#### Admin e configuração
> `AdminDashboard`, `AdminMonitoramento`, etc — específicos SaaS comprador. Não portar.
> Exceção: `LearningLoopMetrics` (metrics do LLM) pode ser útil no admin do Sentinela.

#### Base de conhecimento (6 componentes)
| Componente | Portabilidade |
|---|---|
| `FederalSourcesPanel` | ⭐⭐ Portar — lista fontes jurídicas federais |
| `InstructionsPanel` | Adaptar para instruções do Consultor |
| `OrgDocsPanel` | Não portar (docs do órgão público) |
| `SourceBadge` | ⭐ Portar — badge de fonte (TCU/DOU/etc) |
| `UpdateCalendarPanel` | ⭐ Portar — calendário de atualizações normativas |

### A.4 Telas/páginas do MeuJurídico (35 páginas)

#### Portáveis (adaptação moderada)
| Página | Adaptar para Sentinela |
|---|---|
| `Dashboard.tsx` (714 linhas) | Rico: KPIs 4-cards, kanban fluxos, timeline IA, pesquisa preços, TCE/PNCP quick links |
| `PesquisaPrecos.tsx` | ⭐⭐⭐ Motor de pesquisa de preços (recharts, IQR, mediana, fontes rastreáveis) |
| `MapaDePrecos.tsx` | ⭐⭐ Visualizações de mercado (heatmap por UF, tendência) |
| `BaseConhecimento.tsx` | ⭐⭐ Portar como "Base Jurídica" da Pasta |
| `Conformidade.tsx` | Adaptar: histórico de alertas normativos |
| `LandingPage.tsx` | Não portar (produto diferente) |

#### Específicos comprador (não portar)
`Documento.tsx`, `Documentos.tsx`, `SelecionarTipoDocumento.tsx`,
`PosContratacao.tsx`, `AvaliacaoPropostas.tsx`, `PCA.tsx`, `MapaDeRiscos.tsx`,
`DnaInstitucional.tsx`, `IdentidadeVisual.tsx`

### A.5 Brand assets
```
MeuJurídico/src/assets/brand/
├── logo-badge-icon.png        # J azul-marinho compacto (sidebar collapsed)
├── logo-badge-full.png        # J + "meu jurídico" (sidebar expandida)
└── logo-badge-icon-purple.png # variante roxa

Sentinela/public/
└── icon.svg, manifest, etc.  # sem logo própria ainda
```
A brand do MeuJurídico (azul-marinho + J) não deve ir para o Sentinela — marcas distintas.
O Sentinela precisa de logo própria.

---

## PARTE B — INVENTÁRIO DE INTELIGÊNCIA

### B.1 Léxia — RAG jurídico (o ativo mais valioso)

**O que é:** sistema completo de RAG jurídico sobre a Lei 14.133/2021 + jurisprudência.

**Componentes:**
```
supabase/functions/lexia/index.ts          — Edge Function principal
supabase/migrations/20260514060000_lexia_corpus.sql  — Tabela pgvector
supabase/migrations/20260514070000_lexia_search_fn.sql — RPC lexia_search()
supabase/migrations/20260514080000_lexia_seed_lei14133.sql — 18 artigos semeados
scripts/import-lexia-corpus.ts             — Script de ingestão
scripts/seed-lexia-no-embedding.ts         — Seed sem embedding
```

**Arquitetura RAG:**
1. `lexia_corpus` — tabela com `vector(1536)` (OpenAI text-embedding-3-small)
2. IVFFlat index cosine (100 listas, ~10k documentos)
3. `lexia_search(query_embedding, match_count)` — RPC similaridade
4. Fallback degraded sem embeddings
5. Claude Sonnet 4.6 / Haiku 4.5 routing por complexidade
6. Response: `{ analysis, risk_level, recommended_action, sources }` JSON estruturado

**Corpus atual (semeado):**
- 18 artigos-chave da Lei 14.133/2021 (Arts. 1, 6, 11, 14-15, 18, 22, 25, 33, 37, 47, 54-55, 62-70, 89, 103, 117, 140-141)
- Acórdãos TCU via API pública
- Instruções Normativas (SEGES 58, 65, 94) como fallback estático
- Leis: LexML feed (LeXML.gov.br)
- **Embeddings: pendentes de preenchimento** (seed tem `embedding = NULL`)

**Versus Sentinela atual:**
> Sentinela tem `lib/consultor.ts` — **66 linhas determinísticas** com 5 respostas hardcoded
> (posso participar / o que me inabilita / exigência restritiva / ME-EPP / inexequibilidade).
> O próprio código diz: "RAG completo sobre a lei inteira + jurisprudência fica para quando
> o corpus do MeuJurídico entrar."
> **Gap confirmado, Léxia é a solução.**

### B.2 Motor de geração de documentos

**O que existe:**
```
supabase/functions/orchestrate_document/index.ts  — Orquestrador principal (Wave Scheduler)
supabase/functions/document-generator/index.ts    — Gerador de seções com Claude
supabase/functions/ai-melhorar/index.ts           — Reescrever seção com IA
supabase/functions/ai-autopreencher/index.ts      — Preencher campos automaticamente
supabase/functions/ai-validar-objeto/index.ts     — Validar objeto de contratação
supabase/functions/ai-gerar-justificativa/index.ts — Gerar justificativa de preço
supabase/functions/ai-rewrite-contextual/index.ts  — Reescrita contextual
supabase/functions/calcular-score-conformidade/index.ts — Score LLM por documento
```

**Templates de documentos (src/lib/templates/):**
| Template | Seções | Referência legal |
|---|---|---|
| `dfd-template.ts` | 8 seções | Art. 12, VII Lei 14.133/2021 |
| `etp-template.ts` | 11 incisos obrigatórios | Art. 18, §1º e §2º |
| `tr-template.ts` | 16 seções (alíneas a-j) | Art. 6º, XXIII |
| `projeto-basico-template.ts` | 7 seções + memorial | Art. 6º, XXV |
| `edital-template.ts` | Arts. 25, 33, 40, 54-55 | Lei 14.133/2021 |
| `contrato-template.ts` | Minuta padrão | Art. 89 |
| `mapa-risco-template.ts` | Matriz 5x5 | Art. 22 + Art. 103 |
| `pca-template.ts` | PCA completo | IN SEGES 58/2022 |
| `justificativa-preco-template.ts` | Pesquisa de preços | IN SEGES 65/2021 |
| `parecer-template.ts` | Parecer jurídico | Art. 53 |

**Qualidade do prompt do orquestrador:** excepcional.
- Obrigações legais mínimas por tipo (`LEGAL_REQUIREMENTS_BY_DOC_TYPE`) com artigos exatos
- Proibição explícita de colchetes `[]` no output
- Prompt Caching ativo (header `anthropic-beta: prompt-caching`)
- `-40% custo confirmado` segundo CLAUDE.md

**Portabilidade para Sentinela:**
- Templates de proposta/declarações (lado vendedor) não existem ainda
- O motor (prompting + Wave Scheduler + Score) é completamente portável
- Os prompts de DFD/ETP/TR não são relevantes para o Sentinela
- **O Kit de Participação precisará de novos templates** (proposta comercial, declarações ME/EPP,
  planilha de custos) — mesma arquitetura, prompts diferentes

### B.3 Motor de pesquisa de preços

**O que existe:**
```
supabase/functions/price-research/index.ts    — Pesquisa primária PNCP
supabase/functions/search-prices-inteligente/ — Busca semântica de preços
supabase/functions/price-smart-selection/     — Seleção inteligente de fontes
supabase/functions/preco-referencia/          — Preço de referência por objeto
src/pages/PesquisaPrecos.tsx                  — UI completa (recharts, IQR, mediana)
src/components/documento/PriceResearchDrawer.tsx — Drawer no wizard
```

**Capacidades:**
- IQR sanity check (descarte de outliers)
- Mediana como referência (TCU Acórdão 1.545/2018)
- CV (coeficiente de variação) semáforo de homogeneidade
- Fontes: atas RP PNCP, contratos, PNCP portal
- Histograma recharts de distribuição de preços
- Agrupamento por unidade (ex: m², hora, mês)
- Exportar para documento (injeção automática na seção)

**O Sentinela já tem motor de preço** (preco.ts, pesquisa.ts, sinais.ts) **mas menos rico**.
A UI `PesquisaPrecos.tsx` (MeuJurídico) é significativamente mais completa (recharts, análise
IQR visual, fontes detalhadas). **Portar a UI + lógica IQR/mediana.**

### B.4 Busca semântica / embeddings

**O que existe:**
```
supabase/functions/search-prices-inteligente/  — Busca semântica de preços
supabase/functions/org-memory-search/          — Memória institucional por órgão
supabase/functions/pattern-analyzer/           — Padrões de contratação
supabase/migrations/20260303999999_sprint3_knowledge_base.sql — base vectorial
supabase/migrations/20260316152919_add_camada_3_tables.sql    — camada semântica
```

**Estado:** infraestrutura pronta (pgvector habilitado), **corpus ainda em ingestão**.
O script `scripts/import-lexia-corpus.ts` existe mas os embeddings na `lexia_corpus`
são NULL (seed sem vetor). Precisa rodar a ingestão.

### B.5 Agentes (sistema multi-agente)

**MeuJurídico tem 18 agentes Edge Functions:**

| Agente | Papel |
|---|---|
| `ag-00-maestro` | Orquestrador mestre |
| `ag-01-estrategista` | Plano de contratação |
| `ag-02-redator` | Redação de seção |
| `ag-03-revisor` | Revisão jurídica |
| `ag-04-arbitro` | Arbitragem de conflito entre agentes |
| `ag-05-formatador` | Formatação ABNT/SEI |
| `ag-06-pesquisador-precos` | Pesquisa de preços automática |
| `ag-07-prospector-pncp` | Prospecção PNCP |
| `ag-08-vigia-normativo` | Vigilância normativa |
| `ag-09-indexador` | Indexação de corpus |
| `ag-10-sentinela` | Monitoramento de alertas |
| `ag-11-notificador` | Notificações |
| `ag-12-redator-pb` | Projeto Básico |
| `ag-13-redator-mapa-riscos` | Mapa de Riscos |
| `ag-14-redator-edital` | Edital |
| `ag-15-redator-contrato` | Contrato |
| `ag-16-redator-parecer-juridico` | Parecer jurídico |
| `ag-17-redator-pca` | PCA |
| `agent-factory` | Fábrica de agentes |

**Portabilidade Sentinela:** ag-07 (prospector PNCP), ag-08 (vigia normativo), ag-10 (sentinela),
ag-11 (notificador) são portáveis — o resto é específico de geração de documentos de comprador.

### B.6 Score de conformidade (calcular-score-conformidade)

**Arquitetura:**
1. Busca regras por tipo de documento
2. Envia conteúdo + regras ao Claude (Anthropic SDK)
3. Score por fiscalizador: TCU / AGU / CGU / TCE / SEGES / Procuradoria
4. Output: `{ score_geral, itens[{ artigo, status, descricao, correcao, fiscalizador, peso }], aprovacao_recomendada, nivel_risco }`

**Portabilidade Sentinela:** Alta — o mesmo motor pode avaliar:
- Risco de inexequibilidade da proposta
- Conformidade do kit de participação
- Score Veredito (com critérios reorientados para o vendedor)

### B.7 Workers de ingestão

```
supabase/functions/worker-dou-normas/     — Coleta DOU (Diário Oficial da União)
supabase/functions/worker-tcu-acordaos/   — Coleta acórdãos TCU
supabase/functions/worker-pncp-decisions/ — Decisões PNCP
supabase/functions/ingest-pncp-daily/     — Ingestão diária PNCP
supabase/functions/ingest-legal-sources/  — Fontes jurídicas (LexML + static fallback)
supabase/functions/ingest-idoneidade-daily/ — CEIS/CNEP (impedidos)
```

**Portabilidade:** ⭐⭐⭐ — o Sentinela tem harvester (Python/worker/), mas **não tem**
o pipeline de normas (DOU + TCU + LexML). Os workers de legislação são diretamente portáveis.

### B.8 TEMPLATES DOCS (documentos reais como referência)

```
TEMPLATES DOCS/
├── DFD TEMPLATE/              # template DFD real
├── ETP TEMPLATE/              # template ETP real
├── TR TEMPLATE/               # template TR real
├── TP Templates/              # templates TP
├── TEMPLATE_CONTRATO_ADMIN_14133.md  # contrato padrão
├── TR_1_1_NOVA VERSÃO LIMPA.pdf      # TR limpo real
├── ETP_MODELO SEÇÕES V.2.docx        # modelo ETP real
└── MAPA DE RISCO Governança.docx     # mapa de risco real
```

**Para o Kit de Participação:** estes templates são referência de qualidade para entender
o que os órgãos exigem — útil para gerar propostas/declarações alinhadas.

---

## PARTE C — O QUE IGNORAR

Específico do comprador — não portar:

| Item | Por quê ignorar |
|---|---|
| Wizard DFD/ETP/TR/Edital/Contrato | Produto comprador — o vendedor não gera esses |
| `OrçamentoPanel`, `AvaliacaoPropostas` | Avaliação de propostas (do lado do pregoeiro) |
| `PosContratacao` | Gestão pós-contratual (do órgão) |
| `DnaInstitucional`, `IdentidadeVisual` | Identidade do órgão público |
| `PCA.tsx`, `PCADetail.tsx` | Plano de contratações anual (comprador) |
| `MapaDeRiscos.tsx` | Mapa de riscos do contrato (comprador) |
| `CertificadoLisura` | Atestado de conformidade do processo de compra |
| Agentes ag-12 a ag-17 | Redatores de documentos de compra |
| `admin-list-users` | Admin interno do MeuJurídico |
| `score/OrgaoScorePanel` | Score do órgão público como comprador |

---

## PARTE D — RECOMENDAÇÃO PRIORIZADA

### O que o Sentinela não tem e o MeuJurídico entrega

| # | Ativo | Gap Sentinela | Prioridade | Esforço |
|---|---|---|---|---|
| 1 | **Léxia RAG (corpus + lexia_search)** | Consultor = 66 linhas determinísticas. Gap enorme. | ⭐⭐⭐ | Médio |
| 2 | **PesquisaPrecos UI** (recharts + IQR + mediana) | Motor de preço existe mas UI sem visualização | ⭐⭐⭐ | Baixo |
| 3 | **IntelligenceTimeline** (DOU/TCU/AGU realtime) | Não existe no Sentinela | ⭐⭐⭐ | Baixo |
| 4 | **Workers DOU + TCU + LexML** | Sentinela tem harvester PNCP mas sem normas | ⭐⭐ | Alto |
| 5 | **Kit de Participação** (motor docs → proposta/declarações) | Não existe | ⭐⭐ | Alto |
| 6 | **ScorePill + ScoreCircle** (componentes de score) | SVG ring já existe no dashboard, mas sem componente isolado | ⭐⭐ | Baixo |
| 7 | **PriceResearchDrawer** (sheet de pesquisa no contexto) | Sentinela tem pesquisa mas sem UI drawer contextual | ⭐⭐ | Médio |
| 8 | **Prompts legais estruturados** (LEGAL_REQUIREMENTS_BY_DOC_TYPE) | Não reaproveitável diretamente — base para Kit de Participação | ⭐ | Médio |

### Ordem recomendada de migração (quando aprovado)
```
1. Léxia corpus → Consultor real (substitui 66 linhas determinísticas)
   Mover migration + função + seed + import script para Sentinela
   Reescrever consultor.ts para chamar a Edge Function lexia/

2. PesquisaPrecos UI → Aba Inteligência Comercial / Preço
   Portar lógica IQR + mediana + recharts
   Manter visual LicitaPro (petróleo, zero verde)

3. IntelligenceTimeline → Dashboard Sentinela
   Feed normativo realtime (TCU/DOU) na tela principal

4. Workers normativos → supabase/functions/ Sentinela
   worker-dou-normas, worker-tcu-acordaos, ingest-legal-sources

5. ScorePill + ScoreBar → componentes/ui.tsx barrel
   Pequeno, alto valor (Veredito / score de prontidão)

6. PriceResearchDrawer → Pasta Inteligente
   Sheet contextual ao abrir uma licitação específica

7. Kit de Participação (sprint separado)
   Motor de documentos + novos templates (proposta, declarações)
```

---

## PARTE E — ANÁLISE DE RISCO DA MIGRAÇÃO

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| Collision de design systems | Alta | Alto | Decidir OPÇÃO A ou B ANTES de migrar qualquer componente |
| Stack incompatível (React Vite vs Next.js) | Certa | Médio | Portar componentes sem server components; ajustar imports |
| Embeddings nulos na Léxia | Certa | Alto | Rodar ingestão com OPENAI_API_KEY antes de ligar o RAG |
| Corpus insuficiente (só 18 artigos semeados) | Certa | Alto | Corpus incompleto → resposta degradada; declarar "em ingestão" |
| Supabase project diferente | Média | Alto | Léxia usa projeto MeuJurídico (uiqdpbegaowiowkwiyzr); Sentinela usa outro projeto — migrations devem ser reaplicadas |
| Duplicação de workers normativos | Baixa | Médio | Sentinela já tem harvester PNCP; não duplicar, integrar |

---

## RESUMO EXECUTIVO PARA O BIONE

**O MeuJurídico é um ativo real de engenharia.** Não é só visual — tem motores sérios.

**O que já existe, pronto para migrar:**
1. RAG jurídico (Léxia) com schema pgvector + função de busca vetorial + 18 artigos semeados
2. Motor de pesquisa de preços com IQR + mediana + UI recharts (a mais completa do ecossistema)
3. Timeline legislativa realtime (TCU/DOU/AGU/SEGES) pronta para consumo
4. ~50 componentes React (Design system rico — se a OPÇÃO A for escolhida)
5. 10 templates de documentos com prompts legais rigorosos (base para Kit de Participação)
6. Workers de ingestão de normas (DOU, TCU, LexML) que o Sentinela não tem

**O que o Sentinela ganha hoje sem custo:**
- Substituir o consultor determinístico de 66 linhas por RAG real sobre a Lei 14.133 inteira
- Motor de preço com histogramas e análise IQR visual
- Feed normativo diário automático (DOU + TCU)

**O que é lixo (não trazer):**
- Toda a cadeia de geração DFD/ETP/TR/Edital (produto comprador)
- Admin do órgão, identidade visual do órgão, PCA, Mapa de Riscos do comprador

**Decisão que trava tudo:** escolher o mestre de design (OPÇÃO A ou B acima) antes de
qualquer migração de componente. Sem essa decisão, o código vai em direções opostas.

---

*Fase 1 concluída. Aguardando aprovação do Bione para Fase 2 (migração).*
*Sem código migrado. Commit: apenas este relatório.*
