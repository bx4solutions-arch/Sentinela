# SENTINELA — CLASSIFICAÇÃO: o que antecede o edital, por modalidade
### O motor de antecipação não pode olhar só IRP. Cada modalidade tem um rastro próprio.

## A chave (a base é comum, o marcador é específico)
Sob a Lei 14.133, **toda** contratação tem a mesma **fase preparatória** antes do edital:

```
PCA → DFD → ETP → Pesquisa de preços → TR / Projeto Básico → autorização → EDITAL
```

Essa esteira é **comum a todas as modalidades**. O que muda por modalidade é (a) quanto tempo/quão complexa é a preparação, e (b) qual **marcador público** aparece antes do edital. O sistema classifica cada oportunidade por **modalidade + marcador presente** → define iminência e antecedência.

---

## Mapa por modalidade

| Modalidade (cód. PNCP*) | Para quê | Marcador público que ANTECEDE o edital | Antecedência | Valor p/ cliente |
|---|---|---|---|---|
| **Pregão Eletrônico** (6) | bens/serviços comuns | esteira comum + **recorrência** (compra periódica) + contrato vencendo | média | **alto** (maior volume) |
| **Pregão Presencial** (7) | comuns, casos restritos | idem | média | médio |
| **Concorrência** (4 eletr. / 5 presc.) | obras e serviços especiais | esteira comum + **Projeto Básico/anteprojeto** + **audiência/consulta pública** (obras grandes) + licenciamento | **ALTA** (obra se prepara por meses) | alto p/ engenharia/obras |
| **Registro de Preços** (srp=true, via pregão/concorrência) | compras repetidas | **IRP — Intenção de Registro de Preços** (consulta pública prévia obrigatória) | **forte e cedo** | **altíssimo** (sinal público explícito) |
| **Dispensa** (8) | baixo valor / hipóteses art. 75 | **Aviso de Contratação Direta** (público) + ETP simplificado + **recorrência** (dispensa recorrente) | curta, mas recorrência prevê | **alto** (volume grande, baixa concorrência) |
| **Inexigibilidade** (9) | fornecedor único (art. 74) | justificativa + aviso de contratação direta | baixa (é sole-source) | baixo p/ disputa · útil como inteligência de padrão |
| **Credenciamento** (12) | todos que atendem requisitos | edital de credenciamento permanente + chamamento | contínuo | médio (cadastro permanente) |
| **Diálogo Competitivo** (2) | soluções complexas | pré-seleção + fase de diálogo | longa | nicho |
| **Concurso** (3) / **Leilão** (1/13) | projetos / alienação | — | — | nicho |

\* *Códigos a confirmar contra o catálogo de modalidades do PNCP Dados Abertos antes de cravar no código.*

---

## Sinais TRANSVERSAIS (independem de modalidade — os mais confiáveis)

Estes preveem "vai ter negócio neste órgão" **qualquer que seja a modalidade**, e por isso são o núcleo do motor:

1. **Recorrência / compra repetida** — o órgão compra o mesmo objeto periodicamente → prevê o próximo. **O sinal mais forte e universal.**
2. **Contrato vencendo** — prevê recontratação (qualquer modalidade).
3. **PCA** — intenção anual (cedo; esparso no município).
4. **Licitação fracassada / deserta / revogada** — vai voltar (republicação provável).
5. **Dinheiro novo** (emenda / transferência) — prevê gasto vinculado ao segmento.

---

## A regra de classificação (o que o motor faz por oportunidade)

Para cada órgão × objeto monitorado, o sistema detecta:
1. **Modalidade provável** (pelo histórico do órgão p/ aquele objeto).
2. **Marcador(es) presente(s)** — IRP aberta? aviso de contratação direta? projeto básico em consulta pública? contrato vencendo? dispensa recorrente?
3. **Cruza com os transversais** (recorrência, fracassada, dinheiro novo).
4. Gera **Iminência** (frio→iminente) + **Antecedência estimada** (dias até o provável edital) + **fonte do sinal** — e classifica como oportunidade para o cliente daquele recorte.

**Exemplo:** órgão com histórico de pregão-RP anual de fardamento + **IRP aberta agora** → iminência ALTA, ~60–90 dias de antecedência, sinal = IRP. · Órgão com **3 dispensas recorrentes** do mesmo objeto a cada ~6 meses, última há 5 meses → iminência MÉDIA-ALTA, sinal = recorrência de dispensa.

---

## Caveat honesto (do estudo de fontes)
Os documentos da esteira comum (DFD, ETP, TR) muitas vezes só ficam públicos **com o edital** (Lei 14.133, "após aprovação do processo"). Então, na prática, os marcadores **cedos e confiáveis** por modalidade são: **IRP** (RP), **Aviso de Contratação Direta** (dispensa), **Projeto Básico/consulta pública** (concorrência/obras), e os **transversais** (recorrência, contrato vencendo, PCA, fracassada). DFD/ETP entram como sinal **premium quando publicados cedo** — a medir por esfera no experimento de antecedência.

---

## Próximo passo
Sobre o backbone de Dados Abertos, rodar a **medição de antecedência por modalidade**: para cada edital de Teresina (12 meses, todas as modalidades), identificar qual marcador o precedeu e com quantos dias. Isso transforma esta classificação doutrinária em **pesos calibrados** do motor — e prova, por modalidade, quanta antecedência o Sentinela entrega.
