# SENTINELA — A PASTA INTELIGENTE DA LICITAÇÃO (workspace)
### O coração do produto. Reframe e expansão do "Bloco 3 / Dossiê". Cada licitação vira um workspace deletável que contém TUDO — e a IA transforma PDF bruto em decisão executiva.

---

## Tese (o que vende)
O produto **não é baixar documento** — qualquer plataforma faz isso. O Sentinela pega os documentos horrorosos, **lê tudo com IA** e entrega ao licitante: **vale entrar? está apto? qual o risco? quem ganhou antes? que preço praticou? que documento pesa? qual o plano?**

> "Você não lê edital. O Sentinela lê, compara com sua empresa e te entrega a decisão."
> "De um monte de PDFs para uma decisão comercial."

**Cada licitação = um WORKSPACE** (pasta inteligente): container próprio com documentos, análises, chat, proposta, checklist, PDF. Deletou o workspace → some tudo daquela licitação junto. Isso **substitui a dependência da esteira**.

---

## Modelo mental (renomear internamente)
- ❌ "documentos" / "kit documento"
- ✅ **Pasta Inteligente da Licitação** · **Dossiê Executivo** · **Analisar Licitação** · **Biblioteca Inteligente** · **Consultor da Licitação**
- Botão-âncora: **"Analisar esta licitação com IA"**.

---

## As 12 entregas → núcleo / roadmap, com o gate de cada uma
*(a visão é completa; o que muda é QUANDO cada peça entra — e por quê)*

| # | Entrega | Veredito | Pré-requisito (o gate) |
|---|---|---|---|
| 1 | **Resumo Executivo** (campos do edital + exigências + prazos legais) | 🟢 Núcleo B3a | camada de documento + IA lendo o edital |
| 2 | **Veredito Executivo** (recomendação + justificativa + "X% pronto") | 🟢 Núcleo B3a | #1 + ficha da empresa · **probabilístico + disclaimer** |
| 3 | **Minha Empresa × Edital** (apto/ressalvas/não apto) | 🟢 Núcleo B3a | cruza edital × cadastro (CNAE, certidões, prontidão) |
| 4 | **Consultor IA da Licitação** (chat com contexto da pasta) | 🟢 Núcleo B3b | #1 + motor MeuJurídico (tenant separado) |
| 5 | **Plano de Ação** (tarefas + checklist + prazos) | 🟢 Núcleo B3b | #1 |
| 6 | **Decisão** (participar/monitorar/descartar + **motivo**) | 🟢 Núcleo B3b | — (o motivo vira aprendizado depois) |
| 7 | **Gerar PDF "Dossiê Executivo"** | 🟢 Núcleo B3b | #1–#3 |
| 8 | **Preço & Inteligência Comercial** | 🟡 Roadmap B3c | **atas/contratos ingeridos** (hoje 0) |
| 9 | **Mapa de Concorrentes** | 🟡 Roadmap B3c | atas/contratos + **sanções CEIS/CNEP** |
| 10 | **Histórico do Órgão** (contratos, pagamento, recompra) | 🟡 Roadmap B3c | atas/contratos + perfil de órgão |
| 11 | **Biblioteca Inteligente** (busca indexada por IA) | 🟡 Roadmap | corpus + indexação (pgvector) — schema-ready já |
| 12 | **Score da Licitação** (sub-scores) | 🟡 Parcial | começa com 3 reais (oportunidade/compat/documental); os de preço/concorrência/órgão entram com #8–#10 |
| — | **Pegadinhas & Riscos** (semáforo verde/amarelo/vermelho/azul) | 🟢 Núcleo B3a | #1 (IA aponta sobre o texto do edital) |
| — | **Peça processual** (impugnação/recurso/contrarrazões) | 🔴 Trava | disclaimer + "valide com advogado" + parecer jurídico |

---

## MVP do workspace — BLOCO 3a (o que ship primeiro)
O slice que prova o conceito, sobre o que dá pra ter já:
1. **"Adicionar à minha análise"** → cria o workspace da licitação (a partir de um edital do Radar **ou** upload manual).
2. **Aba Documentos:** upload/import do edital + anexos (e, quando o `/arquivos` do PNCP existir, download automático). Cada doc: tipo, origem, data, status de leitura pela IA.
3. **"Analisar com IA"** → gera **Resumo Executivo** (órgão, objeto, valor, prazos, critério, exigências, documentos/atestados/licenças exigidos, prazos legais) + **Pegadinhas/Riscos** (semáforo) + **Veredito calibrado** (com disclaimer) + **Minha Empresa × Edital** (apto/ressalvas/não apto, com "faltam X pontos").
4. Abas de dado pesado (Preço/Concorrentes/Órgão/Decisores) aparecem como **"em breve · dado em ingestão"** — honesto, não forjado.

