# PROMPT — UI: PORTAR OS MOCKUPS (parar de inventar tela plana)

## REGRA (contrato de design — não negociável)
Os mockups em **`docs/*.html`** são o **CONTRATO de design**. Cada tela deve **bater o mockup 1:1**. Proibido reconstruir uma versão "limpa/simples" do zero quando existe alvo-pixel. O dado é real; o visual é o do mockup.

> O dado já está certo (editais reais de controle-de-pragas em SP). O problema é SÓ o visual ter regredido pra uma versão plana. Não mexer no dado — **aplicar o visual do mockup por cima do dado real.**

---

## 1. DASHBOARD — bater `docs/sentinela-dashboard.html` + referência `Dashboardmodelo .pdf`
Reconstruir o Dashboard (mantendo o dado real já ligado) com TODOS estes elementos do mockup:
- **KPIs com delta** (seta + "vs mês anterior"), não só o número seco.
- **Atacar Hoje:** cada card com **ANEL DE SCORE** (SVG) + **chips de porquê** ("contrato vence em 74d", "PCA publicado", "recorrência anual") + valor + estágio + janela + ações (Ver dossiê / Criar tarefa).
- **Linha do Tempo de Sinais Oficiais** (PCA, contrato vencendo, ETP, IRP, edital, fracassada, sanção…) com horário/data.
- **Pipeline por estágio** (barras/colunas com valor e %).
- **Donut por segmento** + tendência (Chart.js).
- **Densidade command-center** (navy assinatura #0B2D89, grade densa) — não shadcn cru espaçado.

## 2. DOSSIÊ — bater `docs/sentinela-dossie.html`
Hero com anel de Chance + Iminência + Prontidão, esteira stepper, histórico, preço, concorrência, órgão, decisores, plano de ação, fontes. (Abas data-gated seguem "em breve".)

## 3. Telas SEM mockup (Radar, Kanban, Pasta, Onboarding, Configurações)
Seguir o **MESMO design system** do dashboard: navy, densidade, anéis de score, chips de motivo, semáforos, KPIs com delta. **Pixel-targets dedicados dessas telas virão** (o Bione/copiloto vai gerar) — quando chegarem, bater 1:1.

---

## DoD VISUAL (obrigatório)
- Screenshot da tela real **lado a lado** com o mockup correspondente — tem que **bater** (mesma estrutura, mesmos componentes ricos).
- Dado real preservado (não voltar a mock).
- Build/lint/typecheck verdes, console limpo.

## Não fazer
- Não simplificar "pra ficar limpo". O alvo é denso e rico.
- Não inventar layout quando existe mockup. Não quebrar o dado real já ligado.
