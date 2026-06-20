# Sentinela — Pasta Inteligente da Licitação (Bloco 3) — SPEC REGISTRADA

> Registrado em 2026-06-20. **Não construir agora** — sequência é B1 (Minha Empresa) → B2 (Radar) → B3 (esta pasta).
> A fundação (schema workspace-aware, ingestão, ficha) já nasce pronta pra receber o workspace.

## Tese
O produto não é baixar documento — é **ler com IA** e entregar decisão: vale entrar? está apto? qual o risco?
quem ganhou antes? que preço praticou? que documento pesa? qual o plano?

> "Você não lê edital. O Sentinela lê, compara com sua empresa e te entrega a decisão."
> "De um monte de PDFs para uma decisão comercial."

**Cada licitação = um WORKSPACE** (pasta inteligente, deletável): documentos, análises, chat, proposta, checklist, PDF.
Deletar o workspace apaga tudo daquela licitação. Substitui a dependência da esteira.

## Modelo mental (nomes)
Pasta Inteligente da Licitação · Dossiê Executivo · Analisar Licitação · Biblioteca Inteligente · Consultor da Licitação.
Botão-âncora: **"Analisar esta licitação com IA"**. Evitar "kit documento".

## 12 entregas (núcleo vs roadmap)
| # | Entrega | Veredito | Gate |
|---|---|---|---|
| 1 | Resumo Executivo | 🟢 B3a | camada documento + IA lê edital |
| 2 | Veredito Executivo (calibrado + disclaimer, "X% pronto") | 🟢 B3a | #1 + ficha empresa |
| 3 | Minha Empresa × Edital (apto/ressalvas/não apto) | 🟢 B3a | cruza edital × cadastro |
| 4 | Consultor IA da Licitação (chat com contexto) | 🟢 B3b | #1 + motor MeuJurídico (tenant separado) |
| 5 | Plano de Ação (tarefas + checklist + prazos) | 🟢 B3b | #1 |
| 6 | Decisão (participar/monitorar/descartar + motivo) | 🟢 B3b | — |
| 7 | Gerar PDF "Dossiê Executivo" | 🟢 B3b | #1–#3 |
| 8 | Preço & Inteligência Comercial | 🟡 B3c | atas/contratos ingeridos (hoje 0) |
| 9 | Mapa de Concorrentes | 🟡 B3c | atas/contratos + sanções CEIS/CNEP |
| 10 | Histórico do Órgão | 🟡 B3c | atas/contratos + perfil órgão |
| 11 | Biblioteca Inteligente (busca IA) | 🟡 Roadmap | corpus + pgvector (schema-ready) |
| 12 | Score da Licitação (sub-scores) | 🟡 Parcial | 3 reais agora; preço/concorrência/órgão com #8–10 |
| — | Pegadinhas & Riscos (semáforo) | 🟢 B3a | #1 |
| — | Peça processual (impugnação/recurso) | 🔒 Trava | disclaimer + validação profissional + parecer |

## MVP — Bloco 3a
1. "Adicionar à minha análise" → cria workspace (de edital do Radar ou upload manual).
2. Aba Documentos: upload/import edital + anexos (download automático quando `/arquivos` PNCP existir).
3. "Analisar com IA" → Resumo Executivo + Pegadinhas/Riscos + Veredito calibrado + Minha Empresa × Edital.
4. Abas pesadas (Preço/Concorrentes/Órgão) como "em breve · dado em ingestão" — honesto.

**B3b:** Consultor IA · Plano de Ação · Decisão (+motivo) · PDF Dossiê. **B3c:** Preço · Concorrentes · Órgão · Score completo.

## Layout (9 abas)
Topo: nome · órgão · cidade/UF · valor · abertura · status · score · Participar/Descartar/Gerar PDF.
Abas: Resumo Executivo (3a) · Minha Empresa × Edital (3a) · Riscos Jurídicos (3a) · Consultor IA (3b) ·
Plano de Ação (3b) · Documentos (3a) · Preços & Histórico (3c) · Órgão (3c) · Concorrentes (3c).

## Gates inegociáveis
1. Veredito = probabilidade, não promessa (recomendação calibrada + disclaimer; nunca "você vai ganhar").
2. Peça processual travada (aviso + validação profissional + parecer jurídico antes de liberar).
3. Consultor reusa MeuJurídico em tenant separado (muralha de dados).
4. Documento on-demand (baixa ao adicionar à análise / participar — não em lote).
5. **Schema workspace-aware desde já:** `documento` com escopo (company OU licitacao/demand); licitacao = container deletável. Não refatorar no B3.

## Modelo comercial (Fase de planos)
Limite não é só GB — é **inteligência consumida**: nº de análises, documentos lidos pela IA, dossiês, consultas ao Consultor, PDFs.
Esboço: Básico (100 análises) · Profissional (1.000 + histórico 24m) · Premium (storage ampliado + jurídico + PDF + comparação histórica).
