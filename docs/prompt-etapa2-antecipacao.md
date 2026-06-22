# PROMPT — ETAPA 2: ACENDER A ANTECIPAÇÃO (esteira de sinais pré-edital)

**Fonte de verdade:** `docs/00-PLANO-MESTRE-CONSTRUCAO.md`. **Régua:** `docs/REGUA-DE-EXECUCAO-E-AUTOTESTE.md`. **Use graphify.** Aditivo, sem push, IA só BYOK, suíte INTEIRA verde a cada entrega. Não interromper o backfill de 30d se ainda rodar.

## CONCEITO (importante — não é "PCA")
A **antecipação é QUALQUER sinal ANTES do edital** — não começa no PCA. Portas de entrada possíveis:
**PCA · DFD · ETP · TR · IRP · contrato em andamento prestes a vencer/renovar · compra recorrente · republicação/fracassada.**
**A ÚLTIMA etapa é o edital publicado.** O Sentinela mostra a oportunidade **se formando**, em qualquer estágio antes do edital, e o usuário vê **onde na esteira** ela está e **quanto falta** pro edital.

Modelo de dados: a `demand`/oportunidade é uma **máquina de estados** — `PCA → DFD → ETP → TR → IRP → (contrato vencendo) → EDITAL`. O edital é o **estado final**, não o início.

## TAREFA 1 — Esteira + pilar "Antecipação" no Radar
- O Radar passa a ter **2 pilares:** **Licitação do Dia** (editais abertos — já existe) e **Antecipação** (sinais pré-edital).
- Cada oportunidade de antecipação mostra: órgão, objeto, valor planejado/estimado, **o estágio na esteira** (stepper: PCA…→edital), a data prevista, e o selo do sinal.
- **Linguagem calibrada (régua #1):** "planejado / sinal de que vai virar edital" — probabilidade, **nunca promessa**.

## TAREFA 2 — Acender os sinais que JÁ TÊM dado
- **PCA (17k):** classificar por nicho (ilike + sinônimos vetor/dengue/endemias/dedetização/pragas; índice GIN trigram no texto do PCA, aditivo). Vira entrada da esteira.
- **Recorrência:** dos 43k homologados — órgão que compra o mesmo objeto todo ciclo → "compra recorrente, próxima janela ~X".
- Mostrar ambos no pilar Antecipação, cada um no seu estágio.

## TAREFA 3 — Coletar CONTRATO VENCENDO (o sinal forte que falta)
O Bione citou explicitamente: contrato em andamento prestes a vencer/renovar. É um dos sinais mais fortes (lição do F0). Hoje não temos (endpoint deu 400).
- **Sondar a variante correta** do endpoint PNCP de contratos (`/contratos`, `/contratos/atualizacao`, ou parâmetros distintos — registrar o probe num doc curto). Reusar o padrão do harvester nacional.
- Coletar metadado de contratos (`cnpjOrgao`, objeto, `dataVigenciaFim`, valor) — **Camada 2, metadado, upsert direto**, sem documento.
- Derivar o sinal **"contrato vencendo em X dias / renovação provável"** → entra na esteira como estágio pré-edital.
- Se o endpoint continuar bloqueado após o probe: registrar em BLOQUEIOS.md e seguir (PCA+recorrência já acendem a antecipação) — **não forjar**.

## TAREFA 4 — Linha do Tempo de Sinais (Dashboard / Sala de Guerra)
Mostrar os sinais reais ao longo da esteira: PCA publicado, contrato vencendo[T3], recorrência, republicação/fracassada. ETP/DFD/TR/IRP entram quando a fonte for coletada — **"em ingestão" na esteira, não forjado**.

## DoD — prova o RESULTADO + aceitação (nível antecipação)
- Buscar **"controle de vetores / dengue no Piauí"** no pilar **Antecipação** → retorna sinais pré-edital reais (PCA / recorrência / contrato vencendo) de órgãos do PI, **se existirem** (capacidade provada: busca funciona + dado do PI classificado). Vazio verdadeiro ≠ bug.
- O card mostra o **estágio na esteira** e que o edital ainda **não** saiu.
- Playwright + query Supabase + screenshot. Suíte INTEIRA verde. Console limpo. `graphify update`. Commit local (sem push).

## Honestidade
- **A antecipação combina vários sinais** (PCA + recorrência + contrato vencendo), porque um só (ex.: PCA municipal) é raro. Quanto mais sinais coletados, mais cedo se "chega antes".
- O que ainda não tem fonte (ETP/DFD/TR/IRP, participação) fica **na fila, na esteira, não congelado e não forjado**.

## NÃO fazer agora
- Não baixar documento (Camada 3 on-demand). Não construir preço/consultor/gerador (etapas seguintes). Não dar número de chance/probabilidade antes do backtesting.
