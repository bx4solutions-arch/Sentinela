# Sentinela — Emendas parlamentares: enquadramento e copy (antes do Transferegov)

Decisão em aberto, levantada pelo Bione em 02/07/2026: "por que eu vou informar pra
um licitante que um deputado X mandou dinheiro pra prefeitura?" — pergunta certa,
e ela expõe que a tela **Raio-X do Órgão**, já construída, tem hoje uma falha real
de enquadramento, não hipotética. Este documento é o rascunho de copy pedido antes
de qualquer linha de código do harvester Transferegov.

## O problema concreto (não é teórico — está em produção)

Em `app/dashboard/raio-x/page.tsx`, o dado de exemplo (Seção 7 do PRD original) tem:

```
porta: "Secretário de Saúde + gabinete do deputado padrinho (autor da emenda)."

drivers.acesso: [
  ["Dinheiro novo", "Emenda R$1,5M — empenhada, não gasta"],
  ["Padrinho", "Dep. Z (autor da emenda)"],
  ["Timing eleitoral", "2º ano de mandato (favorável)"],
]
```

Isso faz duas coisas que a regra do projeto proíbe explicitamente ("Sentinela é
radar de antecipação de demanda, nunca máquina de influência sobre emendas"):

1. **Recomenda como estratégia de venda procurar o gabinete do deputado** — isso é
   sugerir ao cliente que ele vá fazer lobby político. Não é isso que uma govtech
   de compliance deveria vender.
2. **Usa "quem indicou o dinheiro" como componente de pontuação de "Acesso"** —
   trata proximidade política como se fosse uma vantagem competitiva mensurável e
   recomendável, e batiza isso de "padrinho".

Nenhum harvester de emenda deveria ser construído em cima desse desenho sem
corrigir isso primeiro — senão herdamos o problema, só que com dado real em vez
de exemplo.

## Princípio (não é novo, é a regra do projeto aplicada de verdade)

> A Sentinela nunca diz "para quem ligar" quando o "para quem" é um agente
> político. Ela diz **quanto dinheiro existe, para qual categoria, e até quando
> precisa ser gasto.** Autor da emenda é rodapé factual (dado público, já
> publicado no Transferegov), nunca cabeçalho, nunca vira um "para onde ir".

O valor real da emenda pro cliente não é "quem mandou" — é que ela **antecipa a
existência de um edital antes dele existir**, com prazo. Isso já é, sozinho, o
Raio-X funcionando.

## Reforma proposta nos 3 eixos do Raio-X

Hoje "Acesso" mistura duas coisas de natureza muito diferente: (a) acesso
institucional/procedimental real (documentação, barreiras de habilitação,
histórico de recompra) e (b) proximidade política. Proposta: **"Acesso" só fala
de (a).** Dado de emenda (valor, prazo, execução) muda de eixo — vai para
**Capacidade** (é dinheiro extra disponível) e **Apetite** (é sinal de que a
categoria do cliente está sendo priorizada agora).

### Antes (produção atual)

| Eixo | Driver | Valor |
|---|---|---|
| Acesso | Dinheiro novo | Emenda R$1,5M — empenhada, não gasta |
| Acesso | **Padrinho** | **Dep. Z (autor da emenda)** |
| Acesso | Timing eleitoral | 2º ano de mandato (favorável) |

Resumo executivo — trecho: *"...Há uma emenda de R$1,5M do Dep. Z carimbada para
a sua área, já empenhada e ainda não gasta."*

Porta de entrada: *"Secretário de Saúde + **gabinete do deputado padrinho**
(autor da emenda)."*

### Depois (proposto)

| Eixo | Driver | Valor |
|---|---|---|
| Capacidade | Reforço orçamentário via emenda | +R$1,5M carimbados para Saúde — empenhada, ainda não paga |
| Apetite | Prazo de execução da emenda | Vence em 5 meses — pressão real para o órgão publicar o edital |
| Apetite | Histórico de execução de emenda nesse órgão | 71% das emendas dos últimos 3 anos viraram contrato (não fica só empenhada) |

`Acesso` continua só com o que já era institucional de verdade: histórico de
recompra no PNCP, contrato vigente vencendo, exigências de habilitação do órgão.
**"Padrinho" e "timing eleitoral" saem do produto.**

Resumo executivo — reescrito: *"...A sua área (saúde) tem R$1,5M em emenda
parlamentar já empenhada e ainda não paga — o órgão tem 5 meses para executar ou
o recurso volta ao Tesouro, o que historicamente empurra a publicação do edital
para os próximos 60–90 dias."*

Porta de entrada — reescrita (só canal institucional, nunca político): *"Secretário
de Saúde — mesma secretaria que já comprou sua categoria 2x."*

### Onde o autor da emenda aparece (revisado em 02/07/2026 — direção do Bione)

Ajuste em cima da primeira proposta: o Bione confirmou que autor + partido
**precisam** aparecer, inclusive no card da home — não é dado a esconder, é
dado que o licitante precisa saber. O que muda não é a presença da informação,
é o **peso visual**: nunca título, nunca badge clicável, nunca link de ação —
sempre **frase em texto corrido, mesmo peso tipográfico do resto do parágrafo**,
descrevendo o fato (quem mandou, pra quê, quando), nunca virando um call-to-action
("fale com...", "aproveite...").

Card da home (`Alvo`), texto revisado:

```
Prefeitura de Cariacica — ES
A Prefeitura de Cariacica recebeu uma emenda de R$1,5M do Dep. Fulano de Tal
(Partido X), destinada à Saúde em março/2025 — já empenhada, vence em 4 meses.
```

Resumo executivo do Raio-X, texto revisado:

```
"...A sua área (saúde) tem R$1,5M em emenda parlamentar do Dep. Fulano de Tal
(Partido X), já empenhada e ainda não paga — o órgão tem 5 meses para executar
ou o recurso volta ao Tesouro, o que historicamente empurra a publicação do
edital para os próximos 60–90 dias."
```

Continua valendo, sem exceção:
- Nunca em card/badge separado, nunca com foto, nunca com link de contato do
  gabinete.
- Nunca em `drivers.acesso` como "Padrinho" (pontuação) — é frase narrativa no
  resumo/card, não um item de score.
- "Porta de entrada" continua só institucional ("Secretário de Saúde — mesma
  secretaria que já comprou sua categoria 2x") — autor da emenda não é "pra
  quem ligar", é contexto de por que o dinheiro existe.

## O que o produto nunca vai ter (lista negativa, para não reabrir a discussão depois)

- Busca ou filtro de órgãos/editais por deputado, senador ou partido.
- Ranking de "proximidade política" ou "força do padrinho".
- Qualquer copy do tipo "fale com o gabinete de...", "aproveite a relação com...",
  "fortaleça o vínculo com...".
- "Timing eleitoral" como sinal de oportunidade (ano de mandato favorável/desfavorável).
- Card, badge, foto ou link de contato para o nome do parlamentar — o nome e
  partido aparecem, mas sempre como texto corrido dentro da frase, nunca como
  elemento visual separado ou clicável.

## O que passa a existir de verdade (o valor comercial fica maior, não menor)

- **Contagem regressiva de execução**: emendas têm prazo legal de empenho/pagamento
  — vira um "vence em X meses" mensurável, mais forte como gatilho de venda do que
  qualquer informação política.
- **Taxa de conversão histórica**: cruzar emendas de anos anteriores com o que
  realmente virou licitação nesse órgão. Isso é dado que nenhum concorrente
  brasileiro está mostrando hoje, e é 100% defensável (é sobre confiabilidade do
  dinheiro, não sobre política).
- **Reforço orçamentário como insumo do score_apetite** (`orgaos_score` já tem o
  campo): emenda vira só mais um número que aumenta a nota da categoria do cliente
  naquele órgão.

## Onde a emenda aparece primeiro: "Alvos Quentes da Semana" (proposta do Bione, 02/07/2026)

Ideia do Bione: em vez (ou antes) de aparecer só dentro do Raio-X sob demanda,
o dado de emenda vira **notícia** no widget que já existe na Página Inicial —
`app/dashboard/page.tsx`, componente `Alvo` dentro do card "Alvos Quentes da
Semana". Esse widget **já está construído e já está em produção** (hoje com 3
exemplos fixos: Cariacica, Linhares, SESA-ES) — não é tela nova, é a mesma
"MODELO ANTES DA TELA" já aprovada sendo alimentada com dado real. Card clicado
→ abre o Raio-X completo do órgão (`Ver Raio-X →`, já existe como link).

**Por que essa ideia é boa, não só possível:** resolve o problema de enquadramento
melhor do que só corrigir a tela do Raio-X. Um Raio-X é algo que o cliente pede
("me dá inteligência sobre esse órgão"). Uma notícia empurrada na tela inicial
tem que se justificar sozinha, sem o cliente ter perguntado — isso obriga a
copy a ser 100% sobre **fato de mercado** (dinheiro, prazo, categoria), porque
não tem como emendar um "puxa esse gabinete aí" numa notícia. É a própria forma
do produto reforçando a regra do projeto, não só a redação.

### Copy proposta para o card (mesmo shape do componente `Alvo` já existente)

```
cor:     verde (score final ≥ 66, mesma regra do semáforo do Raio-X)
orgao:   "Prefeitura de Cariacica — ES"
texto:   Emenda de R$1,5M empenhada para [categoria do cliente] —
         vence em 4 meses. Órgão já comprou a categoria 2x este ano.
scores:  ["Cap 82", "Ape 74", "Ace 68"]   (eixos já reformados acima)
link:    "Ver Raio-X →"  (mesmo destino de hoje — abre o Raio-X completo,
         onde o rodapé factual "Fonte: Emenda RP-6 nº.../autor: Dep. Fulano"
         aparece, nunca no card da home)
```

Nenhum nome de parlamentar, partido ou "gabinete" entra no card da home — nem
como texto, nem como badge, nem no link. Isso é ainda mais rígido do que a
regra já definida pro Raio-X, porque a home é a superfície mais visível do
produto.

### Critério de seleção (evita virar curadoria manual ou lista aleatória)

Card só é gerado quando TODAS as condições batem:
1. Emenda com status "empenhada, não paga" no Transferegov;
2. Prazo de execução restante ≤ 90 dias (o que gera a urgência real do "vence em X");
3. Função/subfunção orçamentária da emenda casa com a categoria do cliente
   (mesma lógica de matching que já alimenta `orgao_score.score_apetite` —
   **precisa confirmar que esse matching por categoria já existe antes de
   prometer a feature; se não existir, é pré-requisito, não parte do harvester**);
4. Ranqueado por valor × urgência, top 3–5 por cliente, atualizado 1x/semana
   (bate com o rótulo "da Semana" que já está na tela — não precisa ser
   near-realtime, é dado bimestral/trimestral por natureza).

### Trade-off a registrar

Empurrar isso pra home aumenta a exposição do dado — qualquer erro de
enquadramento nesse card é visto sem o cliente pedir, ao contrário do Raio-X
(tela que ele busca ativamente). Justifica ser ainda mais conservador na copy
do card do que no Raio-X, e reforça por que nenhuma linha de harvester deveria
sair antes de aprovação — inclusive desta seção.

## Monitoramento das etapas da emenda — onde estão os endpoints reais

Pergunta do Bione: em qual etapa dá pra monitorar a emenda (quando o Ministério
manda, quando paga)? Confirmado por pesquisa em 02/07/2026 — existem **duas
fontes complementares**, não uma só:

### Fonte principal: API Emendas Parlamentares — Portal da Transparência (CGU)

`https://api.portaldatransparencia.gov.br/api-de-dados` — precisa de token
gratuito (cadastro por e-mail), header `chave-api-dados`. Limite: 90 req/min
(6h–24h) / 300 req/min (0h–6h). Duas rotas relevantes:

**`/emendas`** (lista, filtra por `ano`, `codigoMunicipio` [código IBGE — o
mesmo campo que já usamos no SICONFI e no PNCP, reaproveita `garantirEnteCanonico()`],
`codigoUF`, `nomeAutor`, `codigoFuncao`). Cada emenda retorna, **as 4 etapas
oficiais de execução orçamentária brasileira**, em R$ acumulado:

```
valorEmpenhado       → Empenho: o Ministério/órgão federal reservou o dinheiro
valorLiquidado        → Liquidação: comprovada a entrega do bem/serviço
valorPago              → Pagamento: dinheiro efetivamente transferido
valorRestoInscrito     → Empenhado mas não pago no ano — virou "resto a pagar"
valorRestoPago          → Resto a pagar que foi pago depois
valorRestoCancelado    → Resto a pagar que caducou (nunca foi executado)
```

Isso já é o suficiente pra alimentar a regra de negócio que criamos acima
("empenhada, não paga" = gatilho de card): basta `valorEmpenhado > valorPago`.
Também dá `orgaoExecutor` (o órgão que efetivamente processa — nem sempre é a
prefeitura direto, pode ser um ministério fazendo o repasse) e
`programaGovernamental`/`acao` (cruza com a categoria/função do cliente).

**`/emendas/documentos/{codigo}`** — granular: devolve os documentos
individuais de despesa (cada empenho/liquidação/pagamento específico, com
data). É essa rota que permite "monitorar" de verdade — não só o total
acumulado, mas quando cada evento aconteceu, o que dá o dado pra "emenda
empenhada há X dias, sem movimento há Y dias" (sinal de atraso/risco, útil
tanto pro Raio-X quanto pra decidir se um card ainda é "quente").

