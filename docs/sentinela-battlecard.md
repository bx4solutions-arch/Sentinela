# SENTINELA — QUADRO DE CONCORRENTES E FERRAMENTAS
### Battlecard · quem faz o quê, links, código aberto, e o buraco que o Sentinela ocupa

## A. Plataformas comerciais (SaaS — sem código aberto)

| Nome | O que faz | Onde atua | Link | Força | Buraco (o que NÃO faz) |
|---|---|---|---|---|---|
| **Effecti** (Grupo Nuvini) | Busca de editais + proposta + **robô de lances** + monitor de chat + IA de análise de edital | Pós-edital + sessão | effecti.com.br | Escala (3.000+ clientes), capital de bolsa, marca | Pré-edital como **produto** (só tem conteúdo educativo sobre PCA) |
| **ConLicitação** | Monitoramento e alertas de editais de milhares de fontes | Pós-edital | conlicitacao.com.br | Cobertura de fontes (o mais antigo) | IA, antecipação, prontidão |
| **Portal de Compras Públicas** | Marketplace + plataforma de pregão (operacional) | Edital/sessão | portaldecompraspublicas.com.br | É portal oficial integrado ao PNCP | Inteligência de fornecedor |
| **Banco de Preços** (NP) | Pesquisa e formação de preços | Lado comprador / fase interna | bancodeprecos.com.br | Base de preços | Não é p/ fornecedor antecipar |
| **EditalPro** | IA: scoring de aderência, alertas WhatsApp, proposta em 30s | Pós-edital | editalpro.com.br | Velocidade, WhatsApp | Pré-edital, prontidão estruturada |
| **LicitaIA** | "All-in-one" com IA, monitora até 150 licitações, chat/convocação | Pós-edital + sessão | licitaia.app | Cobertura operacional | Antecipação |
| **Forseti / LIA** (eLicitação) | IA "LIA" — lançamento início **2026** | Pós-edital (a confirmar) | elicitacao.com.br | Entrante a vigiar | — (ainda não lançado) |
| **licitar.digital** | IA "para vencer licitações" + conteúdo PCA | Pós-edital | licitar.digital | Conteúdo/SEO | Pré-edital como produto |
| **StartGi** | IA p/ licitações e planejamento | Misto | startgi.com.br | Toca planejamento | — (verificar profundidade) |

## B. Plataforma com GitHub público, mas PROPRIETÁRIA (não usável)

| Nome | O que faz | Link | GitHub | Licença |
|---|---|---|---|---|
| **SmartLic** (tjsasakifln) | Ingestão PNCP+ComprasGov+PCP → DataLake (3,5M registros) + classificação setorial keyword+LLM + score + alertas + billing | smartlic.tech | github.com/tjsasakifln/SmartLic | **Proprietária — código fechado** |

## C. Ferramentas open-source (código usável)

| Nome | O que faz | GitHub | Licença | Utilidade p/ nós |
|---|---|---|---|---|
| **powerandcontrol/PNCP** | Coletor paginado da API PNCP → JSON/Excel | github.com/powerandcontrol/PNCP | verificar | Confirma nossa abordagem; abaixo do nosso harvester |
| **thiagosy/PNCP** | Pregão por UF/data + filtro keyword → Excel | github.com/thiagosy/PNCP | verificar | Referência de filtro; básico |
| **tjsasakifln/AEC-Tenders** | Nó n8n: monitora PNCP → alertas Slack/WhatsApp/Sheets | github.com/tjsasakifln/AEC-Tenders | verificar | Padrão de alerta (mas no-code, dependência) |
| **leopiccionia/LicitaSP** | Scrapy crawler de portais de SP → MongoDB | github.com/leopiccionia/LicitaSP | verificar | Caminho de scraping de portais (a dispersão que cortamos) |
| **codevance/python-comprasnet** | Lib de scraping do Comprasnet | github.com/codevance/python-comprasnet | verificar | Fragil; redundante com PNCP |
| **RodrigoRMarinho/LanceBot** | **Robô de lance automático** (ver §LanceBot) | github.com/RodrigoRMarinho/LanceBot | **MIT** | ⚠️ régua #3 + risco legal — ver abaixo |

---

## SmartLic — análise detalhada (o concorrente mais próximo)

