# PROMPT — FRONTEND FUNCIONANDO + SELETOR DE MODELO LIVRE

Régua de autoteste vale (`docs/REGUA-DE-EXECUCAO-E-AUTOTESTE.md`), **reforçada**: não basta E2E verde — tem que ter **verificação VISUAL real**. Push autônomo se secret-scan limpo. Migrations aditivas sozinho.

---

## PARTE 1 — FRONTEND COMPLETO E FUNCIONAL (prioridade máxima)

**Problema:** o back está sólido, mas o Bione diz que "na tela nada funciona". 43 E2E passando NÃO bateram com o que ele vê → os testes validaram **seletor/elemento presente**, não a **experiência real**. Isso é falsa confiança.

**Diagnóstico primeiro:** reconciliar por que os testes passam mas a tela não funciona pro usuário. Suspeitos: telas que abrem em branco, nav que não leva a lugar nenhum, itens "SOON" não clicáveis, dado que existe no banco mas não renderiza, botões sem handler.

**Entregar:**
- **Toda tela construída tem que estar ALCANÇÁVEL e FUNCIONAL** na navegação real: Dashboard · Radar · Kanban · Minha Empresa · Pasta Inteligente · Configurações.
- **Remover stubs "SOON"** de qualquer feature já pronta no back — se existe, tem que abrir e funcionar.
- Cada tela **renderiza dado real** e cada controle **funciona de verdade**: filtros do Radar, monitorar/descartar, mover card no Kanban, "Adicionar à análise", abrir as abas da Pasta, checklist de documentos.

**DoD VISUAL (novo, obrigatório por tela):**
1. **Screenshot da tela populada com dado real** (não vazia).
2. Os **controles principais respondem ao clique de verdade** — o teste clica e confirma a mudança de estado/conteúdo, não só "o botão existe".
3. Se a tela abre vazia ou quebrada pro usuário, **NÃO é "pronto"** — conserta antes de reportar.

---

## PARTE 2 — SELETOR DE MODELO/PROVEDOR LIVRE (não fixar IA)

A IA **não pode ser fixa** em Haiku+Sonnet. O Bione escolhe **provedor E modelo**.

- **Camada de abstração (adapter):** cliente unificado `llm.complete({provider, model, apiKey, messages})` roteando para **Anthropic · OpenAI (GPT-4/GPT-5…) · Google (Gemini)** — extensível a outros provedores.
- **Configurações → IA:**
  - Escolher **Provedor** (Anthropic / OpenAI / Google / outro).
  - Escolher **Modelo** — dropdown por provedor **+ campo "modelo customizado" livre** (digitar qualquer id de modelo).
  - **API key do provedor (BYOK)** — o usuário cola a própria chave.
- **Segurança das chaves:** guardadas **criptografadas por tenant** (não em texto plano no banco), **nunca logadas, nunca expostas no client**. As chamadas de IA saem do **servidor**, não do navegador.
- **Default sensato** (um modelo barato pré-selecionado), mas **100% sobrescrevível**.
- (Opcional/avançado) modelo diferente por etapa (extração vs veredito); MVP pode ter um modelo global.
- **Gate de gasto resolvido por BYOK:** o terminal **não contrata nada**; o custo é da chave do Bione. Ligar a IA = o Bione entrar a chave + escolher o modelo. Sem serviço pago novo pelo terminal.

**Onde isso liga:** quando houver provedor+modelo+chave configurados, o botão "Analisar com IA" (hoje desligado na Pasta) **acende** e roda o Resumo/Veredito/Consultor usando o modelo escolhido.

---

## Autoteste desta entrega
- Frontend: screenshot + clique real por tela (DoD visual acima).
- Seletor de modelo: configurar um provedor+modelo+chave de teste → confirmar que a chamada de IA roteia pro provedor certo (mockar a resposta se não quiser gastar no teste) → confirmar que trocar o modelo troca o destino.
- Build + typecheck + lint verdes · console limpo.

## Não fazer
- Não fixar provedor/modelo. Não embutir chave no client. Não contratar serviço pago.
- Não forjar as abas data-gated (Preço/Concorrentes/Órgão/Decisores) — seguem "em breve".
