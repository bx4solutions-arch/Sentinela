# F0 — INVESTIGAÇÃO: o "Cenário C" foi falso negativo de ferramenta
### Célula: controle-de-pragas × São Luís/MA · Registro a pedido (revisão crítica do veredito)

## Provocação
"Existem milhares de editais/processos de controle de pragas no Brasil. 0 itens não fecha. Por que usou IBGE, se temos vários MCPs e o PNCP?"

## O que a evidência mostra (docs/f0-evidence/)
- `etapa_a_catser.json`: **23 editais** de controle de pragas em São Luís (12m, mod 6+8), **16 órgãos**. `catser_empirico = []`; **todos os 23 com `itens_classificacao = []`** → o dado do edital não traz código de catálogo.
- `etapa_b_pca.json`: rota = `"CATSER canônico 8531 (Serviço de Desinfecção e Exterminação)"`, endpoint `/v1/pca/?codigoClassificacaoSuperior=8531`. **109 PCAs nacionais** em 2025, **0 de São Luís** (varredura parcial 55/109, sem 2026).

## Diagnóstico — 3 falhas empilhadas
1. **Artefato errado.** Mediu **PCA** (planejamento), não a demanda real, que está nos **editais** (23 achados). Pouco PCA ≠ sem matéria-prima — o dado-limpo (edital+contrato+histórico) está farto.
2. **Código único e chutado.** `8531` não veio do dado (foi palpite "canônico"). Um só código → 109 nacionais. Dedetização é catalogada sob múltiplos códigos e muitos entes não publicam PCA granular. Universo minúsculo = código estreito/errado, não ausência de mercado.
3. **Fonte instável.** PNCP retornou 500/timeout recorrente (pool JDBC) + teto de 10/página. Varredura parcial sobre rota errada = veredito sem base.

## O IBGE foi o problema? NÃO.
`codigoMunicipioIbge=2111300` é o filtro correto para editais (achou os 23). O furo é caçar **PCA por código único chutado**, não o IBGE.

## Correção do veredito
- ❌ "Cenário C confirmado" — **inválido**. Falso negativo de ferramenta.
- ✅ **Matéria-prima dado-limpo: ABUNDANTE** (23 editais, 16 órgãos, recorrente). Produto roda sobre isso.
- ⚠️ **Antecipação-por-PCA: NÃO testada de forma válida.** Indeterminado — exige reteste correto.

## Como retestar certo (próximo F0)
1. **Confirmar o(s) código(s) CATSER/CATMAT canônicos** de dedetização no **catálogo** (não chutar; podem ser vários).
2. **Não caçar PCA por um código só.** Puxar o **PCA do órgão-alvo** (por CNPJ, via `/v1/pca/usuario` ou `/v1/pca/atualizacao` por data+cnpj) e casar itens por **descrição**, não por um código.
3. Para serviço pequeno/recorrente (dedetização), o sinal de antecipação tende a vir do **vencimento de contrato (recompra)** — mensurável a partir dos 23 editais/contratos — não do PCA granular.
4. **Grão certo:** célula = **ente × objeto** (não IBGE misturando 14 federais/estaduais + 2 municipais). Para testar antecipação de forma justa, usar **objeto de maior valor × ente que cataloga**.

## Conclusão
A demanda existe e é farta; o produto tem matéria-prima (dado-limpo) hoje. O que falhou foi a *medição* da antecipação — rota errada sobre fonte instável. Não generalizar "São Luís não tem PCA" para "a tese não funciona".
