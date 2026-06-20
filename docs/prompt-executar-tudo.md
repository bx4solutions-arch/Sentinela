# PROMPT MESTRE — EXECUTAR TUDO (terminal roda a fila inteira, autotestando)

Decisão do Bione: **não entregar bloco por bloco pra ele testar.** Rodar a fila inteira, **autotestando cada parte** (régua `docs/REGUA-DE-EXECUCAO-E-AUTOTESTE.md`), consertando os próprios bugs, e só entregar quando o conjunto estiver **funcionando ponta a ponta**. O Bione testa tudo no final.

---

## Política de interrupção (refinada — para o mínimo)
- ✅ **Migration ADITIVA** (criar tabela/coluna/índice): aplica e autotesta **sozinho**.
- 🛑 **PARA e pede OK** só em: (1) migration **destrutiva** (drop/alter com perda de dado) · (2) **git push** · (3) **gasto/billing** (inclui ligar API de IA paga) · (4) **peça processual jurídica**.
- Em todo o resto: constrói → autotesta → segue pra próxima da fila.

## Autoteste obrigatório por item (Definition of Done)
Dev server + fluxo real exercitado (browser headless/curl) + persistência conferida no Supabase + console limpo + build/typecheck verde + screenshot conferido. Sem isso, não é "pronto".

---

## FILA DE EXECUÇÃO (em ordem; cada uma autotestada)

### Q1 — Bloco 1: correções r2  *(docs/prompt-bloco1-correcoes-r2.md)*
Trocar empresa (avisado, sem remover casual) · tipos de documento extensíveis ("Outro…") · ficha completa do CNPJ (capital, abertura, situação+data, endereço, todos os CNAEs, QSA) · prontidão calibrada (válidas ÷ obrigatórias, ausente = gap) · tirar banner "mock" de /empresa.
**Autoteste:** criar conta → onboarding → CNPJ de SP → ficha completa → prontidão ~15% com 1 doc → trocar empresa com aviso → cadastrar tipo custom.

### Q2 — Bloco 2: Radar (Pilar A, dado REAL)
Ligar `raw_editais` (49k ingeridos) → Radar filtrado por nicho/cidade do perfil · card com campos reais (órgão, objeto, valor, situação, data, fonte) · ordenação por relevância · botões (descartar/monitorar/adicionar à análise). **Remover qualquer mock do Radar.**
**Autoteste:** com CNPJ de material hospitalar, ver editais reais de SP do nicho; conferir que os números batem com o banco.

### Q3 — Bloco 5: Dashboard REAL (matar o mock)
KPIs calculados do dado real (pipeline, quentes, editais 90d, contratos vencendo, ações) · Atacar Hoje (do Radar real) · Pipeline por estágio · Linha do Tempo de Sinais (do que existir; o que não houver, não inventa). **Remover o banner "Dados ILUSTRATIVOS (mock)".**
**Autoteste:** abrir a home e conferir que cada número vem do banco, não de mock.

### Q4 — Bloco 4: Kanban + Alertas
Kanban 4–5 colunas (Nova · Monitorando · Preparação · Edital · Resultado) · promover do Radar · alerta básico (certidão/contrato vencendo). *(Migration aditiva do estado do card — aplica sozinho.)*
**Autoteste:** mover card entre colunas, persistir, disparar um alerta.

### Q5 — Bloco 3a: Pasta Inteligente da Licitação (workspace) — MVP  *(docs/04-PASTA-INTELIGENTE-LICITACAO.md)*
"Adicionar à minha análise" → cria o **workspace** da licitação (deletável; apaga tudo junto) · aba **Documentos** (upload/import; quando `/arquivos` do PNCP existir, download) · **"Analisar com IA"** → **Resumo Executivo** + **Riscos/Pegadinhas** (semáforo) + **Veredito calibrado** (probabilístico + disclaimer) + **Minha Empresa × Edital** (apto/ressalvas/não apto).
- 🛑 **Antes de ligar a IA paga: PARA e confirma com o Bione** o modelo e o custo por análise (gate de gasto).
- Schema: `licitacao/workspace` + `documento` com **escopo** (company OU licitacao). Aditivo → aplica sozinho.
**Autoteste:** subir um edital PDF → "Analisar" → ver o Resumo + Veredito + cruzamento com a empresa; deletar o workspace → some tudo.

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
