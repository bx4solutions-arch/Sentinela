# F0 — Relatório de veredito · controle-de-pragas × São Luís/MA

- Município IBGE: 2111300 · Endpoint: PNCP Consulta API `/api/consulta/v1`
- Anos PCA: [2025, 2026] · Rota PCA: CATSER canônico 8531 (Serviço de Desinfecção e Exterminação) + filtro CNPJ São Luís
- Fonte dos editais: A (seed 12m, mod 6+8) — Etapa C não executada
- **n**: itens-PCA célula = **0** · editais célula = **23** · contratos célula = **0**

## Gates

| Gate | Métrica | Valor | Piso | Status |
|---|---|---|---|---|
| G1 granularidade | itens-PCA com 4 campos | 0/0 | ≥70% | 🔴 s/ dado |
| G2 conversão PCA→edital | itens-PCA com edital casado | 0/0 | ≥50% | 🔴 s/ dado |
| G3 dossiê (escopo PNCP) | campos PNCP preenchíveis | 3/7 (42.9%) | >80% | 🔴 |
| G4 matching | precisão/recall vs gold set | PENDENTE (rotulagem humana cega) | >80% | ⏸️ |

## Informacionais

- **Lead-time de sinal** (pub-PCA → pub-edital), mediano: s/ par dias — *a antecedência que vende*.
- **Horizonte de planejamento** (dataDesejada → edital): exige par casado com dataDesejada preenchida; ver `f0_pares_pca_edital.csv`.
- Pares PCA→edital casados: **0** · confiança média do casamento: **None** (ver CSV para spot-check).

## G3 — campos do Dossiê

**Deriváveis do PNCP (contam no gate):**
- 🔴 `esteira_PCA` — B: presença/itens-PCA da célula
- 🔴 `incumbente_historico` — C-contratos: fornecedor + valorGlobal + vigência
- 🟢 `preco_estimado` — B/C: valorTotal / valorTotalEstimado
- 🔴 `preco_homologado` — C-editais: valorTotalHomologado
- 🔴 `concorrencia_resultado` — C-editais: existeResultado/situacao
- 🟢 `orgao_recorrencia` — B+C: repetição por cnpjOrgao/unidade
- 🟢 `objeto_janela` — B: dataDesejada / C: dataPublicacaoPncp

**Pendente de enriquecimento (fora do F0 — NÃO contam como falha):**
- ⏳ `decisores_agente_contratacao` — fora do F0 — diários oficiais
- ⏳ `capacidade_pagamento_orgao` — fora do F0 — Siconfi
- ⏳ `faixa_lances_concorrentes` — parcial — exige atas de lances (F1+)
- ⏳ `sancoes_fornecedor` — fora do F0 — CEIS/Transparência

## G4 — nota de método

Gold set gerado em `f0_gold_set.csv` com a coluna CATSER **oculta até a rotulagem**. A rotulagem deve ser feita por leitura do objeto (cego ao código); só então se mede a concordância da classificação por CATSER. Auto-certificar 80% sem rotulagem humana seria vazamento — por isso G4 fica **PENDENTE**.

## Veredito (corrigido) — NÃO é "Cenário C confirmado"

O "Cenário C" anterior foi **falso negativo de ferramenta**. Detalhe em
[`f0-investigacao-falso-negativo.md`](f0-investigacao-falso-negativo.md). Posição correta:

- ✅ **Matéria-prima dado-limpo: ABUNDANTE.** 23 editais de controle de pragas em São Luís,
  16 órgãos, demanda recorrente. O produto roda sobre isso **hoje**.
- ⚠️ **Antecipação-por-PCA: NÃO testada de forma válida → INDETERMINADO.** A medição usou
  rota errada e não pode concluir nem a favor nem contra.

**Por que o teste de antecipação foi inválido (3 falhas empilhadas):**
1. **Artefato errado.** Mediu **PCA** (planejamento), não a demanda real, que está nos
   **editais** (23 achados). Pouco PCA ≠ sem matéria-prima.
2. **Código único e chutado.** `8531` foi palpite "canônico", não veio do dado — e a
   dedetização é catalogada sob múltiplos códigos; universo nacional minúsculo (109+169)
   = código estreito, não ausência de mercado.
3. **Fonte instável.** PNCP com 500/timeout recorrente (pool JDBC) + teto de 10/página;
   varredura parcial (55/109 de 2025, sem 2026) sobre rota errada = sem base para veredito.

**O IBGE NÃO foi o problema:** `codigoMunicipioIbge=2111300` achou os 23 editais corretamente.
O furo foi caçar **PCA por um código único chutado**.

**Como retestar certo:** confirmar os CATSER/CATMAT canônicos no catálogo (podem ser vários);
puxar o **PCA do órgão-alvo** por CNPJ e casar por **descrição** (não por um código); e para
serviço recorrente como dedetização, medir antecipação pelo **vencimento de contrato
(recompra)** a partir dos editais/contratos. Grão justo = **ente × objeto** (não IBGE
misturando 14 federais/estaduais + 2 municipais).

> ⚠️ Coleta encerrada a pedido. As métricas de PCA (G1/G2) acima ficam **🔴 s/ dado = não
> testado validamente**, não "reprovado".
