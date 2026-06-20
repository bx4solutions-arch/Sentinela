# SENTINELA — COMECE AQUI
### Índice da base documental + ordem de construção. Abrir isto primeiro.

> Fim da fase de estudo. Tudo que foi pesquisado, validado e decidido está em `docs/`. Este arquivo orquestra o que construir e em que ordem.

---

## 1. A base documental (o que cada arquivo é)

**Fundação**
- `sentinela-prd-blueprint.md` — **PRD único e canônico** (fonte de verdade; §16 = duas camadas Radar/Kanban). Só leitura.
- `sentinela-motor-buildspec.md` — **o documento que vira código.** DataLake + harvester + funil + score 3D + entrega. **Começar por ele.**

**Dados / fontes**
- `sentinela-mapa-fontes-sinais.md` — sinal × fonte × viabilidade (núcleo/roadmap/corte).
- `sentinela-classificacao-modalidades.md` — o que antecede o edital, por modalidade.
- `sentinela-estudo-fontes.md` — por que o PNCP "caía" e a solução (DataLake + dados abertos).
- `worker/harvester/pncp_harvester.py` + `SKILL.md` — **o coletor pronto** (fatiar+retry+checkpoint), testado em SP (não quebrou a 50/pág).

**Validação (F0)**
- `sentinela-f0-gate-protocol.md` — protocolo de veredito.
- `sentinela-validacao-workorder.md` — V1–V5 (contrato vencendo, esteira, etc.).
- `f0-evidence/` — evidência + `f0-investigacao-falso-negativo.md` (por que o "cenário C" foi falso negativo).

**Concorrência / mercado / SEO**
- `sentinela-battlecard.md` — todos os concorrentes, links, código aberto (SmartLic, LanceBot…).
- `sentinela-smartlic-conteudo-seo.md` — raspagem do SmartLic: ferramentas grátis + estratégia de SEO a replicar.

**Produto / UI**
- `sentinela-ui-brief.md` — brief de upgrade da UI.
- `sentinela-dashboard.html` — dashboard-alvo (abrir no navegador; alvo-pixel para portar).
- `design-system.md` — tokens herdados do MeuJurídico.

---

## 2. As 3 dimensões que nos fazem superconjunto (o coração)
- **Chance** (eu ganho?) = os 4 fatores validados do SmartLic + concorrência. *(é o produto inteiro dele)*
- **Iminência** (vai sair? quando?) = estágio da esteira + contrato vencendo + recorrência. *(ninguém tem)*
- **Prontidão** (estou pronto?) = documentos exigidos × Vigia da empresa. *(ninguém tem)*

**Os 2 pilares da entrega (mesmo nível, nenhum é detalhe):**
- **Pilar A — Licitação do Dia (ao vivo):** todo edital novo do perfil, hoje, mesmo fora dos órgãos monitorados. O que prende o licitante desde o dia 1 (a maioria quer isso).
- **Pilar B — Esteira (antecipação):** o processo nascendo nos órgãos que o usuário escolheu. O diferencial estratégico.
- Frente de venda = antecipação; produto = os dois iguais. O concorrente tem só o Pilar A; nós temos A + B.

---

## 3. ORDEM DE CONSTRUÇÃO (amanhã)

**Bloco 1 — Fundação do motor (dado real no banco)**
1. Migration Supabase: schema do `motor-buildspec §3` (cell, organization, **demand** [máquina de estados], stage_event, contract_history, company, subscription). RLS nas tabelas de tenant. → **PARAR para aprovar o schema.**
2. Estender o harvester para gravar no Supabase (upsert) + os 4 endpoints PNCP + canary de schema.
3. Rodar célula São Luís/Teresina → popular `demand` real.

**Bloco 2 — Inteligência**
4. Funil de classificação (3 camadas, LLM só nos ~5%).
5. Score: começar por **Chance + Prontidão** (Iminência plena depois, com a validação de antecedência).

**Bloco 3 — Entrega (os 2 pilares)**
6. **Radar · Licitação do Dia (ao vivo)** — editais do perfil, hoje, mesmo fora dos monitorados — ligado ao dashboard. *(pilar mais barato + valor do dia 1)*
7. **Radar · Antecipação (esteira)** — processos nascendo nos órgãos monitorados — + promoção → **Kanban** + agente diário/notificação.

**Bloco 4 — SEO e cobertura (paralelo/depois)**
8. Free tools de SEO (calculadora, prontidão, glossário) + agente consultor jurídico.
9. *(Querido Diário ⏸ parado — diário é tardio; reavaliar só para decisores.)*

---

## 4. Réguas que não se quebram (lembrete)
Probabilidade nunca promessa · só dado público · **query local (DataLake)** · on-demand por célula · **para frente (PCA→…→edital)** · não operação de sessão (robô de lance = parking lot, jurídico antes) · LGPD (decisor só institucional) · não tocar sistema de concorrente · PRD é cópia única.

---

## 5. Primeiro comando de amanhã (terminal)
```
Leia docs/00-COMECE-AQUI.md e docs/sentinela-motor-buildspec.md.
Construa a fundação do motor (Bloco 1): migration Supabase com o schema
§3 (cell, organization, demand[máquina de estados], stage_event,
contract_history, company, subscription) + RLS nas tabelas de tenant.
Plan mode, mostre o plano e PARE antes de aplicar a migration —
schema de banco é decisão estrutural que eu aprovo antes.
```

Bom descanso. Amanhã a gente sai do estudo e constrói o motor.
