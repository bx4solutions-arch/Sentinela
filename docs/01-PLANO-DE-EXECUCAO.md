# SENTINELA — PLANO DE EXECUÇÃO
### Roadmap operacional. O que construir, em que ordem, e o que esperar de cada fase. Alinhado ao PRD (§16 — 2 pilares) e ao motor-buildspec.

---

## O que esperar deste projeto (expectativa honesta)
- **Greenfield, incremental.** Constrói em fases curtas; cada fase entrega algo navegável.
- **Dado real desde a Fase 0.** Não é mock — o banco enche com editais/contratos reais do PNCP. (O mock atual era só vitrine; sai de cena.)
- **A UI bonita vem na Fase 1**, sobre dado real. A **prova da tese** (antecedência medida) vem na Fase 2.
- **Gates de aprovação:** o terminal **para** nos pontos estruturais (schema, score, UI) para você aprovar. Nada irreversível sem seu OK.
- **Custo controlado:** ingestão on-demand por célula; storage barato; IA só nos ~5% ambíguos.

## Os 2 pilares que guiam tudo (recap)
- **Pilar A — Licitação do Dia (ao vivo):** todo edital do perfil, hoje, mesmo fora dos órgãos monitorados. Prende o licitante no dia 1. *(table stakes — o que os outros têm)*
- **Pilar B — Esteira (antecipação):** o processo nascendo (PCA→…→edital) nos órgãos que o usuário escolheu. *(o diferencial — o que ninguém tem)*

---

## FASE 0 — Fundação: banco + ingestão  ·  *em execução*
**Objetivo:** ter dado público real, estruturado, no nosso DataLake.
**Entregas:**
- Migration Supabase: `cell, organization, demand` (máquina de estados PCA→…→edital), `stage_event, contract_history, company, subscription` + **RLS** nas tabelas de tenant.
- Harvester gravando no Supabase (4 endpoints PNCP: contratações, pca, atas, contratos) + retry/checkpoint/canary.
- Popular células reais (São Luís + Teresina).
**O que você vê:** dado real no Supabase Studio (editais, contratos, pca). **Ainda não tem tela** — é a fundação.
**🚦 Gate:** aprovar o **schema** antes do `db push`.

## FASE 1 — Os 2 pilares no ar: o MVP que vende
**Objetivo:** produto navegável, com dado real, entregando os dois pilares.
**Entregas:**
- **Pilar A:** Radar · Licitação do Dia (editais do perfil, ordenados por Chance + Prontidão).
- **Pilar B:** Radar · Antecipação (demand por estágio nos órgãos monitorados).
- Funil de classificação (3 camadas) + **Score: Chance** (4 fatores do SmartLic + concorrência) **+ Prontidão** (cruza Vigia × oportunidade).
- Promoção Radar → **Kanban** + Dossiê básico (resumo, linha do tempo, contrato anterior, preço, concorrência, fontes).
- **Vigia de Documentos** (semáforo de certidões).
**O que você vê:** você **entra e usa** — licitações reais do seu perfil hoje (Pilar A) + processos nascendo nos órgãos monitorados (Pilar B), com score e prontidão. É o produto de verdade.
**🚦 Gate:** revisar UI + fórmula de score antes de abrir para teste.

## FASE 2 — Antecipação plena + inteligência viva
**Objetivo:** provar a tese e tornar o sistema "vivo".
**Entregas:**
- **Iminência plena:** medir antecedência por modalidade (a validação) → o card anda sozinho quando o estágio avança.
- **Agente diário + notificações** (push/PWA, WhatsApp): "Órgão X publicou DFD — quer acessar?".
- **Dinheiro novo** (Transparência: emendas/transferências).
- **Agente consultor jurídico** (lei 14.133 + edital + certidões da empresa).
**O que você vê:** o sistema te chamando (não você operando), a antecedência em dias na tela, e o consultor jurídico no dossiê. É o "golpe de mestre" da demo.

## FASE 3 — Aquisição, planos e escala
**Objetivo:** produto vendável, com motor de aquisição.
**Entregas:**
- **Onboarding por CNPJ** (CNAE → órgãos sugeridos → alvo).
- **Free tools de SEO** (calculadora de oportunidades, calculadora de prontidão, glossário) + embed (backlinks).
- **Multitenant + planos** (Radar R$297 / Inteligência R$697 / Sala de Guerra R$1.800) + billing.
- Escala por célula (backfill on-demand quando há cliente pagando).
**O que você vê:** o produto pronto para vender, com tráfego orgânico e cobrança.

---

## Parking lot (decisão consciente, fase tardia)
- **Robô de lance** — parecer jurídico ANTES; produto/marca separada (régua #3).
- **Querido Diário** — só para decisores (diário é tardio).
- **Multi-fonte** (ComprasGov/PCP), simulador, grafo de decisores.

## Riscos conhecidos e tratamento
| Risco | Tratamento |
|---|---|
| PNCP instável / página 50 | Harvester: fatiar + retry/backoff + checkpoint + canary |
| Esteira municipal magra (PCA tardio) | Pilar A (ao vivo) + recompra/recorrência carregam o município |
| Custo de IA | Funil 3 camadas (LLM só ~5%) |
| Conflito com MeuJurídico | Projeto Supabase isolado + RLS (muralha §13) |

## Gates de aprovação (onde o terminal PARA)
1. Schema do banco (Fase 0). 2. Score + UI (Fase 1). 3. Antes de qualquer cobrança/billing (Fase 3). 4. Robô de lance (parecer jurídico).

## Métricas de sucesso (PRD §12)
Ativação: backfill por célula < 10 min · cobertura do dossiê > 80%. Preditiva: matching > 80% · antecedência média crescente. Negócio: custo de backfill ÷ assinantes da célula · conversão trial→pago · retenção.

---

## Próximo passo imediato
**Fase 0, Bloco 1:** terminal conecta ao Supabase (`.env.local`) → cria a migration do schema → **PARA para você aprovar** → `db push` → harvester popula São Luís/Teresina. Quando a migration vier, revisar a `demand` (máquina de estados) e o RLS antes de aplicar.
