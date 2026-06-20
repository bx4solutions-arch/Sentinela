# PROMPT MESTRE — EXECUTAR TUDO (terminal roda a fila inteira, autotestando)

Decisão do Bione: **não entregar bloco por bloco pra ele testar.** Rodar a fila inteira, **autotestando cada parte** (régua `docs/REGUA-DE-EXECUCAO-E-AUTOTESTE.md`), consertando os próprios bugs, e só entregar quando o conjunto estiver **funcionando ponta a ponta**. O Bione testa tudo no final.

---

## Política de interrupção (Bione: ENTREGAR PRONTO, NÃO PERGUNTAR)
O Bione vai testar no **final**, com tudo pronto. Não devolver pergunta a cada passo. Rodar a fila inteira, autotestar, entregar.
- ✅ **Migration ADITIVA** (criar tabela/coluna/índice): aplica e autotesta sozinho.
- ✅ **IA pré-autorizada** (sem perguntar): usar a **API Claude já existente** — **Haiku para extração/triagem (barato) + Sonnet só na síntese do veredito**. Logar uso de tokens. **NÃO** contratar serviço pago novo nem trocar de provedor.
- ✅ **git push autônomo** *se* o secret-scan automático + `git status` vierem limpos (o guard que já existe). Push pro repo **privado** bx4solutions-arch/Sentinela.
- 🛑 **PARA de verdade só em:** (1) migration **destrutiva** (perda de dado) · (2) **contratar serviço pago novo / assinatura** · (3) aparecer **qualquer segredo** no secret-scan · (4) **peça processual jurídica**.
- Em todo o resto: constrói → autotesta → segue. Entrega o conjunto funcionando + relatório de autoteste.

## Autoteste obrigatório por item (Definition of Done)
Dev server + fluxo real exercitado (browser headless/curl) + persistência conferida no Supabase + console limpo + build/typecheck verde + screenshot conferido. Sem isso, não é "pronto".

---

## FILA DE EXECUÇÃO (em ordem; cada uma autotestada)

### Q1 — Bloco 1: correções r2  *(docs/prompt-bloco1-correcoes-r2.md)*
Trocar empresa (avisado, sem remover casual) · tipos de documento extensíveis ("Outro…") · ficha completa do CNPJ (capital, abertura, situação+data, endereço, todos os CNAEs, QSA) · prontidão calibrada (válidas ÷ obrigatórias, ausente = gap) · tirar banner "mock" de /empresa.
**Autoteste:** criar conta → onboarding → CNPJ de SP → ficha completa → prontidão ~15% com 1 doc → trocar empresa com aviso → cadastrar tipo custom.

### Q2 — Bloco 2: Radar (Pilar A real) — e MELHORADO (não pode ser "lista de editais")
Ligar `raw_editais` (49k ingeridos). O Radar precisa ser o diferencial, não uma lista:
- **Procedência visível (resolve "é real?"):** cada card mostra **fonte = PNCP + link oficial + "atualizado em"**; topo do Radar mostra **"X editais REAIS do seu nicho em [cidade]"** (contagem vinda do banco). **Remover qualquer mock.**
- **Dois pilares separados:** **Licitação do Dia** (ao vivo, todo edital do perfil) + **Antecipação** (sinais pré-edital nos órgãos monitorados — PCA / contrato vencendo / recorrência, sobre o que temos hoje).
- **Ranking por score + MOTIVO:** ordenar por relevância (Chance × Prontidão × proximidade de janela); cada card mostra o **porquê em chips** ("contrato vence em 74d", "PCA publicado", "recorrência anual", "preço-alvo no ETP").
- **Filtros úteis:** nicho · órgão monitorado · estágio/sinal · faixa de valor · proximidade de janela · situação (esconder revogada/anulada por padrão).
- **Ações no card:** **Adicionar à análise** (cria o workspace/pasta) · Monitorar · Descartar (+motivo → aprendizado).
- **Atacar Hoje** no topo (top N por urgência). **Empty-state honesto:** recorte com pouco dado → dizer, não forjar.
**Autoteste:** com CNPJ do nicho, ver editais REAIS de SP com fonte/link, ordenados por score, filtros funcionando, contagem batendo com o banco.

