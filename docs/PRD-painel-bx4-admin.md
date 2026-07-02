# Sentinela — Painel BX4 (admin interno) — PRD

Decisão do Bione em 02/07/2026: planejar agora, **não construir agora**. Prioridade
segue no motor de dados (harvester PNCP e afins). Este documento existe pra que,
quando chegar a hora, ninguém precise re-arquitetar do zero.

## O que é e por que é separado do produto

O Painel BX4 é **admin interno**, nunca visível a um cliente. É diferente da tela
**Organização** (que já existe e é o cliente gerenciando a própria empresa: CNPJ,
membros, assinatura dele). Aqui é a BX4 gerenciando **todos os clientes de uma vez**
— por isso precisa de um papel de acesso próprio, fora do RLS multi-tenant que já
protege os dados de cada organização.

Nome de trabalho: **Painel BX4**. Domínio sugerido quando for construir: subdomínio
separado do app do cliente (ex. `admin.sentinela...`), pra reduzir de vez o risco de
um bug de RLS vazar dado de um cliente pro painel de outro.

---

## Módulo 1 — Gestão de Clientes (Organizações)

Visão global sobre `organizacoes`: lista de todas as organizações, status
(trial/ativo/inadimplente/cancelado — hoje só existe `plano_status` como texto livre,
vai precisar virar enum quando o módulo de pagamento existir), data de cadastro,
CNPJ vinculado, quem é o admin, quantos membros, último login.

**Depende de:** nada novo — `organizacoes`, `empresas_cnpj`, `organizacao_membros`,
`usuarios` já existem no schema atual.

## Módulo 2 — Pagamentos (Asaas + Stripe)

**Decisão de arquitetura recomendada:** Asaas como gateway principal, Stripe como
secundário — atrás de uma camada de abstração (`pagamento_provedor` configurável),
não um dos dois hardcoded.

