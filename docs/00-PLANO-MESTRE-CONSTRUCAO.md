# PLANO MESTRE DE CONSTRUÇÃO — SENTINELA
### Fonte de verdade da execução. Para o Claude Code ler e seguir, etapa por etapa. jun/2026

---

## PRINCÍPIO (decisão do Bione)
Construir **TUDO**, dia após dia, etapa por etapa. **Não congelar feature por falta de dado — a fonte do dado também é construída.** Duas regras que andam juntas:
- **Nunca CONGELAR:** se falta o dado, a tarefa é coletar o dado (está na fila), não pular a feature.
- **Nunca FORJAR:** a seção só **liga** quando o dado real entra; até lá, "em construção" honesto — jamais número inventado.

Dar **poder ao fornecedor**: além do que o sistema traz, ele pesquisa livremente (órgão, item+cidade, concorrente por CNPJ).

**Filtro de toda feature (régua-mãe de produto):** *"Isso aumenta a chance do cliente ganhar a licitação?"* Se não, corta.

Fluxo do produto: **Descobrir → Qualificar → Decidir → Preparar → Participar → Ganhar.**

---

## ESTADO ATUAL (fundação)
Provado: dado real no Supabase (raw_editais 53k, raw_pca 17k, orgao 321, Santos coletada), **mock morto**, integração back↔front 8/8 + 12/12, RLS. Telas vivas: Onboarding, Minha Empresa, Radar, Sala de Guerra (ex-Pasta), Kanban, Configurações/BYOK, Dashboard. **Pré-requisito:** fechar a suíte de testes a 100% (correção em andamento) antes de empilhar.

---

## TRILHA A — DADOS (construir as fontes que faltam)
Cada item = harvester aditivo, retry/checkpoint, grava no DataLake, reusável por célula.
- **A1. Contratos** — sondar a variante correta do endpoint PNCP `/contratos` (deu 400). Destrava **contrato vencendo** (`dataVigenciaFim`).
- **A2. Atas de registro de preço** — `/atas`. Destrava **preço/carona** + **ata vencendo**.
- **A3. Resultado / participação** — sondar PNCP resultado/itens/contrato + (se preciso) Comprasnet. Traz **quem ganhou (CNPJ), nº de participantes, lances, desconto**. **Destrava a "vida do concorrente" + a Inteligência de Mercado.**
- **A4. Sanções CEIS/CNEP** — Transparência. Destrava **concorrente sancionado / vaga aberta**.
- **A5. Decisores** — ata de sessão + diário/nomeações (LGPD institucional). Destrava **CRM de decisores**.

## TRILHA B — MÓDULOS (telas, ligando o dado conforme A entrega)
- **B1. Radar Antecipatório** — PCA, contrato vencendo[A1], recorrência (43k homologados), republicação/situação, contratações semelhantes. Cada card: valor, data provável, órgão, categoria, **urgência**, **probabilidade de publicação**.
- **B2. Sala de Guerra** (tela-rainha da oportunidade): **Resumo Executivo** + **Inteligência Comercial** (quem ganhou[A3], valor histórico, desconto[A3], fornecedor/contrato atual[A1]) + **Inteligência de Mercado** (concorrentes[A3], faixa vencedora[A3], nº médio de participantes[A3]) + **Veredito** (participar / com ressalvas / não — com justificativa).
- **B3. Motor de Preço** (migração MeuJurídico): faixa **vencedora / agressiva / segura**, **risco de inexequibilidade**, histórico. Objetivo: **ajudar a decidir quanto cobrar.**
- **B4. Consultor IA** (corpus MeuJurídico — Lei 14.133 + jurisprudência): "posso participar? esse item é risco? exigência restritiva? o que me inabilita? o que providenciar?" — **sempre citando a fonte.**
- **B5. Gerente de Participação** (módulo de preparação):
  - **Lê integralmente** edital/TR/PB/anexos/minuta (download on-demand dos documentos).
  - **Checklist Inteligente:** documentos que a empresa **já tem** ✓ · **vencidos** ⚠ · **pendentes** ❌.
  - **Gerador de Documentos** (motor MeuJurídico, templates de vendedor): Proposta Comercial (dados da empresa+logo+edital+itens+valores; PDF/DOCX), Declarações (ME/EPP, idoneidade, menor, requisitos, impedimentos, e as **exigidas no edital**), Procuração, Carta de Apresentação, Planilha de Custos pré-preenchida. **Cada doc com botão [Gerar Documento].**
  - **Matriz de Atendimento:** item do edital → exigência → status (✓ atendido / ❌ pendente) → arquivo ou [Gerar].
  - **Vigia Documental:** certidões, SICAF, CRC, balanços, procurações — alerta antes do vencimento.
  - **Chance de Sucesso:** score (documentação + histórico do órgão + concorrência + faixa de preço + experiência) — **calibrado + disclaimer, nunca promessa.**

## TRILHA C — PESQUISA / LIBERDADE (poder ao fornecedor)
- **C1. Buscar por órgão** — digita o órgão → suas licitações + perfil do órgão (CAPAG, histórico, recorrência).
- **C2. Buscar por item + cidade** — busca **semântica** (motor MeuJurídico) → editais comparáveis + preço praticado.
- **C3. Buscar concorrente por CNPJ** — "a vida do concorrente": participações, vitórias, preços, sanções, órgãos onde atua[A3/A4].
- **C4. Busca livre** — objeto, modalidade, faixa de valor, prazo, salvar pesquisa.

