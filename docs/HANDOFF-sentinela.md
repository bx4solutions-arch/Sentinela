# HANDOFF — Projeto Sentinela (contexto para nova sessão)

> Cole este conteúdo no início de um novo chat (Sonnet) dentro do projeto Sentinela. Continue exatamente daqui; não recomece. Responda em PT-BR, direto e estratégico.

## O que é
Sentinela — plataforma de inteligência e operação para fornecedores do setor público brasileiro. Diferencial central = **Raio-X financeiro pré-edital** (qual órgão vai ter dinheiro pra comprar minha categoria, qual secretaria executa, de onde veio a emenda, quem é o padrinho — ANTES do edital existir). Modelo: entregável de consultoria (R$5–30k), não SaaS de massa. Multi-tenant, BX4 é dona.

## Stack
Next.js 16 + React 19 + TypeScript + Tailwind v4 + lucide-react + d3-geo (front). Supabase (@supabase/ssr) no back — Postgres 17, Auth, RLS multi-tenant, pgvector. Deploy: Vercel.

## Onde está
- Pasta local: `/Users/severinobione/Claude/Projects/Sentinela (by BX4 )`
- Supabase: projeto **Sentinela Ai**, ID `mzaapxkdokfeyzajawzs` (24 tabelas + RLS; migrations 01–06).
- GitHub: **não existe repo ainda**.
- Rodar: `npm install && npm run dev` → http://localhost:3000 (ou 3001). Login teste: `bx4solutions@gmail.com` / `bx4usa@gmail.com` · senha `Bione2020`.
- Validar: `npx tsc --noEmit` (sandbox bloqueia Google Fonts; build completo só na máquina/Vercel).

## Regras invioláveis
1. **Modelo antes da tela**: nunca iniciar tela nova sem o Bione enviar modelo de referência; se não houver, desenhar do zero mantendo harmonia e apresentar pra aprovar.
2. **Incremental**: uma tela/camada por vez, aprovação antes de avançar.
3. **Identidade**: violeta #5B21B6 + índigo #1E1B4B; laranja CTA oficial #FF6600; **faixa de trial e AJUDA = violeta** (invertidos); Sora + Inter. Botões primários novos = violeta.
4. **IA = copiloto**, human-in-the-loop, fonte citada; nunca dar lance/pagar sozinho.
5. Nunca commitar .env / service_role / credenciais.
6. Erro de fonte → componente `<FonteInstavel>`.
7. Ao terminar cada tela → `npx tsc --noEmit`.

## Telas prontas (mock, TS 0 erros)
Login+recuperação · Shell (sidebar ordem oficial + topbar + guard + menu perfil c/ ID SNT-XXXXXX + logout) · Página Inicial (Alvos Quentes) · Raio-X do Órgão (semáforo = menor dos 3 sub-scores + Contatos Estratégicos) · Pesquisar Licitações · Radar (+ modal Converse com Radar, 3 modos) · Minhas Licitações (Cards/Tabela/Kanban drag; modal Processo Externo manual + Análise por IA) · Minha Empresa (5 abas; Portais = filtro de origem via PNCP) · Agenda Fácil · Pesquisa de Preços (2 vertentes, filtros funcionais) · Análise de Concorrente (radar + Processos ganhos + Consultar empresa/habilitação) · PCA (status/movimentação + gráfico interativo + mapa BR por UF d3-geo) · Contratos e Atas (Vencendo + Meus contratos + Minhas atas) · Uso de IA.

## Estado pós-Fase A (02/07/2026 — ver docs/TDR-sentinela.md e docs/RELATORIO-TESTES-FASE-A.md)
- Git: repo `bx4solutions-arch/Sentinela`, branch **fase-a-cowork** (o main contém um projeto ANTIGO diferente — não mergear sem decisão).
- Migrations 17–22 aplicadas (ente canônico+índices, eventos, agent_runs+memorias, uso_ia+cota, helpers em app_privado, watchdog de runs órfãos).
- `lib/agent/` funcional: tools (contrato Zod+registry: buscar_licitacoes, raio_x_orgao) · providers multi-IA (AIProvider único; anthropic/openai/gemini; AI_PROVIDER/AI_MODEL) · runtime (loop tool-calling, cota, memórias, guardrail emendas). Rotas: `/api/agent` (JSON+SSE) e `/api/tools/[nome]`.
- Widgets extraídos em `components/widgets/` + registry (alvo, licitacao_card, tabela, metric, gauge, sub_score, eixo_real).
- Backfill canônico COMPLETO: licitacoes.codigo_ibge 189/189; orgaos.ente_id em 49 órgãos; janela do harvester restaurada pra 3.
- Testes: docs/RELATORIO-TESTES-FASE-A.md (31 PASS; suíte em scripts/teste-unitario-fase-a.mjs). E2E local: `npm run dev` + `node scripts/teste-fase-a.mjs http://localhost:3000 --agent` (pendente — rodar na máquina).
- Regra nova (TDR): **telas consomem as tools via /api/tools, nunca PostgREST direto do browser.**

## Próximo passo — Fase B (autorizada, aguardando E2E verde)
Ordem: página/painel Agente (modelos = prints CLEATUS já aprovados) → SSE visual → renderização de blocos {widget, props} via registry → estado vazio com sugestões → histórico de threads (agent_runs) → fluxo read-only com as 2 tools. Uma camada por vez, aprovação antes de avançar.

## Pesquisa estratégica (docs/)
`Sprint1-GovCon-AI-EUA.docx`, `cobertura-vs-licinexus.md`, `engenharia-reversa-cleatus.md`, `PRD-*.md`. Tese: Sentinela é **Decision Intelligence + Service-as-Software + Agentic OS**, não "mais uma plataforma de licitação".

## Backlog do "cérebro" (pós-MVP)
1. Score de adequação com Prós/Contras (CNAE×objeto×UF×porte; CONTRA = certidão vencida/penalidade). 2. Auto-import de perfil via CNPJ (SICAF/Transparência/TCU). 3. Banco de pregoeiros/agentes com contato+histórico. 4. Agente conversacional sobre o PNCP (MCP + API = AI-native). 5. Pré-previsão de recompra 12–18 meses. Adaptar: Proposal Writer → gerador de peças/planilha de preços; matriz L/M → checklist de habilitação.

## Decisões-chave
Portais = leitura por canal único (PNCP); operar no portal (login/robô) = Fase 2 via browser-use + human-in-the-loop (fora do MVP, gate jurídico). Pesquisa de Preços = 2 vertentes. Custo de IA = 3 modos (Rápido/Detalhado/Profundo) + pré-extração no harvest.
