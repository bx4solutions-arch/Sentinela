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

---

## SUÍTE INTEIRA VERDE — atualização 2026-06-22 (FIX 6)

O **teste principal (integração) sempre passou**. O que estava vermelho eram **testes velhos virando falso-negativo** (clicavam no botão errado / esperavam UI antiga) + **2 bugs reais** (Recharts, dedupe de cidade). Tudo corrigido; a **suíte INTEIRA** agora roda verde por um runner agregador.

**Como rodar (cole a saída):** `node e2e/run-all.mjs` (dev server em `:3001`). Resultado atual: **10/10 verdes · ~195s** — `autotest` (empresa/onboarding), `radar`, `kanban`, `dashboard`, `frontend`, `licitacao`, `backfill`, `pasta`, `sinais`, `integracao`. Console limpo **incluindo ZERO warning Recharts (-1)** (assertado em `autotest-dashboard.mjs`).

### Qual teste estava velho × o que foi corrigido
| Teste | Estava velho/bug | Correção | Prova |
|---|---|---|---|
| `autotest-radar / kanban / dashboard / frontend` | `button:has-text('Monitorar').first()` pegava o botão **"Monitorar cidade"** (antes dos cards) → "Monitorando" nunca aparecia (FIX 1) | seletor escopado ao card: `[data-testid=card-monitorar]` | 4 testes verdes; clica no card certo |
| `autotest-licitacao` | esperava aba "Concorrentes" + `'Analisar com IA'.isDisabled()` (UI antiga) (FIX 2) | abas reais (Resumo/Empresa×Edital/Veredito/Documentos) + 2 estados de IA: **sem BYOK → "Ligar IA"** inerte · **com BYOK → "Analisar com IA"** habilitado | verde nos dois caminhos |
| `autotest-backfill` | esperava "estado SP fallback (sem cidade)"; onboarding já monitora a cidade da empresa (FIX 3) | espera cidade da empresa já monitorada (São Paulo pronta) + cidade nova → "Carregando" | verde |
| `components/charts.tsx` (`dashboard`) | `ResponsiveContainer height="100%"` media **-1** no 1º paint → warning Recharts no console (FIX 4 — **bug real**) | `useChartWidth` (ResizeObserver) + dimensões **numéricas** no ResponsiveContainer; só renderiza com `width>0` | `autotest-dashboard`: "console: ZERO warning Recharts (-1)" ✅ |
| `celula` / `monitorarCidade` | `upsert(onConflict:"tenant_id,codigo_ibge")` sem a UNIQUE → dedupe podia falhar/duplicar; município não normalizado (FIX 5 — **bug real**) | `UNIQUE (tenant_id, codigo_ibge)` (migration 0010) + `tituloCidade`/`resolveMunicipio` (trim+Title Case, acento-insensível); CityPicker não duplica | `autotest-backfill` + `autotest-radar` verdes |

### O que "100%" significa (honestidade)
**"100%" = 100% das CONEXÕES EXISTENTES** (toda tela/botão ligado lê/grava o registro/rota certo, dado real, zero mock) — **não** "produto completo". As fontes de dado abaixo ainda estão **em ingestão / na fila** (a feature liga quando o dado entra; nunca forja antes):
- **Contratos** (`/contratos` PNCP — destrava "contrato vencendo") · **Atas de registro de preço** (`/atas` — preço/carona) · **Resultado/participação** (quem ganhou, nº de participantes, lances — "vida do concorrente") · **Sanções CEIS/CNEP** · **Decisores**.
- **Descoberta nacional (Camada 1):** harvester diário nacional em construção (Etapa 1) — hoje a coleta é por-cidade; ao ligar, destrava buscar qualquer cidade/nicho + o teste de aceitação nº1 ("vetor/dengue no PI").
