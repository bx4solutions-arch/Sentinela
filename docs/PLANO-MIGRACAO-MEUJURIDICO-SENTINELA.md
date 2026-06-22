# PLANO DE MIGRAÇÃO — MeuJurídico → Sentinela (consolidação de produtos)
*Encerrar o MeuJurídico e herdar seus motores. jun/2026*

---

## Princípio
MeuJurídico (comprador) e Sentinela (vendedor) são **dois lados da mesma moeda** — mesmo dado (PNCP), mesma lei (14.133), mesma realidade de preço. **Migra-se MOTOR e INFRA, não o produto-comprador.** Cada motor é re-enquadrado para a língua do vendedor.

---

## 1. INVENTÁRIO — o que migra (motor por motor)

| Ativo do MeuJurídico | Vira no Sentinela | Prioridade |
|---|---|---|
| **Motor de preço saneado** (IQR, mediana, **CV semáforo**, recusa honesta, fonte rastreável PNCP) | Aba **Preço / Inteligência Comercial**: preço-alvo do órgão · margem provável · **risco de inexequibilidade** · preço praticado | ⭐⭐⭐ |
| **Busca semântica** (embeddings, sem rotulagem manual) | **Funil de classificação** (edital→nicho) + **cesta de itens comparáveis** do preço | ⭐⭐⭐ |
| **Corpus jurídico + RAG** (Lei 14.133 + jurisprudência; REGRA+EXEMPLO+DADO, sem fine-tuning) | **Consultor jurídico do licitante** + fundamentação do Veredito | ⭐⭐⭐ |
| **Motor de geração de documentos** (template + RAG + dado → .docx) | **Kit de Participação** (proposta, declarações, anexos) — ver §2 | ⭐⭐⭐ |
| **Infra VPS + padrão "motor na VPS, app consome via API"** (HTTPS+token, `price_references` canônica, retry/checkpoint) | Casa do harvester/backfill + o DataLake do Sentinela | ⭐⭐ |
| **Design system + componentes de UI** (o PRD já dizia "herdado do MeuJurídico") | A UI do Sentinela (resolve parte da "tela plana") | ⭐⭐ |
| **Score Supremo** (juiz de qualidade que não mente) | Scorer do **Veredito / Chance** | ⭐ |

**NÃO migra (evitar dispersão):** o workflow do comprador (montar ETP/TR/contratação, Mapa de Riscos), o catálogo CATMAT/CATSER **mock** (entra só a versão oficial real).

---

## 2. MÓDULO NOVO — Kit de Participação (gerado pelo motor herdado)
Quando o licitante decide participar **e** a empresa está cadastrada, o Sentinela **gera o kit pronto**, lendo as exigências **daquele edital**:

**Gera (template + dado que já temos):**
- **Proposta comercial** — pré-preenchida com o **preço do motor** + dados da empresa (a empresa **confirma o preço**, não é automático).
- **Declarações obrigatórias** — ME/EPP, idoneidade, cumprimento de requisitos, menor/aprendiz, etc. (templates padronizados).
- **Planilha de custos / composição de preços.**
- **Procuração / credenciamento · Carta de apresentação.**
- **Os anexos exigidos NAQUELE edital** (Anexo III/IV/V lidos do payload — geração edital-aware, não genérica).

**Organiza, não gera** (a empresa fornece): certidões (via **Vigia**), atestados, contrato social.

**Por que é simples:** o ETP/TR exige justificativa técnica + pesquisa de mercado + risco; a proposta/declaração é **preenchimento de template** com dado que o Sentinela já tem (Raio-X da empresa + payload do edital + preço do motor). **Mesmo motor do MeuJurídico, templates de vendedor.**

---

## 3. As necessidades do fornecedor → de onde vêm
| O que o fornecedor quer | Fonte no Sentinela (pós-migração) |
|---|---|
| Analisar todos os documentos + insights "o que fazer / não fazer" | Consultor IA (corpus + RAG) + Resumo da Pasta |
| Analisar a licitação e a estratégia | Veredito + Plano de Ação |
| Concorrência · último fornecedor (2 anos) · preço médio | Homologados (**43k já no banco**) + atas/contratos (a ingerir) + **motor de preço** |
| Preço da concorrência / inexequibilidade | Motor de preço saneado (CV, mediana) |
| **Toda a documentação pra participar** | **Kit de Participação** (§2) |

---

## 4. Travas (sócio crítico)
1. **Preço/proposta:** pré-preenche, a **empresa confirma** (probabilidade, nunca promessa — não commita a um número sozinho).
2. **Geração edital-aware:** os anexos **exigidos naquele edital**, não modelos genéricos.
3. **Escopo honesto:** gera os preenchíveis (proposta/declarações/planilha); **organiza** os que a empresa fornece (certidões/atestados). Não prometer "geramos 100% dos documentos" sem essa distinção.
4. **Segurança:** aplicar a higiene já feita no Sentinela (token fora do código, secret-scan) na migração da infra do MeuJurídico.
5. **Peça processual** (impugnação/recurso) segue travada (disclaimer + validação jurídica).

---

## 5. ORDEM DE MIGRAÇÃO
1. **Infra** — VPS + `price_references` + o padrão motor↔API (a fundação).
2. **Motor de preço** — maior gap do Sentinela; liga a aba Preço/Inteligência Comercial.
3. **Busca semântica** — funil de classificação + cesta de preço.
4. **Corpus jurídico** — Consultor do licitante.
5. **Motor de geração → Kit de Participação** (templates de vendedor).
6. **Design system** — UI.

## 6. PONTOS DE INTEGRAÇÃO com o Sentinela atual
- `price_references` ↔ `raw_editais`/`orgao` (todo preço aponta para a contratação real).
- O motor de geração consome: **company (Raio-X)** + **edital (payload)** + **preço (motor)** → .docx.
- A análise de concorrência/histórico usa o motor de preço + os **homologados (43k)** já ingeridos.
- O Consultor da Pasta passa a usar o corpus jurídico migrado (hoje é placeholder/BYOK).

## 7. Veredito
A consolidação converte um produto que ia fechar em **ativo de escala**. O Sentinela ganha, de graça, o que levaria meses: motor de preço, busca semântica, corpus jurídico, motor de geração e VPS. E fecha a jornada — **encontrar → decidir → preparar → gerar o kit → participar** — virando o único que entrega o caminho inteiro até a proposta na mão.
