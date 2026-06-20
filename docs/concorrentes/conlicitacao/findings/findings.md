# ConLicitação — Engenharia Reversa: Findings
**Data:** 2026-06-20 | **Conta:** Bione (APPYS TECNOLOGIA E DESENVOLVIMENTO DE SOFTWARES LTDA)
**URL:** consulteonline.conlicitacao.com.br

---
## MAPA GERAL DE FERRAMENTAS (mega-menu)
| Categoria | Ferramentas |
|---|---|
| Inteligência Artificial | Dr. Licita ★NOVO, Consultor Jurídico, Resumo do Edital, Pergunte ao Edital |
| Oportunidades de Negócio | Boletins de Licitações, Encontrar Licitações, Licitações Estratégicas, Encontrar Acompanhamentos |
| Ferramentas de Gestão | Gerenciar Licitações, Gerenciar Documentos (Assine), Gerenciar Portais ★NOVO |
| Ferramentas de Automação | Monitorar Chat (Assine), Robô de Lance Inteligente ★NOVO |
| Análise Estratégica | Análise de Mercado, Concorrentes, Ata de Registro de Preços, Contratos, Meu histórico |
| Assessoria e Consultoria | Assessoria Cadastral, Jurídico Fácil, Artigos Jurídicos, Envie sua dúvida, ConLicitaSeg |
| Treinamento | ConLicita Go, Cursos in Company |
| Outras | Assinatura Digital, Bolsa de empregos, Clipping Polícia Federal, API ConLicitação, Status |

---
## PRIORIDADE 1 — INTELIGÊNCIA ARTIFICIAL

### 1. RESUMO DO EDITAL (BETA)
Modal disparado do botão "Resumo do Edital" em qualquer licitação. Gera resumo estruturado + checklist de habilitação. Sem inputs (acionado sobre a licitação selecionada).

**Cards de topo (3):** Valor Estimado · Modalidade · Data da Sessão (countdown "Em X dias").

**Seções colapsáveis (accordion):**
1. **Identificação:** Objeto · Número · Modalidade · UASG · Portal · Contratação · Regulamentação (nome do pregoeiro).
2. **Sessão Pública:** Horário · Intervalo mínimo.
3. **Órgão Responsável:** Órgão · Endereço · E-mail · Telefone · **Nota CAPAG (A+..D)** com 3 sub-indicadores (Endividamento, Poupança corrente, Liquidez Relativa) + texto explicativo.
4. **Detalhes:** Tipo de fornecimento (lote único/múltiplos) · Margem de preferência (ME/EPP, cita Lei 14.133 e LC 123/2006) · Preferência de desempate · Visita técnica · Amostra · Prova de conceito.
5. **Seguro Garantia (4 cards):** Garantia de Proposta · de Contrato · Adicional · de Retomada.
6. **Prazos importantes (grid):** manifestação de recurso · documentação complementar · **recursos e contrarrazões** (ex: 3 dias úteis cada) · documento original · esclarecimentos · prazo contratual/ARP · **limite para impugnação** · limite para propostas · vigência.
7. **Critérios de Proposta e Julgamento:** validade · exigências da proposta · critérios de desempate · preferência regional.
8. **Habilitação (bullets):** Jurídica · Fiscal/Trabalhista · Técnica (atestados/certificações) · Econômico-Financeira · Declaração Unificada.
9. **Atestado de capacidade técnica:** requisitos.
10. **Outras informações:** ARP · vedação de consórcio · ME/EPP · certificações · subcontratação · prorrogação (art. 107) · reajuste · garantia · prazo de assinatura · foro.
11. **Condições de pagamento** (extrai do TR).
12. **Penalidades e multas** ⚠️ (card vermelho/destaque).
13. **Análise e Considerações do Licitante** (campo editável p/ o usuário anotar a própria análise).

Timestamp "Resumo gerado em…". **Exportações:** Baixar Edital Completo · Enviar Checklist por E-mail · Gerar Checklist .docx · Imprimir. Botão "Pergunte ao Edital" no topo.
Exemplo: Edital 09/2026 TCE/AC — Pregão Eletrônico Aberto — Sessão 03/07/2026 (13 dias) — CAPAG A+.