## MIGRAÇÃO MeuJurídico (motores — trilha paralela, fundação)
- **M1. Infra** VPS + `price_references` canônica + padrão "motor na VPS, app consome via API" (HTTPS+token).
- **M2. Motor de preço** → alimenta **B3** + **C2**.
- **M3. Busca semântica** (embeddings) → **funil de classificação** + **C2**.
- **M4. Corpus jurídico** (RAG, sem fine-tuning) → **B4**.
- **M5. Motor de geração** (template+RAG+dado→docx) → **B5**.
> Aplicar a higiene de segurança do Sentinela (token fora do código, secret-scan) ao migrar a infra do MeuJurídico.

---

## SEQUÊNCIA (etapa por etapa — maximiza valor, respeita dependências)
0. **Fechar a suíte 100%** (base estável) — pré-requisito.
1. **M1 + M2** (infra + motor de preço) → liga **preço na Sala de Guerra** e **C2 (item+cidade)**.
2. **A1 (contratos) + A3 (resultado/participação)** → as fontes que destravam **mercado e concorrente**.
3. **B2 Sala de Guerra completa** (com o dado de 1 e 2): Inteligência Comercial + Mercado **ligadas de verdade**.
4. **C1 / C2 / C3** pesquisa (órgão · item+cidade · concorrente por CNPJ).
5. **M3 + M4** (semântica + corpus) → **B4 Consultor**.
6. **M5 + B5** → **Gerente de Participação** (gerador + matriz + checklist + chance).
7. **A2 (atas) · A4 (sanções) · A5 (decisores)** → enriquecem as telas já no ar.

> A cada etapa: a feature que dependia daquela fonte **acende**. Nada fica congelado; nada acende vazio.

---

## RÉGUAS (todas as etapas)
- **Liga quando o dado entra; nunca forja antes; nunca congela** (a fonte está na fila).
- **Probabilidade calibrada + disclaimer.** Preço/proposta a **empresa confirma**. **Peça processual travada.**
- **Autotest prova o RESULTADO** (registro/rota certos), **zero botão fake**, console limpo.
- **Use graphify** pra navegar (economia de token); `graphify update` ao final.
- **Aditivo, sem push, sem segredo, IA só BYOK.** Suíte INTEIRA verde a cada entrega.
- **LGPD institucional** (decisores: nome+cargo+canal, nunca CPF/pessoal).
- **Filtro final:** *"isso aumenta a chance de ganhar?"*

---

## NOTA — naming
"Sala de Guerra" é agora a **tela da oportunidade**. O plano comercial que se chamava "Sala de Guerra" (R$1.800) deve ser renomeado para evitar confusão com o cliente.

---

## ARQUITETURA DE DADOS — 3 CAMADAS (resolve "como baixar sem explodir o banco")
**Princípio:** separar o leve (baixa tudo) do pesado (baixa no clique). Não dá pra "lazy-load no clique" o que não está no banco — descoberta exige ingestão proativa do metadado.

- **Camada 1 — Descoberta (metadado de TUDO, diário, nacional).** Harvester noturno puxa o metadado de **todos os editais novos do Brasil** via PNCP (o agregador oficial). Tamanho: ~6–8 mil/dia × ~3 KB = **~24 MB/dia · ~8 GB/ano** (barato). É o que permite **buscar qualquer cidade/nicho** (ex.: mosquito no PI) e só as **abertas** (filtro `situacao` + prazo). Retry/backoff/checkpoint + **CANARY/alerta** — o risco real é falha silenciosa, não tamanho.
- **Camada 2 — Inteligência (resultado + histórico).** Quem ganhou, preço, participantes, contrato vencendo. Também **metadado (KB)**: backfill amplo + delta diário. Alimenta concorrência / preço médio / "vida do concorrente".
- **Camada 3 — Documento (PDF, SÓ no clique + cache).** Edital/TR/anexos baixados quando o cliente analisa; cacheados. **O único pesado.** Aqui vale o **on-demand por célula** + a **IA** — é onde está o custo real, e onde a economia de célula protege a margem.

**Não fazer:** baixar documento de tudo (explode o storage e o custo de IA); nem lazy-load do metadado (não acha o que não está no banco).

## TESTE DE ACEITAÇÃO Nº1 (Definição de Pronto do produto)
> Digitar **"controle de mosquito no Piauí"** → o Sentinela mostra uma licitação **se formando / aberta** em prefeitura/órgão do PI, com antecedência pra chegar antes.

Enquanto isso não acontecer, a **descoberta/antecipação não está "pronta"**. Dogfooding: usar no próprio quintal (TN Santos) e ganhar antes de vender ao mercado.

## SEQUÊNCIA (revisada — começa agora)
0. **Estabilizar:** commitar o fix pendente + **suíte 100% verde** (`docs/prompt-fix-suite-100.md`).
1. **Camada 1 — harvester diário nacional** (descoberta universal). Destrava buscar qualquer cidade/nicho + o teste de aceitação nº1.
2. **Acender a Antecipação:** classificar PCA→nicho (busca semântica) + sinais na Linha do Tempo.
3. **Migração M1+M2** (infra VPS + motor de preço) → Sala de Guerra (preço) + busca item+cidade.
4. **Camada 2** (resultado/participação) → inteligência de mercado + vida do concorrente.
5. **Pesquisa livre** (órgão · item+cidade · concorrente por CNPJ).
6. **Consultor** (corpus) + **Gerente de Participação** (gerador de documentos).
