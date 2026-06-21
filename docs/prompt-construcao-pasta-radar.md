# PROMPT DE CONSTRUÇÃO — Pasta = tela-rainha + sinais reais + zero botão fake
### Não é mais análise. É construir. Régua: docs/REGUA-DE-EXECUCAO-E-AUTOTESTE.md — autoteste prova o RESULTADO (mudou estado? salvou? navegou?), não a presença. Aditivo, sem push, sem segredo, IA paga só via BYOK.

## USE O GRAPHIFY (economia de tokens — obrigatório)
Antes de grep ou ler arquivo inteiro, **navegue o código pelo graphify** (já existe `graphify-out/graph.json`):
- `graphify query "<pergunta>"` (contexto amplo) · `graphify path "<A>" "<B>"` (relação entre dois nós) · `graphify explain "<conceito>"` (foco).
- Retorna subgrafo pequeno em vez de despejar arquivos — **muito mais barato em tokens**.
- O graphify é uma **skill + CLI**, não MCP (`.claude/skills/graphify/SKILL.md` · invoque por `/graphify`). Por isso não aparece na busca de ferramentas — não o procure como MCP.
- **Depois de alterar código, rode `graphify update .`** (AST-only, sem custo de API) para manter o grafo atual.

## Contexto (por que isto agora)
- graphify: **`mock.ts` é god node** → Dossiê/Pasta/Esteira/Kanban ainda usam mock de São Luís (getDemand, DEMANDS, PREF_SL, decisoresSEMED). É isso que faz "metade do app parecer fake".
- Auditoria de ontem: **PCA 17k, homologados 43k, payload do edital (jsonb), prazos 34k (data_abertura/encerramento), situacao** JÁ estão no banco (raw_editais/raw_pca/orgao) — o front ignora.
- Objetivo: **substância (matar mock + ligar dado real) → sinais → forma.**

---

## TAREFA 1 — Pasta Inteligente da Licitação = tela-rainha, dado REAL (MATA O MOCK)
Arquivo: `app/(shell)/licitacao/[id]/page.tsx` (+ o que importar de mock.ts).
- **Remover dependência de `mock.ts`** nesta tela e no Dossiê/Esteira/Kanban. Carregar a licitação REAL do banco por id (`raw_editais` + `orgao`).
- **Resumo Executivo (16 seções) renderizado DETERMINISTICAMENTE do `payload` jsonb** — sem IA: identificação (objeto, nº, UASG, portal, contratação), órgão + **CAPAG**, datas/prazos (abertura/encerramento), modalidade, modo de disputa, situação, valor, amparo legal, fontes orçamentárias, unidade compradora. Spec: `docs/04-PASTA-INTELIGENTE-LICITACAO.md` + exemplo-ouro `docs/concorrentes/conlicitacao/findings/exemplo-resumo-edital-19050554.md`.
- **Pré-computar e cachear** em `licitacao.resumo_json` (gera 1x, serve instantâneo — arquitetura já registrada). IA só na camada interpretativa, e só com BYOK.
- **Abas que viram valor real com o que existe:** Resumo (payload) · **Empresa × Edital** (cruza a lista de habilitação do edital × certidões/CNAE da empresa → apto / ressalvas / não apto + "faltam X docs") · **Prontidão deste edital** · Documentos (checklist) · Plano de Ação. **Veredito** = recomendação calibrada + disclaimer (probabilidade, não promessa).
- **Abas sem dado** (Preço/Concorrentes/Órgão-decisores) = selo **"em ingestão"** com o motivo — NÃO mock, NÃO forjado.
- **ZERO botão fake:** Monitorar, Adicionar à análise, Gerar .docx/e-mail/imprimir, Analisar com IA (desabilitado sem chave BYOK). Cada um faz algo real ou está desabilitado "em breve".

