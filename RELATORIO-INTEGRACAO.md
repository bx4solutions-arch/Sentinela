# RELATÓRIO DE INTEGRAÇÃO BACK ↔ FRONT — 2026-06-21

## Conexões 100% (8/8) · Botões 100% (todos reais ou honestamente desabilitados)

Prova pelo RESULTADO (dado real + registro/rota certos), não pela presença. Autotestes Playwright + queries Supabase.
**Sem mock** (`grep -rl "lib/mock" app components` = VAZIO; `mock.ts` deletado, fora dos god nodes do graphify).

---

## PART 0 — Mock morto (evidência)
- Rotas órfãs `esteira/`, `dossie/[id]` deletadas · `components/sentinela.tsx` + `lib/mock.ts` removidos · shell des-mockado (sino inline, sem MockBanner).
- `grep -rl "lib/mock" app components` → **VAZIO** ✅ · `graphify update`: `mock.ts` não é mais nó (saiu dos god nodes) ✅
- tsc/lint/build verdes · console limpo.

## PART 1 — MATRIZ DE CONEXÕES (todo dado vem do Supabase real)
Contagens reais: `orgao 321 · raw_editais 53.433 · raw_pca 17.357 · cidade_coletada 3`. Conta real do Bione: `company TN SANTOS CONTROLE DE PRAGAS (SANTOS/SP, controle-de-pragas)` + `celula Santos`.

| Tela / Componente | Fonte (query/tabela Supabase) | Lê REAL? | Evidência |
|---|---|---|---|
| **Dashboard** | company · celula · cidade_coletada · raw_editais (abertos no escopo) · oportunidade · documento | ✅ | KPI "Editais abertos" = count real do escopo; Atacar-hoje = editais reais; pipeline = oportunidade |
| **Radar** | company · celula · cidade_coletada · raw_editais!inner orgao · raw_editais homologados (recorrência) · oportunidade · documento | ✅ | 60 cards reais de Santos/SP; sinal "órgão recorrente" do histórico homologado |
| **Pasta** `licitacao/[id]` | licitacao · raw_editais(payload)+orgao · documento · analise · tenant_ai_config(admin) · company | ✅ | Resumo Executivo determinístico do `payload`; integração prova `numero_controle` certo |
| **Kanban** | oportunidade + raw_editais+orgao · documento | ✅ | colunas por `stage`; mover muda o registro certo |
| **Minha Empresa** | company · documento | ✅ | TN Santos real (BrasilAPI); documento real (vazio até cadastrar — não forjado) |
| **Configurações** | tenant_ai_config (service-role, server-only) | ✅ | salvar grava provider/model certos (chave criptografada) |
| **Onboarding** | BrasilAPI (live) · IBGE (live) · company · documento · celula · cidade_coletada | ✅ | CNPJ→company; cidade→celula + enfileira coleta |
| **Consultor** | licitacao + raw_editais+orgao | ✅ | lista as análises reais do tenant |

**Cobertura: 8/8 telas = 100%.** Tabelas do tenant vazias (documento/analise/tenant_ai_config p/ o Bione) = real-mas-ainda-não-usado, não mock.

## PART 2 — MATRIZ DE BOTÕES/AÇÕES (nada no lugar errado)
Provado por `e2e/autotest-integracao.mjs` (**12/12**) + autotestes por tela. Cada ação assere o **recurso/registro CERTO**.

| Tela | Elemento | Ação esperada | Prova (resultado CERTO) | Status |
|---|---|---|---|---|
| Radar | **Adicionar à análise (X)** | abre `/licitacao/<id de X>` com dados de X | URL com id; Pasta contém `numero` de X; `licitacao.numero_controle` = X | ✅ |
| Radar | **Monitorar (X)** | X → monitorando | `oportunidade(numero=X).stage='monitorando'` | ✅ |
| Radar | **Descartar (X) + motivo** | X some + motivo salvo | `oportunidade(numero=X).stage='descartado', motivo='prazo_passou'`; X sumiu do Radar | ✅ |
| Radar | Monitorar cidade / CityPicker | cria celula + enfileira coleta | célula criada; cidade nova → `pendente` (autotest-backfill) | ✅ |
| Radar | Remover cidade | remove celula do tenant | deleta por codigo_ibge | ✅ |
| Kanban | **Avançar etapa (X)** | X → próximo stage | `oportunidade(numero=X).stage='preparacao'` | ✅ |
| Kanban | Voltar / Descartar | muda stage do card certo | upsert stage | ✅ |
| Dashboard | KPIs (links) · Atacar Monitorar/Analisar · Ver Radar | rota/ação certa | reusa ações do Radar | ✅ |
| Minha Empresa | Atualizar · Trocar empresa (modal) · Add/Remover doc · "Outro…" | grava no registro certo | autotest empresa (16/16) | ✅ |
| Pasta | Monitorar · Imprimir(window.print) · Excluir · Edital no PNCP · Add doc · Tabs | ação real | autotest-pasta (9/9) | ✅ |
| Pasta | Analisar com IA | BYOK → grava `analise` (modelo certo) | autotest-frontend (11/11) | ✅ |
| Pasta | **.docx · E-mail** | inerte, rótulo "em breve" | `isDisabled()=true` (autotest-pasta) | ✅ 🔇 |
| Configurações | Salvar | grava provider/model certos | `tenant_ai_config` = mock/mock-1 (autotest-integração) | ✅ |
| Login | Entrar / Criar conta | autentica | autotest auth | ✅ |

**Nenhum elemento clicável-e-morto · nenhuma navegação/gravação no lugar errado.**

## PART 3 — Anti-falsa-confiança (provas duras)
- **RLS:** tenant 2 (recém-criado) tem **0 oportunidades** do tenant 1 → isolamento confirmado (autotest-integração).
- **Console do navegador: zero erro.** **Network: nenhuma 4xx/5xx inesperada** nas ações (capturado no autotest).
- Screenshots em `e2e/shots/integracao/`.

## Build/qualidade
tsc + lint + build **verdes** · console limpo · network limpo. Commits locais (sem push).