Por quê Asaas primeiro: é gateway brasileiro nativo — PIX, boleto, cartão e TED
desde o primeiro dia, sem restrição de tempo de conta. Assinaturas (cobrança
recorrente) são suportadas, mas **atenção**: a Asaas não tem webhook próprio de
assinatura, só de cobrança — o controle de "cliente pagou este mês" é feito
escutando os webhooks de cobrança (`PAYMENT_CREATED`, `PAYMENT_CONFIRMED`,
`PAYMENT_RECEIVED`) e filtrando pelo campo `subscription` que vem no JSON de cada
cobrança gerada pela assinatura. Isso precisa entrar no desenho do webhook handler
desde o início, não é um detalhe pra depois. [docs.asaas.com](https://docs.asaas.com/docs/webhook-para-cobrancas)

Por quê Stripe como secundário, não principal: o Stripe aceita PIX no Brasil, mas
**só depois de 60 dias processando na plataforma e em situação regular** — trava
real pra quem está começando. Cartão internacional e Stripe Billing (assinaturas)
funcionam bem, então faz sentido manter o Stripe disponível pra cenário de cliente
que prefere cartão/cobrança em outra moeda, mas não como porta de entrada padrão
pro mercado brasileiro. [stripe.com/resources — Pix in Brazil](https://stripe.com/resources/more/pix-replacing-cards-cash-brazil), [support.stripe.com](https://support.stripe.com/questions/how-to-enable-pix-as-a-payment-method-in-brazil)

**Desenho técnico previsto (quando for construir):**
- Tabela `pagamentos_config`: provedor ativo por padrão, chaves de API só no Vault (nunca em `.env` versionado).
- Tabela `assinaturas`: org_id, provedor, id_externo_assinatura, status, próxima cobrança, valor.
- Tabela `cobrancas` (histórico): org_id, provedor, id_externo, valor, status, forma_pagamento (pix/boleto/cartão), pago_em.
- Edge Function `webhook-pagamento-asaas` e `webhook-pagamento-stripe`, cada uma validando a assinatura do webhook antes de processar (segurança básica contra webhook falso).
- Ação automática permitida: **atualizar status de pagamento** a partir do webhook confirmado. Ação que **nunca** deve ser automática sem revisão: suspender acesso de um cliente por inadimplência — isso deve gerar um alerta (mesmo padrão do módulo 4) pro Bione confirmar antes de bloquear alguém, dado o risco reputacional de cortar acesso errado.

**Depende de:** nada do schema atual — é módulo novo por completo.

## Módulo 3 — Controle de IA por Provedor (Anthropic / OpenAI / Gemini)

**Decisão de arquitetura recomendada:** nenhuma função nova que chama IA daqui pra
frente deve chamar um provedor direto no código. Toda chamada passa por uma camada
de abstração fina que lê qual provedor está ativo e roteia — assim ligar/desligar
Anthropic/OpenAI/Gemini no Painel BX4 vira só um `update` numa tabela de config, não
um redeploy de código.

**Desenho técnico previsto:**
- Tabela `ia_provedores_config`: provedor (anthropic/openai/gemini/outro), ativo (bool), modelo_padrao, prioridade (pra fallback se o principal cair), chave de API no Vault.
- Tabela `ia_uso_log`: org_id, provedor, modelo, funcao (raio-x, converse-com-radar, extração de edital, etc.), tokens_entrada, tokens_saida, custo_estimado, criado_em — **essa tabela hoje não existe**, e é pré-requisito tanto pro consumo agregado do Painel BX4 quanto pra tela "Uso de IA" (que já existe visualmente mas ainda com dado mock).
- O toggle de provedor no Painel BX4 é só a UI em cima de `ia_provedores_config` — a inteligência real está em cada função de produto respeitar essa config em vez de hardcoded.

**Risco a registrar:** cada provedor tem formato de resposta e limites diferentes
(Claude, GPT, Gemini não são intercambiáveis 1:1 em prompt/tool-use) — a camada de
abstração precisa normalizar isso, não é só trocar uma URL de endpoint. Vale
desenhar essa camada com cuidado quando chegar a hora, não como troca cosmética.

**Depende de:** nada do schema atual — módulo novo, mas de baixo custo pra registrar agora (só a decisão de nunca hardcodear provedor já evita retrabalho).

## Módulo 4 — Alertas e Segurança do Sistema

Isso **já existe e já roda em produção** — construído em 01–02/07/2026: tabelas
`alertas_integracao` e `harvester_runs`, cobrindo qualquer integração (não só
PNCP), cada alerta com severidade, ação sugerida e contexto técnico prontos pra
quando o Bione abrir a IDE do Claude. O Painel BX4 só precisa de uma tela que liste
isso com filtro por severidade/integração/resolvido — não precisa de nenhuma peça
de backend nova, é puramente front-end em cima do que já existe.

**Depende de:** nada novo — já pronto (ver `docs/HANDOFF-sentinela.md` e memória do projeto).

---

## Segurança e Controle de Acesso

O Painel BX4 não pode herdar o RLS pensado pra isolar clientes entre si — ele
precisa **atravessar** esse isolamento de propósito, então merece tratamento à
parte:
- Papel de acesso próprio (`bx4_admin`), não o mesmo `Admin` de uma organização cliente.
- Autenticação separada (idealmente com 2FA obrigatório, já que esse painel enxerga dado de pagamento e credencial de todos os clientes).
- Toda ação sensível do painel (suspender cliente, trocar provedor de IA, ver dado de pagamento) devia gerar registro em `audit_logs`, com `ator` sendo o admin da BX4 — auditoria de quem-fez-o-quê dentro do próprio painel de admin.

## Dependências e Sequenciamento

Não faz sentido construir o Painel BX4 antes de:
1. O motor de dados (harvester) estar maduro — prioridade atual, correta.
2. Existir pelo menos a decisão de gateway de pagamento efetivamente integrada (Módulo 2) — "quem pagou" não tem de onde vir sem isso.
3. Existir o primeiro cliente pagante de verdade — antes disso, o painel de gestão de clientes não tem o que gerenciar além do que já dá pra ver direto no Supabase.

## Fora de escopo agora

Nenhuma linha de código deste PRD deve ser implementada até o Bione pedir
explicitamente — este documento é só o desenho, pra quando a prioridade mudar pra
cá o trabalho começar com arquitetura definida, não do zero.
