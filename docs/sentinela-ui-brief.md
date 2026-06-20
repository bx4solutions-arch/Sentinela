# SENTINELA — BRIEF DE UPGRADE DE UI
### Alvo: o Dashboard de referência (command center). Elevar de "shadcn cru" para produto. Mock, em paralelo ao V1.

## Diagnóstico (por que a v1 da casca decepcionou)
O terminal herdou os **tokens** do MeuJurídico (navy, Inter, radius) mas montou as telas em **shadcn default** — card branco, espaço vazio, baixa densidade, zero data-viz. Mesma cor ≠ mesmo produto. Falta a **sofisticação de componentes** e a **densidade** que fazem o MeuJurídico (e o dashboard de referência) parecerem inteligentes.

## Regra-mestre
**Reusar os COMPONENTES do MeuJurídico, não só a paleta.** O terminal tem o repo `Meu-Juridico.Ai` — estudar os componentes reais (cards, KPIs, charts, layout de dashboard, densidade) e portar o padrão para o Sentinela. Tokens já estão; falta a inteligência visual.

## A referência (o Dashboard a construir como HOME)
Layout em 3 zonas: **sidebar navy** (esq) + **topbar** + **grid de conteúdo**.

1. **Sidebar navy escura** — logo Sentinela, nav, card de plano (uso %, "Ver planos"), perfil do usuário no rodapé.
2. **Topbar** — título + subtítulo, **busca global** (órgão/objeto/cidade), sino de notificações (badge), avatar, filtro de data + Filtros.
3. **Linha de 5 KPI cards** — cada um: ícone, **número grande**, **delta vs período anterior** (seta verde/laranja + %). Pipeline Monitorado (R$), Oportunidades Quentes, Editais Prováveis 90d, Contratos Vencendo, Ações Urgentes.
4. **"Atacar Hoje"** (foco, ~2/3) — 3 cards de oportunidade com: órgão + cidade, objeto, **score em ANEL** (89/100, cor por faixa), valor, estágio, janela, ação recomendada, botões *Ver dossiê* / *Criar tarefa*.
5. **"Plano de Ação da Semana"** (~1/3) — lista de tarefas com **badge de prioridade** (Alta/Média/Baixa) + prazo.
6. **"Pipeline por Estágio"** — 6 colunas (Novas → Participando) com contagem + valor + % do total, **header colorido por estágio**.
7. **"Linha do Tempo de Sinais Oficiais"** — timeline com **dots coloridos** + evento + timestamp (PCA publicado, contrato vence em Xd, ETP detectado, IRP aberta, fracassada, concorrente sancionado).
8. **"Pipeline por Segmento"** — **donut** com total central + legenda %.
9. **"Tendência de Oportunidades"** — **line chart** (oportunidades identificadas vs editais publicados, 6 meses).

## Componentes a construir (data-viz = recharts)
`KpiCard` (número + delta), `ScoreRing` (anel SVG/recharts), `DonutSegmento`, `LineTendencia`, `PipelineEstagio` (colunas), `SinaisTimeline` (dots + linha), `AtacarHojeCard`, `PlanoAcaoList`, `SidebarNav` (navy), `Topbar` (busca + sino + avatar). Usar **recharts** para anel/donut/linha.

## Regras de design (o que faltou)
- **Densidade:** muito mais informação útil por viewport; cortar espaço morto.
- **Hierarquia:** seções com header claro; "Atacar Hoje" é o foco; KPIs no topo.
- **Cor = sinal:** verde/laranja/vermelho para delta e urgência; estágios e dots da timeline color-coded.
- **Data-viz de verdade:** anel para score, donut para segmento, linha para tendência, barras para pipeline — não só texto.
- **Sidebar navy** dá o frame de "sala de comando".

## Correções a embutir (decisões já tomadas)
- **"Radar PCA" → "Radar de Sinais".** Não super-indexar no PCA (que falhou no F0); o radar é multi-sinal.
- **Score = prioridade + porquê**, não promessa. "Prioridade 89 — porque: contrato vencendo + recorrência" ✅; "89% de chance" ❌ (espera backtest).
- **"Segunda Chance"** fica no menu como **roadmap** (não operação de sessão — régua #3).
- **Banner "DADOS ILUSTRATIVOS (mock)"** mantido em todas as telas.
- **Seed coerente** ente × objeto (Prefeitura de São Luís × dedetização) — sem o bug do IBGE.

## Régua
Mock only, zero rede real. Contra o PRD canônico (`docs/sentinela-prd-blueprint.md`, read-only). Commits isolados. **Roda em paralelo ao V1 (contrato vencendo)** — UI é tela, V1 é I/O; não competem.

## Nota de escopo (enxuto)
A nav cheia (Oportunidades, Kanban, Radar, Contratos, Segunda Chance, Concorrentes, Documentos, Relatórios) é a **visão Sala de Guerra**. Para o MVP, a maioria são **lentes leves** sobre a mesma base — não 11 produtos. O Dashboard + as 5 telas do PRD são o núcleo; o resto são views que reusam os componentes acima.
