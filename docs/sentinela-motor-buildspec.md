# SENTINELA — BUILD SPEC DO MOTOR
### Documento de fundação: o que vira código. Consolida DataLake + harvester + funil + score + entrega.

> Integra: `pncp_harvester.py` (worker/harvester), `sentinela-mapa-fontes-sinais.md`, `sentinela-classificacao-modalidades.md`, `sentinela-estudo-fontes.md`, o blueprint do SmartLic e o PRD (§4, §5, §7, §16). Régua-mãe: **probabilidade nunca promessa · só dado público · query local · on-demand por célula · para frente (PCA→…→edital) · não operação de sessão.**

---

## 1. Princípio do motor
Transformar dado público em **oportunidade antecipada**. Três decisões inegociáveis:
1. **DataLake (query local):** ingere para o nosso Supabase; o app consulta o NOSSO banco, nunca o gov ao vivo.
2. **Para frente, por célula:** captura processos **nascendo** (PCA/IRP/contrato vencendo → … → edital), só nas células com cliente pagando. Não acumula histórico — só o suficiente para a Chance.
3. **Superconjunto do concorrente:** Chance (o que o SmartLic faz) **+ Iminência + Prontidão** (o que ninguém faz).

**DOIS PILARES CO-IGUAIS na entrega (decisão do fundador — mesmo nível, nenhum é coadjuvante):**
- **(A) Licitação do Dia (ao vivo):** todo edital novo do perfil do usuário (setor × região), **inclusive fora dos órgãos que ele monitora**. É o que mantém o licitante ocupado e com **oportunidade na mão desde o dia 1**. A maioria quer isso — é obrigação, como os concorrentes fazem.
- **(B) Esteira (antecipação):** o processo nascendo (PCA→…→edital) nos órgãos que ele **escolheu** monitorar. É o diferencial estratégico, para o licitante paciente.
> O usuário define os órgãos monitorados (foco da esteira); nós mostramos o resto como feed ao vivo (cobertura). Os dois são primeira classe.

## 2. Arquitetura (5 camadas)
```
Fontes oficiais → Harvester (ingestão) → DataLake (Supabase) → Motor (classificação + score) → API → Entrega (Radar → Kanban)
```

## 3. Modelo de dados (Supabase / Postgres + pgvector + RLS)
```
cell            — objeto × ente (cache compartilhado; status, last_backfill)
organization    — órgão (cnpj, esfera, município, capacidade_pagamento[Siconfi])
demand          — UM processo em formação (máquina de estados)  ← entidade central
  estagio_atual ENUM(pca,dfd,etp,pesquisa,tr,irp,edital,contrato,vigencia)
  objeto, valor_estimado, modalidade, orgao_id, unidade, janela_provavel
  iminencia, chance, antecedencia_dias, fonte_sinal, embedding(pgvector)
stage_event[]   — cada avanço (estagio, data, fonte, link, doc_ref)  [event-sourced]
contract_history— N últimas contratações do objeto×órgão (incumbente, valor, vigência_fim)
price_intel     — preço médio/mínimo/faixa, cotação ETP
competitor      — fornecedor (cnpj, vitórias, órgãos, preço, sanção CEIS/CNEP)
company         — cliente (cnae, certidões, atestados, região)
subscription    — company × alvo(ente/unidade) × objeto  [RLS por tenant]
document         — arquivo público (url_pncp, tipo, hash, cache_status)  [lazy]
notification     — company × evento  [RLS]
```
`demand`, `cell`, `contract_history`, `competitor` = compartilhados (dado público). `company`, `subscription`, `notification` = por tenant (RLS). Matching de objeto via **embedding (pgvector) + CATSER**.

## 4. Ingestão (harvester) — estender o que já existe
Base: `worker/harvester/pncp_harvester.py` (fatiar × modalidade × data, paginar, retry/backoff, checkpoint). Adicionar:
- **4 endpoints PNCP:** `contratacoes/publicacao`, `/pca`, `/atas`, `/contratos` (PCA = sinal de formação; contrato = recompra/vigência_fim).
- **Camada municipal — Querido Diário (MIT, OKBR) — ⏸ PARADO por ora** (diário oficial é tardio; não serve a antecipação cedo — decisão do fundador). Reavaliar no futuro **só para decisores** (fiscal/comissão/agente), que não são time-sensitive.
  - **Acesso (2 caminhos):** (a) **API pública ao vivo** — `queridodiario.ok.org.br/api` (docs em `/api/docs`), consulta por **código IBGE** + full-text; usar para testar/MVP, com uso leve e respeitoso. (b) **Self-host** (MIT, FastAPI + Elasticsearch, docker) → `localhost:8080/gazettes/<IBGE>` para escala, sem rate-limit.
  - **Checar `themed_excerpts`** na `/api/docs`: o QD já extrai trechos por tema — se houver tema de licitação/compras, usar o trecho pronto (poupa nossa NLP). Cachear no DataLake; contribuir spiders de volta.
