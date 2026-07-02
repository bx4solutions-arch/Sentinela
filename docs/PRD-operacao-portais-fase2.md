# Sentinela — Operação direta nos portais (Fase 2) — adendo ao PRD

Decisão do Bione em 29/06/2026.

## Decisão
A **conexão direta com os portais para OPERAR** (login interno, cadastro de proposta,
robô de lances, sessão em tempo real) **fica FORA do MVP**. Será retomada na **Fase 2**.

## Reavaliação técnica (browser-use)
Avaliamos o [browser-use](https://github.com/browser-use/browser-use) (agente de automação
de navegador guiado por IA). Conclusão:

- **Custo/fragilidade ("encanamento"):** ✅ resolvido em boa parte — não precisa manter um
  scraper por portal; o agente se adapta a mudanças de layout, formulários e (na cloud)
  CAPTCHA/stealth/proxy. Operar passa a ser **tecnicamente viável e sustentável**.
- **Segurança/LGPD (custódia de credencial):** 🟡 ajuda mas não elimina — ainda é preciso
  logar como o cliente. Mitigar com Supabase Vault, sessão efêmera, ou certificado A1.
- **Jurídico/ToS + regulatório:** ❌ NÃO resolve — automação continua sendo automação;
  stealth/anti-detecção até piora a postura de ToS; lance automatizado é zona cinzenta.
  **Este é o único bloqueador real, e é jurídico, não técnico.**

## Arquitetura prevista para a Fase 2 (quando retomar)
- Workers server-side com **browser-use** (self-host open source, ou cloud p/ escala/stealth/captcha).
- Credenciais em **Supabase Vault** ou autenticação por **certificado digital A1**.
- **Human-in-the-loop obrigatório:** o agente PREPARA a proposta/lance; o Bione/cliente
  CONFIRMA antes de qualquer envio. Nunca dispara lance sozinho (regra do CLAUDE.md: copiloto, nunca piloto).
- Token da IA do agente entra na régua do módulo "Uso de IA".

## Gate antes de investir
Validar com jurídico: Termos de Uso de cada portal + enquadramento regulatório do lance
automatizado em licitação pública.

## No MVP atual
Aba Portais = apenas **filtro de origem** (leitura via PNCP). Operação marcada "Fase futura".