**BLOCO 3b:** Consultor IA na pasta · Plano de Ação · Decisão (+motivo) · PDF Dossiê Executivo.
**BLOCO 3c:** Preço · Concorrentes · Órgão (quando atas/contratos/sanções entrarem) · Score completo.

---

## Layout da pasta (9 abas — construir conforme os blocos)
Topo: nome · órgão · cidade/UF · valor · data abertura · status · **score** · botões **Participar · Descartar · Gerar PDF**.
Abas: **Resumo Executivo** (3a) · **Minha Empresa × Edital** (3a) · **Riscos Jurídicos** (3a) · **Consultor IA** (3b) · **Plano de Ação** (3b) · **Documentos** (3a) · **Preços & Histórico** (3c) · **Órgão** (3c) · **Concorrentes** (3c).

---

## Gates inegociáveis
1. **Veredito = probabilidade, não promessa.** "Recomendação calibrada" + disclaimer. Nunca "você vai ganhar".
2. **Peça processual travada.** Impugnação/recurso só com aviso + validação profissional + parecer jurídico antes de liberar.
3. **Consultor reusa MeuJurídico** em tenant separado (muralha de dados).
4. **Documento on-demand.** Baixa o processo quando o usuário adiciona à análise / opta participar — não em lote.
5. **Schema workspace-aware desde já** (Bloco 1/2): `documento` com escopo (company OU licitacao/demand); licitacao = container deletável. Não refatorar no B3.

---

## Modelo comercial (registrar — Fase de planos)
O storage vira plano, mas o limite **não é só GB** — é **inteligência consumida**:
- nº de **licitações analisadas** · nº de **documentos lidos pela IA** · nº de **dossiês gerados** · nº de **consultas ao Consultor IA** · nº de **PDFs gerados**.
- Esboço: Básico (100 análises) · Profissional (1.000 + histórico 24m) · Premium (storage ampliado + análise jurídica + PDF + comparação histórica).
- Porque **o valor está na inteligência, não no arquivo.**

---

## Sequência (não pular a fundação)
Esta é a spec do **Bloco 3** — registrada agora pra construir certo. **Não abandona o caminho:** terminamos **Bloco 1** (Minha Empresa, no gate) → **Bloco 2** (Radar) → **Bloco 3** (esta pasta inteligente, em 3a/3b/3c). A empolgação não fura a fila — mas a fundação (schema, ingestão, ficha) já nasce pronta pra receber o workspace.

---

## ADENDO — Resumo Executivo: schema PADRÃO-OURO + nossos diferenciais
*(baseado no output real da ConLicitação — exemplo salvo em `docs/concorrentes/conlicitacao/findings/exemplo-resumo-edital-19050554.md`)*

**Template de saída da IA (replicar — é table-stakes):**
1. **Topo:** Valor estimado · Modalidade · Data da sessão (countdown "em X dias").
2. **Identificação:** objeto, número, UASG, portal, contratação, regulamentação.
3. **Sessão Pública:** data, horário, modo de disputa, intervalo mínimo.
4. **Órgão:** nome, e-mail/telefone institucional, endereço, **CAPAG** (nota + 3 sub-indicadores: Endividamento, Poupança corrente, Liquidez Relativa) — fonte Tesouro.
5. **Detalhes:** valor, prazo/vigência, margem de preferência (cita decreto/lei), visita técnica, amostra, critério de julgamento, ME/EPP, regionalidade, prova de conceito.
6. **Seguro Garantia** (4 tipos, cada um com motivo/cláusula).
7. **Prazos importantes (grid):** documentação complementar, recurso/contrarrazões (3+3 dias), **limite para impugnação (com artigo)**, propostas, vigência.
8. **Critérios da Proposta e Julgamento:** validade, desempate (ME/EPP + regional), exigências.
9. **Resumo dos Itens:** total, descrição, valor unitário/total máximo.
10. **Documentos de habilitação (lista completa)** + Atestado de capacidade técnica.
11. **Legislação aplicável** (leis/decretos citados).
12. **Anexos e declarações** (I…VII).
13. **Outras informações:** consórcio, subcontratação, **Fiscal/decisor do contrato**, LGPD, prazo de assinatura, dotação, contatos institucionais.
14. **Condições de pagamento.**
15. **Penalidades e multas** (destaque vermelho).
16. **Análise crítica:** conflito objeto×minuta, conflito de prazos, reajuste, renovação (limite art. 106).