### 2. PERGUNTE AO EDITAL
Chat RAG contextual sobre um edital específico. Input: pergunta em linguagem natural.
Output: chat thread (timestamp, prosa/listas), feedback 👍👎, disclaimer "Esse chat pode cometer erros…".
**Extras:** Perguntas Salvas (favoritas) · **Perguntas Estratégicas** pré-definidas por categoria:
- *Proposta:* preenchimento/envio, indicação de marca, vedação à identificação, preço inexequível, exequibilidade, desempate ME/EPP, arredondamento, documentos da proposta, critério de julgamento.
- *Objeto · Habilitação · Pagamentos · Riscos e Penalidades · Contrato.*

Teste (4 perguntas): respostas extraídas DO EDITAL, **não cita lei**. "Prazo de impugnação?" → "3 dias úteis antes da abertura". "Atestado serve?" → explica requisitos sem dizer sim/não. "O que desclassifica?" → lista 11 motivos.
**Conclusão:** RAG sobre o edital, não jurídico geral.

### 3. CONSULTOR JURÍDICO (IA 2.0)
Painel global (não vinculado a edital). IA jurídica generalista de licitações.
Output: chat com negrito/listas, **cita artigos de lei** (ex: "Lei 14.133/2021, art. 165"), histórico, novo chat, 👍👎, disclaimer.
**Corpus declarado:** legislação (14.133, CF, 13.303), doutrina, jurisprudência + ementários internos, teses/acórdãos de tribunais de contas, didático, práticas inovadoras. Pode consultar documentos do usuário.
Ex: "prazo de recurso em pregão?" → "3 dias úteis… art. 165 da Lei 14.133" + etapas.
**Conclusão:** jurídico generalista COM fundamentação legal explícita (vai além do edital).

---
## PRIORIDADE 2 — DR. LICITA (PETIÇÕES)
`/dr_licita` → `/dr_licita/nova_peca` (**requer assinatura separada — bloqueado no trial**; dados inferidos da landing).
Gera impugnações, recursos e contrarrazões fundamentados.

**Inputs (form "Criar nova peça"):** Tipo de peça (Impugnação/Recurso/Contrarrazão) · Lei regente (14.133/8.666) · base: tema/palavra-chave OU documento (.pdf/.doc/.docx/.txt) · campo de tema (ex: "Balanço vencido", "Certidões vencidas") · "Buscar sugestões com IA".

**Fluxo em 2 passos:** (1) form → IA sugere **teses jurídicas** por tema/doc → (2) usuário **seleciona teses** → peça montada.
**Banco de teses** (exemplos): "RECURSO — INEXEQUIBILIDADE — AUSÊNCIA DE TRIBUTOS NO LUCRO PRESUMIDO — REQUER INABILITAÇÃO"; "BALANÇO PATRIMONIAL VENCIDO"; "DIVERGÊNCIA CRITÉRIO DE JULGAMENTO EDITAL × SESSÃO"; "EXIGÊNCIA ILEGAL NO EDITAL". Cada tese: Título · Objetivo · **Pertinência (Alta/Média/Baixa)**.
**Diferencial:** base própria (editais, acórdãos, legislação, jurisprudência, teses reais) vs IA genérica. Export inferido .docx.

---
## PRIORIDADE 3 — DEMAIS FERRAMENTAS

### 5. LICITAÇÕES ESTRATÉGICAS (`/iminencia`)
3 abas: **Iminência de deserta** (abertas SEM proposta) · **Baixa concorrência** (poucas propostas) · **Desertas** (encerradas por falta de proposta). Filtros: item, estado. Export xlsx/docx/print.

### 6. BOLETINS (`/boletim_web/...`)
Alertas periódicos em calendário mensal. Frequência diária (dias úteis). Filtro por tipo. Clique no dia → licitações do dia.

### 7. ANÁLISE DE MERCADO (`/mercado`)
Inputs: palavra-chave, período, seleção. Output: Total de Compras Públicas (barras mensais) · Licitações por região · por modalidade · ranking de Órgãos · **Concorrentes relacionados** (empresas que disputam as mesmas). Export: imprimir.

### 8. ATA DE REGISTRO DE PREÇOS (`/ata_de_registro_preco`)
Filtros: Objeto, Estado, Cidade, Nº, Vigência. Output por ata: Objeto · Edital · Órgão · Cidade · Vigência · documentos anexos (Nome/Data/Tipo). Export xlsx/docx/print. (Preço praticado + carona/adesão.)

