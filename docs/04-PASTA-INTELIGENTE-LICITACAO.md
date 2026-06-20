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