**NOSSOS DIFERENCIAIS por cima (o que eles NÃO fazem — o wedge):**
- **Empresa × Edital:** apto / ressalvas / não apto — cruzar a lista de habilitação (item 10) com certidões/CNAE/atestados da empresa ("faltam X docs").
- **Veredito calibrado** (probabilístico + disclaimer): vale entrar? por quê?
- **Prontidão deste edital** (quais docs faltam pra ESTE).
- **Decisores:** extrair pregoeiro/fiscal/ordenador do texto (ex.: "Fiscal: ADRIANA VIVIANI") → CRM (LGPD institucional).
- **Antecipação:** PCA / contrato vencendo / recorrência — eles não têm.
- **Consultor unificado:** lê o edital + cita lei/jurisprudência + **teses dinâmicas** daquele edital (não 3 ferramentas separadas).

**Perguntas Estratégicas** (chips no Consultor da pasta, 6 categorias): Proposta · Objeto · Habilitação · Pagamentos · Riscos/Penalidades · Contrato.

**Ações / Export (igualar — REQUISITO da Pasta):** Baixar Edital Completo (PDF) · Enviar por e-mail · Gerar Word (.docx) · Imprimir · Salvar (PDF). Disclaimer fixo.

---

## ARQUITETURA — Resumo é PRÉ-COMPUTADO e CACHEADO (NÃO é IA ao vivo no clique)
Observação do Bione (confirmada pelo artefato real, que traz "Emitido em DD/MM às HH:MM" = carimbo de geração): o resumo da ConLicitação abre em ~3s — rápido demais para LLM ao vivo. É artefato **armazenado** e servido por *cache-hit*.

**Regras para o Sentinela:**
1. **Gerar UMA vez, cachear, servir instantâneo.** O resumo fica em `licitacao.resumo_json`; o clique "Analisar/Resumo" é leitura do banco — **zero custo de IA por visualização**.
2. **Determinístico primeiro:** campos estruturados (valor, datas, modalidade, órgão, portal) vêm do **metadado PNCP**; **CAPAG** vem de lookup no **Tesouro** — sem LLM.
3. **LLM só na camada interpretativa** (objeto resumido, habilitação/prazos extraídos do documento, garantias, análise crítica, riscos, veredito, Empresa×Edital) — e **uma vez por edital**, salvo.
4. **Quando gerar:** ao **adicionar à análise / baixar os documentos** (em background), não no clique de visualização.
5. **Reuso entre usuários:** mesmo edital aberto por N clientes = gera 1 vez, todos reusam (economia de célula). Regenera só se o edital mudar (novo anexo/republicação).
6. **Efeito:** rápido (UX) + custo pago **uma vez por edital** (não por clique nem por usuário) — desarma o custo de IA, ainda mais com BYOK.

---

## AÇÕES DE GERENCIAMENTO DA LICITAÇÃO (card/workspace) — validado vs ConLicitação
Quando o licitante decide acompanhar uma licitação, o card/workspace tem estas ações (confirmado no print da ConLicitação):
- **Adicionar Tarefa** — responsável, prazo, prioridade (checklist de execução). *(já specado)*
- **Adicionar Andamento** — **registro manual na linha do tempo** (movimentações que o usuário acompanha: "enviei proposta", "ganhei na fase de lances", "entrou recurso"). Separado das tarefas. ← **novo**
- **Anotações** — notas/comentários livres na licitação.
- **Favoritar / Acompanhar** (estrela/olho) — marca de interesse.
- **Colaboradores** — mais de uma pessoa gerencia a mesma licitação (equipe; badge nº de pessoas). ← **novo** (feature de time)
- **Remover do Gerenciamento** — tira do Kanban **SEM apagar** a licitação (≠ deletar o workspace inteiro, que é ação deliberada). Dois níveis: sair do acompanhamento (leve) vs destruir a pasta (pesado).
- Atalhos já previstos no card: Ver itens · Baixar Edital · Resumo do Edital · Pergunte ao Edital · Acessar a licitação (link do portal) · status (NOVA/…).

Liga no **Bloco 4 (Kanban)** + **Pasta Inteligente**. "Andamento" e "Colaboradores" são os dois que faltavam.
