# PROTOCOLO DE LEITURA DO GATE F0 — SENTINELA
### Veredito binário: "segue como antecipação" vs. "sustenta no dado limpo"
*Derivado de `sentinela-prd-blueprint.md` §11 (Roadmap), §12 (Métricas) e §13 (Riscos e Régua). Célula de referência: controle de pragas × São Luís/MA.*

---

## 0. O que o PRD trava vs. o que é calibração nossa

| Variável | Piso | Origem | Papel no F0 |
|---|---|---|---|
| Acerto do matching de objeto | **> 80%** | **PRD §12/§13 (literal)** | Gate duro. Travar antes do F1. |
| Cobertura do Dossiê (% campos) | **> 80%** | **PRD §12 (literal)** | Gate de ativação + sinal de célula rasa. |
| Backfill por célula | **< 10 min** | **PRD §12 (literal)** | Gate de custo/ativação (não de tese). |
| Granularidade do PCA | **≥ 70%** (proposto) | **Calibração nossa** — PRD manda medir, não fixa piso | Travar para evitar decisão emocional. |
| Presença da esteira quente (ETP/IRP pré-edital) | **≥ 50%** dos editais (proposto) | **Calibração nossa** — derivado de §7/§8/§13 | **O teste real da tese no município.** Ver §1-G2. |
| Antecedência média | **medir e registrar** | **PRD §12** ("medida e crescente por estágio") | **NÃO é gate do F0.** É gate do F2. |

> Regra de ouro da leitura: **matching e dossiê são correção de engenharia/cobertura; granularidade e esteira quente são matéria-prima.** A primeira você conserta. A segunda você não conserta com esforço — ela define se a tese de antecipação existe nesta célula.

> **Correção crítica vs. v1 (pós-leitura §7):** o Índice de Iminência é **função do estágio** (`PCA frio · DFD morno · ETP quente · IRP muito quente · TR iminente`), não predição a partir do PCA. Portanto **conversão PCA→edital baixa NÃO é gate de reprovação** — o PCA é frio por design. O que decide é se as etapas **quentes (ETP/IRP) aparecem antes do edital** nesta célula. Esse é o risco municipal real do §13 ("a esteira pré-edital é mais rica no federal que no municipal").

---

## 1. Os cortes binários do F0

**G1 — Granularidade do PCA.** % de itens do PCA com descrição utilizável (item + CATMAT/CATSER + valor estimado + janela). PASSA ≥ 70% · FALHA < 70%. Abaixo disso o PCA é "serviços diversos" e não mapeia célula.

**G2 — Presença da esteira quente.** Dos editais que a célula gerou na janela, em quantos havia **ETP ou IRP rastreável publicado ANTES** do edital, com lead time > 0. PASSA ≥ 50% · FALHA < 50%. Este é o teste da tese de antecipação no município — não a conversão do PCA. *Medir por estágio:* % de editais precedidos de DFD / de ETP / de IRP, e o lead time mediano de cada. Se só o edital aparece (município "pula" a esteira), G2 falha mesmo com PCA bom.
  - *Informacional ao lado de G2:* conversão PCA→edital (frio, contexto) e conversão DFD→edital (morno). Úteis para calibrar Iminência, mas **não reprovam** sozinhas.

**G3 — Cobertura do Dossiê.** % de campos do Dossiê (§6) preenchidos com dado público + fonte. PASSA > 80% · FALHA ≤ 80%. (PRD.)

**G4 — Matching de objeto.** Acerto do mapeamento item→célula→cliente. PASSA > 80% · FALHA ≤ 80%. (PRD, gate duro.)

**Medido mas NÃO reprova (informacional no F0):** antecedência média (dias, por estágio PCA/DFD/ETP); backfill < 10 min; n da amostra.

---

## 2. Matriz de veredito

