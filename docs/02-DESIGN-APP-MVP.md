# SENTINELA — DESIGN DO APP (MVP): telas, fluxos, navegação
### O plano de UX do MVP. Telas, o que cada uma contém, e como o usuário caminha. Mockups HTML separados (alvo-pixel).

---

## Princípios de design (não negociáveis)
- **Os 2 pilares são o coração da home** — Licitação do Dia (ao vivo) + Antecipação (esteira).
- **Denso, command-center** — não shadcn cru. Grade, hierarquia, data-viz (anel de score, stepper, KPIs com delta).
- **Design System:** herdado do MeuJurídico (Inter, radius 0.5rem, neutros slate, semânticos) + **navy como cor-assinatura** (`224 85% 29%` / #0B2D89).
- **Enxuto:** 5 telas-núcleo (PRD §2). O Dossiê e o Pipeline são detalhe, não inflam a navegação.

---

## Inventário de telas — MVP (5 núcleo + shell)

| # | Tela | Tipo | Acesso | Função |
|---|---|---|---|---|
| 0 | **Shell** (sidebar navy + topbar) | layout | sempre | Navegação + busca global + sino |
| 1 | **Onboarding** | fluxo (4 passos) | 1ª vez | CNPJ → objeto → órgãos a monitorar → certidões |
| 2 | **Dashboard (Home)** | comando | nav | KPIs + Atacar Hoje + **os 2 pilares** + linha do tempo de sinais |
| 3 | **Dossiê da Oportunidade** | detalhe | clique no card | A tela-rainha: tudo da oportunidade |
| 4 | **Pipeline (Kanban)** | board + detalhe | nav | Oportunidades que o usuário **escolheu acompanhar**, por estágio |
| 5 | **Minha Empresa** | perfil | nav | Recorte + **Vigia de Documentos** (prontidão) + órgãos monitorados |

**Navegação (sidebar):** Dashboard · Pipeline · Minha Empresa · Configurações. *(O Dossiê abre de um card; o Radar/feed vive dentro do Dashboard.)*

---

## Fluxo principal (o caminho do usuário)
```
CNPJ no Onboarding
  → escolhe os órgãos que quer monitorar (define o alvo)
  → cai no DASHBOARD:
       · Pilar A "Licitação do Dia" — editais do perfil, hoje (mesmo fora dos monitorados)
       · Pilar B "Antecipação" — processos nascendo nos órgãos monitorados
  → clica numa oportunidade → DOSSIÊ (decide: vale?)
  → botão "Acompanhar" → vira card no PIPELINE (kanban por estágio)
  → o sistema avança o card sozinho quando o estágio muda + avisa
  → MINHA EMPRESA: a Vigia avisa "CND vence em 11 dias" antes de desclassificar
```

---

## O que cada tela contém

### 1. Onboarding (fluxo, 4 passos)
`1 Empresa` (CNPJ → puxa razão social + CNAE) · `2 Objeto` (confirma o que vende — passo anti-mis-escopo) · `3 Órgãos` (sugeridos por cidade/esfera + busca; **o usuário marca quais monitorar**) · `4 Certidões` (cadastra/puxa → alimenta a Prontidão). Loading: "Carregando o histórico de [setor] em [região]…".

### 2. Dashboard (Home) — *mockup pronto: `sentinela-dashboard.html`*
Faixa-tese no topo (a esteira PCA→…→edital, "Sentinela detecta aqui") · **6 KPIs** (Pipeline, Quentes, **Antecedência média**, Editais 90d, Contratos vencendo, Ações urgentes) · **Atacar Hoje** (3 cards com anel de score) · **os 2 pilares** (Licitação do Dia + Antecipação) · Linha do Tempo de Sinais Oficiais · Pipeline por estágio · donut por segmento.

### 3. Dossiê da Oportunidade — *mockup nesta entrega*
Faixa-herói (título + órgão + **anel de Chance** + Iminência + valor + janela + **antecedência**) · grade 2 colunas: [Esteira stepper · Incumbente & histórico · Preço] | [**Prontidão %** · Concorrência · Órgão · Decisores institucionais] · Plano de ação (largura cheia) · Fontes oficiais. **+ Agente consultor jurídico** (chat no canto).

### 4. Pipeline (Kanban)
Colunas = estágios (Nova · Monitorando · Preparação · Pré-edital quente · Edital · Participando · Resultado · Recompra). Cards = processos acompanhados (órgão, objeto, valor, score, próxima ação, prazo). Clique no card → stepper horizontal do processo + docs por estágio. *(Régua #3: rastreia status, não opera lance.)*

### 5. Minha Empresa
Recorte (setor/região, CNAE) · **órgãos monitorados** (lista + adicionar/remover) · **Vigia de Documentos** (certidões com semáforo ATIVO/A_RENOVAR/VENCIDO + emissão automática onde há API + upload manual) · **Prontidão geral** (% apto).

---

## Design system (resumo para os mockups)
- Sidebar navy escura (#0F1729) · primário #0B2D89 · acento #3C83F6.
- Cards brancos, borda 0.5px, radius-lg, **densos**. Inter. Semânticos: success #157F3C, warning #F59F0A, danger #DC2626.
- **Anel de score** (SVG), **delta** nos KPIs, **stepper** na esteira, donut/linha (recharts). Cor = sinal.

---

## Entrega dos mockups (alvo-pixel)
- ✅ `sentinela-dashboard.html` (Home) — pronto.
- ✅ `sentinela-dossie.html` (Dossiê) — **nesta entrega**.
- ⏭️ `sentinela-onboarding.html`, `sentinela-pipeline.html`, `sentinela-empresa.html` — próximas rodadas.

O terminal porta cada mockup 1:1 para os componentes React. Acaba o "adivinha".