- **Produção** (smartlic.tech), v0.5, trials pagos, billing Stripe ao vivo. Fundador solo (Tiago Sasaki / CONFENGE).
- **Stack:** FastAPI (187 endpoints) + Next.js 16 + Supabase PostgreSQL 17 + Redis + ARQ + GPT-4.1-nano. 5.131 testes backend.
- **Dados:** ingere **PNCP + ComprasGov + PCP v2**; DataLake com **3,5M registros** (1,5M editais + 2M contratos); ETL diário **27 UFs × 6 modalidades (~10 mil editais/dia)**.
- **Inteligência:** classificação em **20 setores** (keyword + LLM), score de viabilidade (4 fatores), busca full-text PT, 10k+ páginas SEO.
- **Preço:** Pro R$397/mês · **Consultoria R$997/mês** — idêntico à sua tese.
- **Onde ele é forte:** classificar e achar **editais já publicados** com IA, em escala, bem feito.
- **O buraco (seu gap):** pelo material público, **não faz monitoramento pré-edital** (PCA/DFD/ETP/esteira) nem prontidão documental. É um "Effecti com IA" — pós-publicação.
- **Veredito:** não brigue com ele em classificação de edital publicado (3,5M registros, 5 mil testes). Ganhe no **pré-edital + prontidão + recompra + vertical + ponte MeuJurídico**.

---

## LanceBot — o robô de participação (atenção especial pedida)

**O que é, em detalhe:** open-source **MIT** (código usável/forkável), Python + Playwright, roda no MacOS.
- Login por usuário/senha **ou certificado A1/A3**.
- Participa de **pregões (aberto, aberto/fechado) e dispensas**, dá **lance automático em milissegundos**, várias licitações simultâneas, estratégia de empate (R$0,01 / 0,1%), lê chat/ranking/mensagens.
- **Portais:** ComprasNet, Portal de Compras Públicas, BLL, Licitações-e.
- **Estado real:** **protótipo.** O roadmap mostra core+portais+testes feitos, mas **"suporte a certificado digital" e "lançamento Beta" ainda pendentes**. Projeto comunitário, sem fins lucrativos.

**Por que ele te interessa (legítimo):** robô de lance é feature de alto valor e monetizável (é o coração pago da Effecti). "Do sinal ao lance vencedor" fecha o ciclo comercial.

**Por que o PRD cortou — e por que eu mantenho o alerta (sem dourar):**
1. **Régua #3 / estratégico:** é o **terreno-núcleo da Effecti** (capitalizada, 3.000 clientes). Entrar aqui te tira da sua categoria diferenciada (pré-edital) e te joga na **guerra comoditizada** onde o incumbente domina.
2. **Risco legal/ToS (o mais sério):** automação de lance em portal de governo é **zona cinzenta de conformidade** — vários portais restringem/proíbem bots; há regras de integridade do pregão; risco de **banimento de conta** e de questionamento de lisura. Suas próprias réguas (CLAUDE.md) priorizam **evitar risco legal**. Esta é, isolada, a feature de **maior risco jurídico** de todo o setor.
3. **Risco operacional:** lance errado/atrasado = **dinheiro e exposição legal do CLIENTE**. Exige confiabilidade altíssima; o LanceBot está em protótipo (sem cert, sem beta).
4. **Risco de marca:** o DNA do Sentinela é "inteligência antecipada, dado público, probabilidade nunca promessa". Robô de lance é operação ao vivo — DNA oposto, e suja a muralha com o MeuJurídico.

**Recomendação honesta:** se você quer mesmo o robô, **não o cole no Sentinela.** Trate como **decisão estratégica explícita** (reabrir a régua #3), e se for, faça como **produto/marca separada, em fase tardia, com parecer jurídico ANTES** — não como item casual do roadmap do Sentinela. A base MIT existe, mas o problema nunca foi o código: é o passivo legal e o desvio de categoria.

---

## Síntese
- **Pós-edital + classificação de edital:** lotado e bom (SmartLic, Effecti, EditalPro, LicitaIA…). **Não brigue de frente.**
- **Pré-edital como produto:** **vazio.** Todos falam de PCA como dica; ninguém entrega automatizado. É a sua categoria.
- **Robô de lance:** existe, é usável (MIT), mas é **régua #3 + maior risco legal do setor.** Só com decisão consciente e jurídico na frente.
- **Seu moat:** antecipação (sinais que funcionam: IRP, recompra, recorrência) + **prontidão** + verticalização + ponte com o lado comprador. Não a novidade da ideia (não é secreta) — a **entrega bem-feita do que ninguém entregou.**
