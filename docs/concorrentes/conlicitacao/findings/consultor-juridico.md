# FINDINGS — Consultor Jurídico IA (ConLicitação)

## O que é
Chat jurídico especializado em licitações e contratos administrativos, foco na prática do dia a dia. Aponta também para um "Jurídico do ConLicitação" (suporte humano) em casos complexos.

## Base de conhecimento (auto-descrita pela própria IA)
1. **Legislação vigente:** Lei 14.133/2021, Constituição Federal, Lei 13.303/2016 (Estatais), INs, decretos.
2. **Doutrinas** de autores brasileiros sobre licitações/contratos.
3. **Jurisprudência consolidada + ementários internos** (consultas e orientações práticas a licitantes).
4. **Teses e acórdãos** sobre temas controvertidos, incluindo **tribunais de contas**.
5. **Materiais didáticos e artigos** (para licitantes sem formação jurídica).
6. **Análises de práticas inovadoras** (ex.: uso do robô de lances).

## Comportamento
- "Traduz conhecimento técnico-jurídico em orientações claras, objetivas e rigorosamente fundamentadas."
- **Pode consultar documentos que o usuário fornece** (RAG + upload).
- Disclaimer: *"Esse chat pode cometer erros. Verifique as informações importantes."*

## Leitura estratégica (o que importa pra nós)
- **O fosso não é o modelo — é o CORPUS (RAG).** O valor está na curadoria: lei + jurisprudência TCU/TCE + doutrina + **ementários próprios** + didático. Qualquer um liga um GPT; poucos têm o corpus.
- **Reforça nossa decisão:** reusar o motor do **MeuJurídico**, que já é um produto jurídico com corpus. Nosso consultor precisa do mesmo grounding, não de um LLM cru.
- Mesma arquitetura que planejamos: **RAG + o consultor lê os documentos da pasta** (edital baixado) + cruza com a empresa.
- **Disclaimer + escalonamento humano** — copiar (bate com nossa régua "probabilidade, não promessa").

## Backlog para o Sentinela
- [ ] **Corpus do consultor:** Lei 14.133 + jurisprudência TCU/TCE + doutrina + ementários próprios (reuso MeuJurídico).
- [ ] Consultor lê os documentos da pasta (já no plano do Bloco 3).
- [ ] Disclaimer fixo + botão "falar com jurídico" nos casos complexos.
- [ ] Tom: claro, objetivo, **sempre citando a fonte legal**.