### 9. CONCORRENTES (`/concorrentes`)
Input: CNPJ. **Alertas de Vulnerabilidades** (Desclassificações/Inabilitações/Sanções). 4 seções: (1) Administrativa (dados + quadro societário) · (2) Participações (disputas, vencidas/não, valor, vitórias×derrotas, por estado/modalidade, itens vencidos, licitações citadas) · (3) Sanções · (4) Aspectos estratégicos (desclassificação×inabilitação + motivos).

### 10. GERENCIAR DOCUMENTOS (`/documentos`)
Cofre por grupo: Habilitação Jurídica · Regularidade Fiscal/Social/Trabalhista · Qualificação Técnica · Econômico-Financeira · Outros. Notificação de vencimento · adicionar · **gerador de declarações** · download em lote · enviar por e-mail. Doc sem validade atualiza a cada 90d.

### 11. GERENCIAR PORTAIS (`/portais`)
Cofre de credenciais: Nome do portal, CPF, URL, Tipo, vencimento do login, login, senha (reveal).

### 12. MONITORAR CHAT (`/facilitadores/monitoramento`, assinatura)
Monitora chat dos pregoeiros em tempo real; alerta "Sua empresa foi convocada!"; botão "RESPONDER CHAT".

### 13. ROBÔ DE LANCE INTELIGENTE (`/robo_lance`, assinatura)
Lance automático na nuvem (sem PC ligado). Parâmetros: valor unitário, total, marca, modelo, valor mínimo (stop-loss).

---
## TABELA FINAL — O QUE PUXAR

**ALTA:** Resumo do Edital (13 seções + CAPAG + 4 garantias + grid de prazos + considerações editáveis + export docx/email) · Pergunte ao Edital (RAG + **Perguntas Estratégicas por categoria**) · Consultor Jurídico (fundamentação com artigo) · Dr. Licita (design: **2 passos — teses com pertinência → peça**, gate de assinatura, disclaimer) · Licitações Estratégicas (3 abas de sinal).

**MÉDIA:** Análise de Mercado · Concorrentes por CNPJ (alertas de vulnerabilidade) · Gerenciar Documentos (gerador de declarações) · Ata de Registro de Preços (precificação) · Boletins.

**BAIXA/IGNORAR:** Robô de Lance · Monitorar Chat · Gerenciar Portais · Assessoria/Cursos (serviço humano) · Treinamento.

---
## MÓDULO DE PEÇAS (Dr. Licita → Sentinela) — observações críticas
1. **Fluxo de 2 passos** é a chave (input → seleção de teses com pertinência).
2. **Banco de teses pré-catalogadas** por tipo de peça, com pertinência contextual.
3. Diferencial: base própria (editais + acórdãos TCU/TCEs + legislação) vs IA genérica.
4. No Sentinela: **disclaimer jurídico robusto** (sugestão ≠ peça válida, requer advogado) · **gate de assinatura** · **seleção de teses antes de gerar** (reduz alucinação) · export .docx (Cabeçalho → Fatos → Fundamentos legais com artigos → Pedidos → Fecho).

---
## RESUMO EXECUTIVO (para o Bione)
**Gaps prioritários (o que eles fazem e nós não):**
1. **Resumo do Edital estruturado** — 13 seções, com CAPAG, grid de prazos (impugnação/recurso/contrarrazão), 4 garantias, campo de considerações editável. Export docx/e-mail.
2. **Perguntas Estratégicas pré-definidas** — 6 categorias clicáveis; UX muito superior ao chat vazio (o usuário não sabe o que perguntar).
3. **Consultor Jurídico com fundamentação explícita** (artigo + lei), distinto do RAG sobre edital.
4. **Dr. Licita — design 2 passos** (teses com pertinência → peça): reduz alucinação e aumenta accountability.
5. **Licitações Estratégicas (3 abas)** — iminência de deserta + baixa concorrência = alta percepção de valor.

**Onde superar (não copiar):**
- O Pergunte ao Edital deles NÃO cita lei; nosso pode **cruzar edital × jurisprudência × lei** numa resposta só.
- O Consultor Jurídico deles é genérico (fora do edital aberto); nosso pode **combinar contexto do edital + fundamentação jurídica**.
- O Dr. Licita usa banco de teses estático; nosso pode **gerar teses dinâmicas a partir do edital específico**.