### Fonte complementar: Transferegov — módulo Transferências Especiais (EC 105/2019)

`https://docs.api.transferegov.gestao.gov.br/transferenciasespeciais/` (API
estilo PostgREST). Relevante só para emendas do tipo **"Pix"** (transferência
especial direta, sem plano de trabalho prévio) — o dinheiro cai direto na
conta do município ao ser empenhado, e o Transferegov é onde o **município**
presta contas depois (objeto, plano de aplicação, extrato bancário). Não serve
pra saber "quando o Ministério manda" (isso é a CGU acima) — serve pra saber
se o **município já prestou contas** do que recebeu, o que é um proxy indireto
de execução real no território (mais forte que só "pago" na CGU, porque prova
que o dinheiro virou objeto de fato, não só transferência).

**Importante para o desenho do harvester:** nem toda emenda passa pelo
Transferegov. Emendas de saúde tipicamente vão por **Fundo a Fundo** (Fundo
Nacional de Saúde, fora do Transferegov e fora do escopo desta pesquisa — API
separada, ainda não investigada) e emendas via convênio/termo de fomento têm
seu próprio ciclo dentro do Transferegov "clássico" (não o módulo de
transferências especiais). **Decisão para o harvester:** começar só pela API
CGU (`/emendas` + `/emendas/documentos`) — é a fonte única que cobre todos os
tipos de emenda com o dado que já basta pro produto (valor, prazo, categoria,
autor); Transferegov/Fundo a Fundo entram como enriquecimento futuro, não
bloqueiam o MVP.