- **Forward-tracking:** ao ver um item-PCA novo, um IRP aberto, ou um contrato com `vigência_fim` próximo → **criar/atualizar uma `demand`** e vigiar avanço (não só listar editais).
- **Confiabilidade (do SmartLic):** **canary** (sonda a API a cada 10 min — detecta quando o PNCP muda `tamanhoPagina`/schema sem avisar; hoje teto = **50**), **circuit breaker** (N falhas → cooldown), dedupe por `numeroControlePNCP` + hash.
- **On-demand:** só roda as células ativas (com assinante). Incremental via **cron no VPS** (janelas novas + re-tenta `_failures`).
- **Saída:** grava no Supabase (upsert), não em JSONL (JSONL foi o protótipo).

## 5. Classificação (funil de 3 camadas — barato, do SmartLic)
1. **Tier 1 — determinístico** (UF, valor, data, célula): corta ~80%. Zero IA.
2. **Tier 2 — densidade de keyword + CATSER**: resolve ~15%. Score de aderência por segmento.
3. **Tier 3 — LLM árbitro** (só ~5% ambíguos): GPT/Claude, **temperatura 0, saída estruturada, evidência obrigatória**, nunca gera — só decide. Custo-alvo ~US$ 10–15/mês.

## 6. SCORE DE 3 DIMENSÕES (o coração)
> Chance = o produto inteiro do SmartLic (validado). Iminência + Prontidão = a nossa diferença.

**A. Chance (eu ganho? 0–100)** — adota os 4 fatores ponderados do SmartLic + concorrência:
| Fator | Peso |
|---|---|
| Modalidade (competição) | 25% |
| Prazo de preparação | 20% |
| Faixa de valor (50–300% do contrato médio) | 20% |
| Geografia (logística <15% margem) | 15% |
| **Concorrência/incumbente** (nº participantes, gap 1º–2º, força do incumbente) | 20% |

**B. Iminência (vai sair? quando?)** — função do estágio + recompra:
`PCA frio · DFD morno · ETP quente · IRP muito quente · TR iminente` + contrato vencendo + recorrência → **antecedência estimada em dias**.

**C. Prontidão (estou pronto? 0–100%)** — cruza os documentos exigidos × a Vigia da empresa: "82% pronto · falta atestado ≥R$300k + CND estadual".

**Veredito → ação** (alimenta a entrega): `Participar` (Chance alta + Prontidão alta) · `Monitorar` (uma alta, outra média) · `Descartar` (baixa). Iminência define a urgência.

## 7. Entrega — os 2 pilares no Radar (+ Kanban)
- **Radar · Licitação do Dia (ao vivo):** todo edital novo do perfil (setor × região), inclusive **fora** dos órgãos monitorados. Feed diário, ordenado por Chance + Prontidão. É a oportunidade na mão, hoje.
- **Radar · Antecipação (esteira):** processos nascendo nos órgãos **monitorados**, com estágio + Iminência. Curado.
- **Promoção → Kanban (intencional):** de qualquer um dos dois, `[Descartar][Monitorar][Adicionar][Ver dossiê]`.
- **Agente diário + notificações:** "Órgão X publicou DFD — quer acessar?" (push/PWA).
- **Dossiê** com as abas (resumo, linha do tempo, órgão, contrato anterior, concorrentes, **prontidão**, plano de ação, fontes) + **agente consultor jurídico** (cruza lei 14.133 + edital + certidões).

## 8. Fases de build
- **F1 (sobre dado provado — editais + contratos PNCP):** DataLake + harvester + funil + **Pilar A (Licitação do Dia ao vivo)** — é o mais barato e o valor do dia 1 (expor os editais do perfil) — + Chance + Prontidão + Radar→Kanban + dossiê básico. Os 23 editais de São Luís / 141 de Teresina já provam que o dado existe.
- **F2 (gated em validação):** **Pilar B pleno (Esteira/Iminência)** — medir antecedência por modalidade — + dinheiro novo (Transparência), agente jurídico. (Querido Diário **parado**: diário é tardio; reavaliar só para decisores.)
- **Corte:** operação de sessão (robô de lance) — parking lot, fase tardia, parecer jurídico antes.

## 9. Réguas de código
RLS em todas as tabelas de tenant · só leitura de API pública (sem token salvo Transparência em env) · backoff educado · LGPD (decisor só institucional) · **não chamar/usar sistema de concorrente** · matching CATSER+pgvector medido (>80%).

---

## 10. Próximo passo de execução (terminal)
1. Migration Supabase com o schema §3 (começar por `cell`, `organization`, `demand`, `stage_event`, `contract_history`, `company`, `subscription`).
2. Estender o harvester para gravar no Supabase + os 4 endpoints + canary.
3. Rodar a célula São Luís/Teresina → popular `demand` real.
4. Implementar o funil §5 + o score §6 (começar por Chance + Prontidão).
5. Ligar o Radar (lista das `demand` scoradas) → o dashboard já existente.

Isto é o motor. Tudo o que veio antes (estudo de fontes, classificação, harvester, score do concorrente) converge aqui.
