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
| Conversão PCA→edital (12m) | **≥ 40%** (proposto) | **Calibração nossa** — PRD manda medir, não fixa piso | Idem. Estabilidade importa tanto quanto o nível. |
| Antecedência média | **medir e registrar** | **PRD §12** ("medida e crescente por estágio") | **NÃO é gate do F0.** É gate do F2. |

> Regra de ouro da leitura: **matching e dossiê são correção de engenharia/cobertura; granularidade e conversão são matéria-prima.** A primeira você conserta. A segunda você não conserta com esforço — ela define se a tese de antecipação existe nesta célula.

---

## 1. Os cortes binários do F0

**G1 — Granularidade do PCA.** % de itens do PCA com descrição utilizável (item + CATMAT/CATSER + valor estimado + janela). PASSA ≥ 70% · FALHA < 70%. Abaixo disso o PCA é "serviços diversos" e não mapeia célula.

**G2 — Conversão PCA→edital (janela 12m).** % de itens do PCA que viram edital. PASSA ≥ 40% · FALHA < 40%. Abaixo, o sinal vira promessa não cumprível — viola o Princípio "probabilidade, nunca promessa". *Medir também a estabilidade: 40% errático é pior que 40% previsível.*

**G3 — Cobertura do Dossiê.** % de campos do Dossiê (§6) preenchidos com dado público + fonte. PASSA > 80% · FALHA ≤ 80%. (PRD.)

**G4 — Matching de objeto.** Acerto do mapeamento item→célula→cliente. PASSA > 80% · FALHA ≤ 80%. (PRD, gate duro.)

**Medido mas NÃO reprova (informacional no F0):** antecedência média (dias, por estágio PCA/DFD/ETP); backfill < 10 min; n da amostra.

---

## 2. Matriz de veredito

| Cenário | G1 Granul. | G2 Conv. | G3 Dossiê | G4 Match | Veredito |
|---|---|---|---|---|---|
| **A — SEGUE** | ✅ | ✅ | ✅ | ✅ | **Antecipação confirmada.** Trava a célula, constrói F1 com promessa de antecipação. |
| **B — CONSERTA** | ✅ | ✅ | ❌/✅ | ❌ | Matching/cobertura é bug de engenharia, **não falha de tese.** Fica, corrige, remede a MESMA célula. Sem novas células até fechar >80%. |
| **C — DADO LIMPO** | ❌ **ou** ❌ | — | — | — | Matéria-prima rasa. **Não mata o produto** (§13): F1 embarca igual sobre dado limpo. **Derruba a promessa de antecipação**, ativa modo recompra/cobertura. |

**Assimetria que protege a decisão:**
- G4 (matching) ou G3 (dossiê) sozinhos falhando → **nunca é cenário C.** São as variáveis que código/cobertura consertam (cenário B).
- G1 (granularidade) ou G2 (conversão) falhando → **cenário C.** É matéria-prima; não conserta com esforço seu.

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

Os quatro medidos + amostra:
1. **Granularidade (%)** — itens com descrição utilizável.
2. **Conversão PCA→edital (%)** + nota de estabilidade (concentrada num órgão? sazonal?).
3. **Cobertura do Dossiê (%)** — campos preenchidos.
4. **Acerto do matching (%)**.
5. **n** — nº de itens do PCA na amostra do backfill. **Abaixo de ~30–50, qualquer veredito é provisório** (ruído amostral).
6. *(informacional)* antecedência mediana por estágio; tempo de backfill.

Com isso eu rodo a matriz §2 e devolvo: cenário + plano §3 + próximos comandos para o Ruflo.

---

## 5. Pendência de calibração (decisão sua antes de medir)

Confirmar ou trocar os dois pisos que **não vêm do PRD**:
- Granularidade ≥ **70%** ?
- Conversão PCA→edital ≥ **40%** ?

Travar agora evita mover a régua depois de ver o número. Matching e Dossiê (>80%) são do PRD e não se mexem.