## Decisão em aberto — agente agêntico e "atrair grandes empresários que mexem com política" (02/07/2026)

O Bione aprovou a copy e pediu execução (harvester construído — ver seção
abaixo). Mas também trouxe uma direção nova que precisa ficar registrada
separadamente, porque tensiona com a regra do próprio projeto:

> "...uma das coisas que eu quero é atrair grandes empresários que mexem com
> política. Então ele tem que ligar pra várias pessoas pra saber se o deputado
> tem ou não tem emenda, quanto é que ele tem de emenda, pra onde ele está
> destinando..."

Isso descreve um caso de uso — buscar/consultar por deputado, "quanto ele tem
de emenda disponível", como ferramenta de prospecção de negócio político — que
é literalmente o que a lista negativa deste documento (seção acima) e a regra
do projeto ("Sentinela é radar de ANTECIPAÇÃO DE DEMANDA pública, nunca
máquina de influência sobre emendas") foram escritas pra excluir.

**Isso não bloqueia o trabalho de hoje.** A infraestrutura de dado (harvester,
schema, API real da CGU) é neutra — ela precisa existir de qualquer jeito pro
Raio-X funcionar, e guardar `autor_nome`/`autor_codigo` no banco não é, sozinho,
o problema. O problema é *que produto* é construído em cima disso: um
copiloto que cita a emenda como contexto de demanda (o que já está desenhado)
é uma coisa; um agente com capacidade de busca "por deputado" pra prospecção
comercial de proximidade política é outra — e essa segunda coisa contradiz a
própria positioning jurídica que dá credibilidade à Sentinela como govtech de
compliance.

**Recomendação, registrada aqui pra decisão consciente antes da próxima fase
("vamos chegar lá", nas palavras do Bione):** manter os dois casos de uso
separados, não misturar no mesmo produto/marca:
1. **Sentinela (produto vendido ao licitante):** agente fica dentro dos limites
   já definidos — cita emenda como contexto de demanda, nunca busca por
   parlamentar, nunca vira ferramenta de prospecção política.
2. **Uso interno BX4 (se o Bione quiser essa inteligência pra prospecção
   própria):** ferramenta separada, não embutida no chat que o cliente da
   Sentinela usa, sem branding Sentinela — porque o risco jurídico/reputacional
   (parecer facilitação de tráfico de influência, ou pelo menos parecer isso
   pra imprensa/concorrência) recai sobre a marca que a pessoa vir associada
   à ferramenta.

Nenhuma ação tomada sobre essa parte ainda — fica registrado como ponto a
decidir explicitamente antes de construir o agente agêntico.

## O que já foi construído (02/07/2026)

Dado que a copy foi aprovada, a infraestrutura de dado já foi executada:

- **Schema:** `public.emendas` redesenhado pro formato real da API CGU
  (`codigo_emenda` único, `autor_nome`, `autor_codigo`, `autor_partido`
  [NULL — CGU não devolve partido, precisa de cruzamento futuro com API da
  Câmara/Senado por `codigo_autor`], `funcao`/`subfuncao`, `orgao_executor`,
  `programa_governamental`, e os 6 valores reais: `valor_empenhado`,
  `valor_liquidado`, `valor_pago`, `valor_resto_inscrito`, `valor_resto_pago`,
  `valor_resto_cancelado`). Substituiu o schema placeholder antigo
  (`autor_deputado`/`valor`/`area`/`estagio`), que não tinha granularidade
  suficiente pra regra "empenhada, não paga".
- **Edge Function `emendas-harvester`** (deployada, v1): consome
  `api.portaldatransparencia.gov.br/api-de-dados/emendas`, escopado pelos
  mesmos `codigo_municipio_ibge` do `harvester_config` (reaproveita o mesmo
  recorte piloto). `garantirEnteMinimo()` coopera com o `garantirEnteCanonico()`
  do siconfi-harvester na mesma linha de `orgaos` (quem chegar primeiro cria
  um stub, SICONFI sempre enriquece por cima — sem repetir o bug de conflação
  já corrigido).
- **Bloqueador real, testado e confirmado:** a API da CGU exige token
  gratuito (`chave-api-dados`), diferente de PNCP/SICONFI que são abertos. A
  função já foi invocada de verdade — sem o secret `PORTAL_TRANSPARENCIA_TOKEN`
  configurado, ela **parou sozinha e registrou um incidente crítico** em
  `alertas_integracao` com o passo a passo exato (cadastrar e-mail em
  portaldatransparencia.gov.br/api-de-dados/cadastrar-email → configurar o
  secret) — comportamento correto, nunca fabricou dado. Falta o Bione
  cadastrar o token e configurar o secret pra rodar a prova real (mesmo
  padrão de prova aplicado a PNCP e SICONFI).

## Fora de escopo agora

Nenhuma linha de harvester Transferegov entra em produção até este documento ser
aprovado pelo Bione. Depois de aprovado: harvester primeiro (mesmo padrão de
`garantirEnteCanonico()` já validado no SICONFI), tela depois — igual fizemos com
PNCP e SICONFI. A alimentação do card "Alvos Quentes da Semana" com dado real
de emenda entra na mesma fase de "tela depois" (é o mesmo componente já
existente, só troca mock por dado real — não é build de UI nova).
