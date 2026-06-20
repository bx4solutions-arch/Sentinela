# ESTUDO — Por que não puxamos a esteira, e o que fazer
### Levantamento de fontes de dados pré-edital · resposta direta a "qual o problema do PNCP e como resolver"

## As duas perguntas (são diferentes)
1. **Por que o PNCP "limita" / cai?** → problema de **ferramenta**. Tem conserto direto.
2. **Por que não conseguimos a esteira (PCA→DFD→ETP→TR→edital)?** → problema de **realidade de publicação**. Conserto parcial, e exige honestidade.

---

## Problema 1 — o PNCP (ferramenta) · CONSERTÁVEL

O PNCP tem **duas portas**, e a gente vinha batendo na errada:

- **API de Consulta** (`/api/consulta/v1`) — é **rate-limited e instável**. Os 500/timeout que travaram tudo são *throttling* + backend sobrecarregado. Não foi feita para varredura pesada; foi feita para consultas pontuais.
- **PNCP Dados Abertos** (`gov.br/pncp/dados-abertos`) — **dumps em massa**, estáveis, sem rate-limit. É de onde se puxa volume.

**O conserto:** trocar a espinha de ingestão da API ao vivo para os **Dados Abertos** (baixar o recorte inteiro — PCA, contratações, atas, contratos, documentos — para o nosso banco), e usar a API de Consulta só para o **delta incremental** (com backoff). Isso elimina o "está tudo podre / não puxa". Não é que não dá pra puxar — é que estávamos puxando pela porta de serviço, não pela porta de carga.

---

## Problema 2 — a esteira (realidade) · A VERDADE DURA

Aqui não é ferramenta. A Lei 14.133 **manda publicar** DFD/ETP/TR no PNCP — **mas "após a aprovação do processo"**. Ou seja: boa parte dos documentos preparatórios vai ao ar **junto com o edital**, não nos meses em que estão sendo preparados.

Tradução por documento — o que é **cedo** (dá antecipação) vs **tarde** (sai com o edital):

| Sinal | Quando fica público | Antecipação real |
|---|---|---|
| **PCA** | cedo (plano anual) | sim — mas esparso/sem catálogo no município (F0 provou) |
| **IRP** (intenção de registro de preços) | cedo (consulta pública aberta) | **sim, forte** — sinal público antes do edital ★ |
| **Dispensa/compra recorrente** | histórico | **sim** (deriva o ciclo: "compra a cada ~12m") ★ |
| **Aviso de contratação direta** | cedo-ish | sim, parcial |
| **ETP / TR** | **muitas vezes com o edital** | inconsistente — mais cedo no federal, tarde no município |
| **DFD** | em geral interno; publicado tarde ou não | fraco como sinal público |
| Contrato vencendo | histórico | recompra — secundário ("do pacote") |

**Conclusão honesta:** o sonho "ver toda licitação 6 meses antes pelo DFD/ETP" **não é entregável de forma uniforme** — porque muito desse documento só fica público no fim. Não é falha de engenharia; é como os órgãos publicam. O que É cedo e confiável: **IRP + PCA (onde existe) + recorrência + ETP/TR onde o órgão publica cedo.** Esse é o conjunto real de antecipação.

---

## Como o concorrente "puxa de tudo quanto é lugar"

A Effecti diz cobrir **1.400 portais** — mas é **pós-edital**: editais já publicados, que (desde 2021) estão centralizados no PNCP + Comprasnet + portais legados. Eles puxam o que é **fácil e tarde** (edital publicado). **Eles NÃO têm a esteira pré-edital** — esse é o gap que justifica o Sentinela. Mas é gap porque é *difícil*, não porque ninguém viu. O nosso problema nunca foi "não conseguir puxar edital" (o F0 achou 23 fácil) — foi puxar pela API frágil e medir o sinal errado.

---

## O conjunto mínimo viável de antecipação (o que o produto promete)

Ingerido via **Dados Abertos** (estável):
1. **IRP aberta** — sinal público pré-edital mais forte e disponível. ★
2. **PCA** — onde catalogado (mais federal/estadual).
3. **Recorrência / dispensa recorrente** — prevê a próxima compra pelo histórico. ★
4. **ETP/TR publicados cedo** — onde o órgão antecipa (medir a janela).
5. **Aviso de contratação direta** — dispensa/inexigibilidade em formação.
6. (pacote) Contrato vencendo + dinheiro novo — recompra e verba.

---

## Arquitetura de captura coerente (o que construir)

1. **Backbone = PNCP Dados Abertos** → ingestão própria em banco (PCA, contratações, atas, contratos, documentos/anexos). Sem rate-limit.
2. **Delta = API de Consulta** com backoff, só para o que mudou hoje.
3. **Camada de documentos** — para cada contratação, baixar os anexos e classificar (DFD/ETP/TR/IRP) → medir **quando** cada um foi publicado vs o edital (a janela de antecedência real).
4. **Enriquecimento seletivo** (roadmap): Compras.gov dados abertos (esteira federal), Querido Diário (atos), Transparência (dinheiro novo). Nunca scraping de 1.400 portais.

---

## O experimento que prova (o estudo que falta rodar)

Sobre o backbone de Dados Abertos, medir em **1 estado × 3 segmentos × 12 meses**: para cada edital, **quantos sinais públicos existiam ANTES dele, e com quanta antecedência** (IRP, PCA, ETP/TR cedo, recorrência). Isso responde, com número, "quantas oportunidades o Sentinela teria mostrado 60/90/180 dias antes". É a prova da tese — e agora é rodável, porque a fonte estável existe.

---

## Veredito
- O problema do PNCP **tem conserto**: Dados Abertos no lugar da API ao vivo.
- A esteira completa **não é uniforme** — muito documento sai tarde. Mas **IRP + PCA + recorrência + ETP/TR-cedo** formam uma antecipação real e defensável.
- **Próximo passo concreto:** montar o ingestor de Dados Abertos e rodar o experimento de antecedência. Sem isso, qualquer tela é um carro sem motor.