| Cenário | G1 Granul. | G2 Esteira quente | G3 Dossiê | G4 Match | Veredito |
|---|---|---|---|---|---|
| **A — SEGUE** | ✅ | ✅ | ✅ | ✅ | **Antecipação confirmada.** Trava a célula, constrói F1 com promessa de antecipação. |
| **B — CONSERTA** | ✅ | ✅ | ❌/✅ | ❌ | Matching/cobertura é bug de engenharia, **não falha de tese.** Fica, corrige, remede a MESMA célula. Sem novas células até fechar >80%. |
| **C — DADO LIMPO** | ❌ **ou** ❌ | — | — | — | Matéria-prima rasa (granularidade **ou** esteira quente). **Não mata o produto** (§13): F1 embarca igual sobre dado limpo. **Derruba a promessa de antecipação**, ativa modo recompra/cobertura. |

**Assimetria que protege a decisão:**
- G4 (matching) ou G3 (dossiê) sozinhos falhando → **nunca é cenário C.** São as variáveis que código/cobertura consertam (cenário B).
- G1 (granularidade) ou G2 (esteira quente) falhando → **cenário C.** É matéria-prima; não conserta com esforço seu.
- **Conversão PCA→edital baixa, sozinha, não é veredito nenhum** — o PCA é frio por design (§7). Só pesa se a esteira quente (G2) também falhar.

---

## 3. Plano de ação por cenário

### A — Segue como antecipação
- Trava controle de pragas × São Luís como célula de referência.
- Constrói o Dossiê (§6) sobre esse recorte; promessa de antecipação **liberada** no copy.
- KPI que passa a valer: custo de backfill da célula ÷ nº de assinantes (KPI-chave da arquitetura sob demanda, §12).
- Só replica para a 2ª célula **depois** do 1º pagante validar o dado (gate F1).
- Antecedência: segue medindo por estágio rumo ao gate F2 ("antecedência comprovada").

### B — Conserta o matching/cobertura
- **Não toca no produto.** Diagnostica a causa: classificação CATMAT errada, geolocalização do órgão, ou associação célula→cliente?
- Se G3 falhou: a fonte tem o campo e o parser não pega, ou a fonte não tem o dado? (Se a fonte não tem → cuidado, pode escorregar para C.)
- Remede a mesma célula. Gate continua aberto até G4 > 80% e G3 > 80%.
- **Zero novas células** enquanto não fechar.

### C — Dado limpo (degradação graciosa, §13)
- O produto **não morre.** F1 sai sobre dado duro: contrato vencendo + histórico de vencedores + preço + concorrência.
- **Remove toda promessa de antecipação** do produto e do marketing (régua "probabilidade, nunca promessa").
- Índice de Iminência muda de motor: de "vai nascer" (predição via esteira) para "vai ser recomprado" (data de vencimento de contrato — dado duro).
- Mantém as 5 telas, a arquitetura de célula e o índice de Chance. Muda só a origem do Iminência.
- Fica fora do pós-edital da Effecti: continua sendo inteligência pré-decisão de compra, não operação de sessão.
- Roadmap: reativar antecipação plena conforme a esteira DFD→ETP→IRP amadurecer nas fontes (mais rica no federal que no municipal — §13).

---

## 4. O que colar aqui para o veredito

Os quatro gates + amostra:
1. **Granularidade (%)** — itens do PCA com descrição utilizável.
2. **Esteira quente (%)** — editais precedidos de ETP ou IRP rastreável, com lead time > 0. Quebrar por estágio: % com DFD / % com ETP / % com IRP, e lead time mediano de cada.
3. **Cobertura do Dossiê (%)** — campos preenchidos (vs. os campos do §6).
4. **Acerto do matching (%)**.
5. **n** — nº de editais/contratos da célula na amostra. **Abaixo de ~30–50, qualquer veredito é provisório** (ruído amostral).
6. *(informacional)* conversão PCA→edital e DFD→edital; antecedência mediana por estágio; tempo de backfill.

Com isso eu rodo a matriz §2 e devolvo: cenário + plano §3 + próximos comandos para o Ruflo.

---

## 5. Pendência de calibração (decisão sua antes de medir)

Confirmar ou trocar os dois pisos que **não vêm do PRD**:
- Granularidade ≥ **70%** ?
- Esteira quente (ETP/IRP pré-edital) ≥ **50%** ?

Travar agora evita mover a régua depois de ver o número. Matching e Dossiê (>80%) são do PRD e não se mexem. Conversão PCA→edital fica como métrica de contexto, sem piso.
