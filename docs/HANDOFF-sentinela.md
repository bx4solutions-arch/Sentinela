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

## Próxima tela
Item 12 — **Organização** (Geral / CNPJs / Membros RBAC / Assinatura). Última do MVP visual. Pedir modelo antes.

## Depois das telas
Refinar + **conectar o Supabase ao front** (extrair `<LicitacaoCard>` compartilhado; harvester PNCP; extração de contatos do edital).

## Pesquisa estratégica (docs/)
`Sprint1-GovCon-AI-EUA.docx`, `cobertura-vs-licinexus.md`, `engenharia-reversa-cleatus.md`, `PRD-*.md`. Tese: Sentinela é **Decision Intelligence + Service-as-Software + Agentic OS**, não "mais uma plataforma de licitação".

## Backlog do "cérebro" (pós-MVP)
1. Score de adequação com Prós/Contras (CNAE×objeto×UF×porte; CONTRA = certidão vencida/penalidade). 2. Auto-import de perfil via CNPJ (SICAF/Transparência/TCU). 3. Banco de pregoeiros/agentes com contato+histórico. 4. Agente conversacional sobre o PNCP (MCP + API = AI-native). 5. Pré-previsão de recompra 12–18 meses. Adaptar: Proposal Writer → gerador de peças/planilha de preços; matriz L/M → checklist de habilitação.

## Decisões-chave
Portais = leitura por canal único (PNCP); operar no portal (login/robô) = Fase 2 via browser-use + human-in-the-loop (fora do MVP, gate jurídico). Pesquisa de Preços = 2 vertentes. Custo de IA = 3 modos (Rápido/Detalhado/Profundo) + pré-extração no harvest.