## TAREFA 2 — Radar/card com os 5 sinais ✅ + urgência
Arquivos: `app/(shell)/radar/page.tsx`, `radar/actions.ts`, componentes de card.
- **Card lidera com badge de sinal + urgência** (igual ConLicitação): 
  - **Prazo apertado** ("encerra em Xd" a partir de `data_encerramento`) — laranja + alarme.
  - **Deserta / republicação** (`situacao`) · **Recorrência** (série dos 43k homologados) · **PCA** (raw_pca, classificado por nicho) · **Certidão impeditiva** (cruza com a empresa).
- Renderizar **só os 5 sinais que já têm dado**. NÃO forjar contrato-vencendo / baixa-concorrência (ficam "em ingestão").
- Filtros visíveis (nicho, cidade, modalidade, faixa de valor, tipo de sinal). **Ações reais:** Analisar → cria workspace (Pasta); Monitorar → vai pro Kanban; Descartar → some + salva motivo.

## TAREFA 3 — Visual sem verde (forma, DEPOIS da substância)
- Paleta **navy #0B2D89 · azul #3C83F6 · âmbar #F59F0A · vermelho #DC2626 — ZERO verde.** Densidade command-center.
- Referência de estrutura: `docs/05-UIUX-REMODELAGEM.md` + os prints da ConLicitação em `docs/concorrentes/`. Card com a **urgência em destaque**.
- *(Se o Bione colocar o wireframe da Meta em `docs/`, use-o como alvo-pixel 1:1.)*

## TAREFA 4 — (paralela, dado) coletar `contratos`
- Estender o harvester/backfill para `PNCP /contratos` (`cnpjOrgao`, `dataVigenciaFim`) das cidades das células. **Destrava o sinal "contrato vencendo"** (o mais forte, hoje 0). Aditivo, reusa retry/checkpoint.

## TAREFA 5 — "Gerenciar Licitações" (hub de acompanhamento — evolução do Kanban) · *depois de 1–3*
Modelado no print da ConLicitação, mas **navy/azul, ZERO verde**. É quase tudo CRUD na NOSSA própria data — sem gate de ingestão.
- **Header:** abas `Por mim` / `Por todos` (`Por todos` = equipe → **desabilitado "em breve"** até multi-usuário) + botão `Configurações`.
- **6 cards-resumo com contador real** (das nossas tabelas): Calendário · Favoritadas · **Gerenciadas** · Tarefas · Andamentos · Finalizadas.
- **Ordenar por:** Prazo · Atualizada em · Favoritado em.
- **Lista das licitações gerenciadas** (card → link direto pra Pasta) + empty-state honesto.
- **Calendário (mês)** dos prazos (`data_encerramento`) + tarefas com toggles (Atrasadas/Hoje/Futuras/Concluídas).
- **Configurações de notificação:** receber de Esclarecimento/Aviso/Impugnação/Recurso/Status/Resultados — via **Push (PWA) ✅**; **Email/WhatsApp = "em breve"** (precisam integração).
- **Zero botão fake:** favoritar, gerenciar, criar tarefa, criar andamento, finalizar, remover do gerenciamento — todos persistem e mudam o contador (o autoteste prova).

---

## DoD — autoteste prova o RESULTADO
1. Pasta de uma licitação **REAL de Santos** abre com resumo do `payload` (não São Luís, não mock). `grep` prova que a tela não importa mais `mock.ts`.
2. **Inventário de botões por tela** (✅ funciona com teste que prova o resultado / 🔇 desabilitado "em breve" / ❌ removido). Nenhum clicável-e-morto.
3. Radar mostra os 5 sinais com badge; **Analisar cria workspace** (query confirma no banco); **Monitorar entra no Kanban** (query confirma).
4. Build/lint/tsc verdes, console limpo, screenshot de cada tela.
5. Commit local (sem push). Relatório com o inventário de botões + o que ficou "em ingestão".

## Ordem
Tarefa 1 (Pasta) → Tarefa 2 (Radar) → Tarefa 3 (visual). Tarefa 4 (contratos) roda em paralelo.
