# RÉGUA DE EXECUÇÃO E AUTOTESTE — governa TODO o trabalho no terminal
### Decisão do Bione (jun/2026). Esta regra tem precedência sobre o "STOP a cada bloco para o Bione testar".

---

## Princípio (a virada)
**O terminal NÃO entrega fragmento para o Bione testar.** O terminal **constrói, AUTOTESTA com suas próprias ferramentas, conserta os próprios bugs, e só traz para o Bione um resultado JÁ FUNCIONANDO.**

O Bione aprova **feature pronta** e decide **o que mudar** — ele não é o controle de qualidade de cada bloquinho. Testar fragmento por fragmento na mão não passa; quem testa é o terminal.

> Relatório certo: *"Construí e TESTEI ponta a ponta X, Y, Z — funciona. Evidência: [screenshot/log/contagem]. Decisão sua: o que ajustar?"*
> Relatório errado: *"Testa aí pra mim e me diz se passou."*

---

## Autoteste obrigatório antes de declarar "pronto" (Definition of Done)
O terminal usa a **ferramenta de execução** para validar o próprio trabalho:
1. **Sobe o dev server** e **exercita o fluxo real ponta a ponta** (ex.: criar conta → onboarding → CNPJ → ficha completa → prontidão → trocar empresa).
2. **Browser headless (Playwright/Puppeteer)** ou curl: confirma HTTP 200 e os dados certos no HTML/JSON renderizado.
3. **Confere persistência no banco** (query Supabase: a company/certidão salvou mesmo?).
4. **Lê o console do navegador + logs do servidor**: zero erro não tratado.
5. **Tira screenshot** das telas e confere o resultado visual (densidade, dados, sem layout quebrado).
6. **Roda typecheck + lint + build**: verde.
7. **Corrige o que falhar e re-testa** até passar. Só então reporta.

**Não é "pronto" sem:** fluxo real exercitado + persistência confirmada + build verde + console limpo + screenshot conferido.

---

## Gates que PERMANECEM (proteção, não fricção — regra de segurança do Bione)
Nestes 4 o terminal **PARA e pede OK explícito**:
1. **Schema do banco** antes do `db push` / migration destrutiva.
2. **`git push`** (repo privado bx4solutions-arch/Sentinela).
3. **Qualquer gasto / cobrança / billing.**
4. **Jurídico:** geração de peça processual (impugnação/recurso/contrarrazões).

Em **todo o resto**: constrói → autotesta → entrega funcionando. Sem ping-pong de teste manual.

---

## Ferramentas de execução que o terminal deve usar
bash (dev server, curl, build, typecheck, lint) · headless browser (Playwright) para clicar o fluxo e tirar screenshot · queries no Supabase (MCP/psql) para conferir persistência · leitura de console do navegador e de logs do servidor.

Se faltar ferramenta (ex.: Playwright não instalado), o terminal **instala e usa** — não terceiriza o teste para o Bione.

---

## Resumo em uma linha
**Constrói, testa de verdade sozinho, entrega funcionando. Só para nos 4 gates de risco. O Bione decide produto, não depura bloco.**