### Q3 — Bloco 5: Dashboard REAL (matar o mock)
KPIs calculados do dado real (pipeline, quentes, editais 90d, contratos vencendo, ações) · Atacar Hoje (do Radar real) · Pipeline por estágio · Linha do Tempo de Sinais (do que existir; o que não houver, não inventa). **Remover o banner "Dados ILUSTRATIVOS (mock)".**
**Autoteste:** abrir a home e conferir que cada número vem do banco, não de mock.

### Q4 — Bloco 4: Kanban + Alertas
Kanban 4–5 colunas (Nova · Monitorando · Preparação · Edital · Resultado) · promover do Radar · alerta básico (certidão/contrato vencendo). *(Migration aditiva do estado do card — aplica sozinho.)*
**Autoteste:** mover card entre colunas, persistir, disparar um alerta.

### Q5 — Bloco 3a: Pasta Inteligente da Licitação (workspace) — MVP  *(docs/04-PASTA-INTELIGENTE-LICITACAO.md)*
"Adicionar à minha análise" → cria o **workspace** da licitação (deletável; apaga tudo junto).

**Fluxo PRINCIPAL de documentos = BAIXAR do PNCP (não é upload):**
- Sondar o **endpoint de arquivos/documentos do PNCP** daquela licitação (convenção do repo: **sondar, não chutar** o contrato da API) → listar **TODOS os documentos disponíveis** (edital, anexos, TR, ETP, minuta, planilha…) como uma **checklist — 1 checkbox por documento** — com nome/tipo.
- O usuário **marca quais quer baixar** (todos ou só alguns) → baixa os selecionados pra dentro do workspace. Download **on-demand**, por licitação.
- **Opção secundária:** subir manualmente um PDF próprio (edital/contrato).

**"Analisar com IA"** lê os documentos baixados/subidos **cruzando com a Lei 14.133 + o perfil da empresa** → **Resumo Executivo** + **Riscos/Pegadinhas** (semáforo) + **Veredito calibrado** (probabilístico + disclaimer) + **Minha Empresa × Edital** (apto/ressalvas/não apto).
- IA **pré-autorizada** (Haiku triagem + Sonnet veredito) — sem perguntar.
- Schema: `licitacao/workspace` + `documento` com **escopo** (company OU licitacao). Aditivo → aplica sozinho.
**Autoteste:** adicionar uma licitação real → ver a **checklist de documentos do PNCP** → marcar 2 de N → baixar → "Analisar" → ver Resumo + Veredito + cruzamento com a empresa; deletar o workspace → some tudo.

### Q6 — Bloco 3b: Consultor IA na pasta + Plano de Ação + Decisão + PDF
Chat com contexto daquela pasta (docs + empresa) · Plano de Ação (tarefas/checklist) · Decisão (participar/monitorar/descartar **+ motivo**) · **Gerar PDF "Dossiê Executivo"**.
**Autoteste:** perguntar ao consultor sobre uma exigência do edital subido; gerar o PDF e abrir.

---

## NÃO construir agora (data-gated → renderizar "em breve · dado em ingestão", NÃO forjar)
- **Preço & Inteligência Comercial · Mapa de Concorrentes · Histórico do Órgão** → exigem `atas`/`contratos` ingeridos (hoje 0) + sanções CEIS/CNEP.
- **Decisores institucionais** → exige 2ª fonte (ata/diário/transparência).
- **Biblioteca Inteligente (busca por IA)** → schema-ready (tags/metadata/pgvector), mas a busca semântica fica pra depois do corpus.
- **Peça processual** (impugnação/recurso) → travada (disclaimer + validação jurídica).
> Essas abas existem na tela, mas com selo "em breve" e o motivo. Honestidade > tela bonita falsa.

---

## Entrega final (o que o Bione vai testar de uma vez)
App navegável com **dado real** ponta a ponta: onboarding → Minha Empresa (ficha completa + prontidão real) → Radar real → Dashboard real (sem mock) → Kanban → Pasta Inteligente (subir edital → análise IA → veredito → PDF). Junto, um **relatório de autoteste** com evidência (screenshots + contagens do banco + build verde) e a lista do que ficou "em breve" e por quê.

git push do conjunto **só com OK do Bione** (gate).
