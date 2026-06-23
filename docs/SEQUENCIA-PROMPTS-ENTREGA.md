# SEQUÊNCIA DE PROMPTS — ENTREGA SENTINELA + MOTORES MeuJurídico
### Para o Claude Code executar EM ORDEM. Cada bloco: objetivo · tarefas · DoD (prova o RESULTADO) · gate.

**Régua (todos os blocos):** `docs/REGUA-DE-EXECUCAO-E-AUTOTESTE.md` + `docs/00-PLANO-MESTRE-CONSTRUCAO.md`. **Use graphify.** Aditivo, **sem push** (gate), IA só BYOK, **suíte INTEIRA verde** a cada bloco. **Autoteste prova o RESULTADO** (registro/rota/dado certos), nunca a presença. STOP ao fim de cada bloco pra reportar; em auto-mode pode seguir, mas **PARA nos 4 gates** (schema destrutivo / push / billing / jurídico).

**Estado:** Etapas 0/1/2 entregues (suíte verde, harvester nacional, antecipação PCA+recorrência, contrato-vencendo ainda "em ingestão").

---

## BLOCO 1 — CAMADA 2: Contrato vencendo + Resultado/Participação (DADO)
**Objetivo:** completar a antecipação (contrato vencendo) e alimentar a inteligência (quem ganhou, preço médio, vida do concorrente).
- **Sondar a variante** do endpoint PNCP de **contratos** (`/contratos`, `/contratos/atualizacao` ou params) — registrar o probe. Coletar metadado: `cnpjOrgao`, objeto, **`dataVigenciaFim`**, valor → derivar **"contrato vencendo em X dias / renovação provável"**.
- **Sondar/coletar resultado** (quem ganhou — CNPJ vencedor, nº de participantes, valor homologado) do PNCP → alimenta concorrência/preço.
- Metadado, **upsert direto** (Camada 2), denormalizar `uf_sigla` (padrão das migrations 0015), sem documento. Canary anti-falha-silenciosa.
- Se algum endpoint travar após o probe: **BLOQUEIOS.md e segue** (não forjar).
**DoD:** o **contrato vencendo** aparece na esteira de Antecipação de um órgão real; `select uf_sigla,count(*) from contratos` cresce em várias UFs; o resultado traz o CNPJ vencedor de editais homologados. Suíte verde, commit local.

## BLOCO 2 — Dashboard completo + Sala de Guerra completa
**Objetivo:** a home com a grade inteira do nicho + a oportunidade com inteligência real.
- **Dashboard (a grade):** **Licitação do Dia** (abertos) + **Antecipação** (esteira: PCA/contrato-vencendo/recorrência) + KPIs + **Tarefas do dia** + **Linha do Tempo de Sinais** + **pipeline** (sinal→edital→participando→resultado). SEM VERDE (navy/azul/âmbar/vermelho).
- **Sala de Guerra:** acender **Inteligência Comercial** (quem ganhou, fornecedor/contrato atual, desconto) + **Inteligência de Mercado** (concorrentes recorrentes, faixa vencedora, nº médio de participantes) com os dados do Bloco 1.
- **Zero botão fake** (cada ação prova o resultado).
**DoD:** dashboard mostra as **duas grades** + tarefas reais; a Sala de Guerra de um edital real mostra **quem ganhou + preço** (do Bloco 1). Screenshots + query. Suíte verde.

## BLOCO 3 — Pesquisa livre (poder ao fornecedor)
**Objetivo:** liberdade de busca.
- **C1 buscar por órgão** → suas licitações + perfil. **C2 item + cidade** → editais (reusa trigram). **C3 concorrente por CNPJ** → "vida do concorrente" (participações, vitórias, preços, sanções) com os dados do Bloco 1.
**DoD:** digitar um CNPJ → vida do concorrente real; buscar órgão → suas licitações; item+cidade → editais. Playwright + query + screenshot.

## BLOCO 4 — Migração MeuJurídico M1+M2: Infra VPS + Motor de Preço
**Objetivo:** "quanto cobrar" — o ativo mais forte do MeuJurídico.
- **M1 Infra:** subir o motor na **VPS** + `price_references` canônica + o app consome via **API (HTTPS+token)**. **Aplicar a higiene de segurança** (token fora do código, secret-scan).
- **M2 Motor de preço:** IQR + mediana + **CV semáforo** + **recusa honesta** + fonte rastreável. **Reframe vendedor:** preço-alvo do órgão, **faixa vencedora / agressiva / segura**, **risco de inexequibilidade**. Liga na **aba Preço da Sala de Guerra** + na busca item+cidade.
- 🛑 **GATE:** infra/VPS + possível billing → **PARA e confirma** antes.
**DoD:** a aba Preço mostra a **faixa saneada** de um item real, com CV e fonte (link PNCP). Suíte verde.

## BLOCO 5 — M3 Busca Semântica + M4 Corpus Jurídico → Consultor
**Objetivo:** achar por significado + consultor que cita a lei.
- **M3 Embeddings:** funil de classificação + busca por item (sem rótulo manual). Reusa do MeuJurídico.
- **M4 Corpus:** Lei 14.133 + jurisprudência (RAG, sem fine-tuning) → **Consultor** responde "posso participar? o que me inabilita? exigência restritiva?" **sempre citando a fonte** + disclaimer.
**DoD:** Consultor responde citando **artigo**; a busca semântica acha sinônimos (vetor↔dengue↔endemias) **sem** keyword manual. Suíte verde.

## BLOCO 6 — Gerente de Participação (gerador SECCIONADO de proposta)
**Objetivo:** entregar o pacote pra participar — o fechamento.
- Reusar o **motor seccionado do MeuJurídico** (o padrão do DFD), com **templates de vendedor**.
- **A proposta é construída por SEÇÕES**, cada uma **pré-preenchida pela IA** (insight do edital + documentos + dados da empresa) e **CONFIRMÁVEL** pelo usuário → **ao confirmar, a seção é injetada no documento**:
  - Cabeçalho (logomarca, endereçamento) · Dados da licitação/órgão · Objeto · **Condições comerciais (preço a EMPRESA define**, motor sugere) · Condições técnicas · Declarações (as exigidas naquele edital).
- **+ Checklist inteligente** (já tem/vencido/pendente) + **Matriz de atendimento** (item do edital → exigência → evidência/status → [Gerar]).
- **FORA: planilha de custos** (decisão do Bione). Export **PDF/DOCX**.
- 🛑 **GATE jurídico:** disclaimer nas declarações; **peça processual (impugnação/recurso) fica travada**.
**DoD:** numa licitação real, montar a proposta **seção por seção** (confirmar → injetar) e **exportar DOCX**; a Matriz de Atendimento liga item→evidência. Screenshot do documento gerado.

---

## Expectativa (honesta) e ordem
Blocos **1–3 = produto vendável** com o dado e a inteligência (rápidos, baixo risco). Blocos **4 e 6 = pesados** (VPS + gerador) — provavelmente passam de um dia. A ordem entrega o valor mais alto primeiro: se o dia não fechar tudo, você termina com **dashboard + sala de guerra + pesquisa** funcionando, e os motores do MeuJurídico (preço, consultor, gerador) entram na sequência.

**Teste-rei (vale em todos):** *"isso aumenta a chance do cliente ganhar a licitação?"* — e o cenário do **"controle de vetores no Piauí, se formando, chegar antes"** continua sendo o termômetro.
