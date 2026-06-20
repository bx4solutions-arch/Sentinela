# PROTIP — Engenharia reversa do ConLicitação (para a extensão Claude in Chrome)
### Cole isto na extensão. Objetivo: entender COMO as ferramentas funcionam pra informar o design do Sentinela. Foco: IA + petições. Sem perder tempo.

## Missão
Você está logado no ConLicitação (conta de teste do Bione: consulteonline.conlicitacao.com.br). Faça engenharia reversa das ferramentas e **documente ESTRUTURA e COMPORTAMENTO** — o que cada uma entrega, com quais campos/seções, que inputs pede, que formatos exporta. **Não** copiar conteúdo proprietário em massa nem dados de terceiros; capturar só o suficiente para replicar o design.

## Regras de eficiência (NÃO perder tempo)
- **Uma ferramenta por vez**, na ordem de prioridade abaixo. Time-box ~3–5 min cada.
- Para CADA uma, registrar no mesmo formato:
  1. screenshot · 2. o que faz · 3. inputs que pede · 4. **ESTRUTURA do output** (seções/campos, em lista) · 5. **1 exemplo real curto** · 6. ações/export disponíveis (docx, e-mail, print, etc.).
- Usar o menu **Ferramentas** para navegar direto. Não vagar. Não preencher dado sensível real.

---

## PRIORIDADE 1 — Inteligência Artificial (foco máximo)
1. **Resumo do Edital** — abrir num edital real → capturar as **seções exatas** do resumo (os cards de topo, Identificação, Sessão Pública, Exigências, etc.) + a **checklist** gerada + os formatos de export.
2. **Pergunte ao Edital** — fazer estas perguntas e capturar **como** responde (formato, profundidade, cita a Lei 14.133?): "Quais documentos de habilitação são exigidos?" · "Qual o prazo para impugnação?" · "Meu atestado serve?" · "O que pode me desclassificar?".
3. **Consultor Jurídico (IA 2.0)** — escopo, 1 exemplo de Q&A, como fundamenta (cita lei/jurisprudência?).

## PRIORIDADE 2 — Petições / Dr. Licita (o foco que o Bione pediu)
4. **Dr. Licita** — gerar uma **IMPUGNAÇÃO**, um **RECURSO** e uma **CONTRARRAZÃO** num caso de exemplo. Capturar:
   - que **inputs** pede (edital? motivo? cláusula?);
   - a **ESTRUTURA da peça** (cabeçalho/endereçamento, fundamentação legal citada, pedidos, fecho, formato);
   - os **disclaimers** que usa;
   - **formatos de export** (docx/PDF).
   → Isto informa nosso módulo de peça processual (que no Sentinela será **gated + travado juridicamente**: disclaimer + validação profissional).

## PRIORIDADE 3 — Resto das ferramentas (não deixar de lado — registro mais leve)
5. **Análise de Mercado** — que gráficos/recortes (volume por setor/região/órgão? tendência?).
6. **Ata de Registro de Preços** — que campos traz (preço por item? carona/adesão?).
7. **Concorrentes** — que dados de concorrente mostra (preços praticados? sanções? histórico/região?).
8. **Licitações Estratégicas** — como pontua/ordena (quais critérios de "estratégica"?).
9. **Boletins de Licitações** — formato e frequência do alerta; o que vem no boletim.
10. **Gerenciar Documentos / Gerenciar Portais** — estrutura do cofre de documentos + como gerencia credenciais de portal.
11. **Robô de Lance / Monitorar Chat** — **só observar a UI de configuração** (parâmetros: preço mínimo, decremento, estratégia) — **não operar/dar lance**.

---

## Entrega (salvar no projeto)
- Um bloco por ferramenta no formato acima, em `docs/concorrentes/conlicitacao/findings/<ferramenta>.md` (ou um consolidado `findings.md`).
- Screenshots em `docs/concorrentes/conlicitacao/shots/`.
- **Resumo final:** tabela "o que vale puxar pro Sentinela" (prioridade alta/média/baixa) × "ignorar", com foco no que a IA e as petições deles fazem que a gente ainda não faz.

## Limites (importante)
- É a conta do próprio Bione → documentar comportamento/estrutura é OK.
- **NÃO** exfiltrar dados de outros usuários, **NÃO** baixar a base inteira, **NÃO** copiar texto proprietário em massa. O objetivo é entender o **design e a estrutura**, não pirateá-los.
