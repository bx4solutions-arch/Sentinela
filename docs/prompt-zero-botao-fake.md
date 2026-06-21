# PROMPT — ZERO BOTÃO FAKE + portar o visual do dashboard

## Problema (relato do Bione)
A maioria dos botões do app NÃO faz nada. Os autotestes deram "verde" porque clicam e checam que o botão EXISTE — mas não verificam se a AÇÃO aconteceu. Isso é falsa confiança. Inaceitável.

## REGRA NOVA — "todo elemento interativo funciona ou não existe"
1. **Todo botão/link/ação tem que fazer algo real:** navegar, abrir, salvar (persistir no banco), mudar estado visível, ou disparar a IA. Se a feature por trás ainda não existe → **NÃO** deixe o botão clicável e morto: ou esconda, ou marque claramente "em breve" e desabilite (cinza, cursor not-allowed, tooltip "em breve").
2. **Proibido botão decorativo.** Nada de `onClick` vazio, `href="#"`, ou handler que não muda nada.

## AUTOTESTE — provar o RESULTADO, não a presença (DoD atualizado)
Para CADA botão/ação, o teste tem que verificar a **consequência**, não o clique:
- "Monitorar" → clica → **confirma que a oportunidade aparece no Kanban/banco** (query) E o estado do card mudou.
- "Adicionar à análise" → clica → **abre a Pasta** E criou o workspace no banco.
- "Analisar com IA" → se sem chave BYOK, **está desabilitado com 'em breve'**; com chave, dispara e retorna resumo.
- "Descartar" → some do Radar E persiste o motivo.
- Filtros do Radar → mudam a lista renderizada (contagem antes ≠ depois).
- Navegação (sidebar, "Ver Radar →") → URL muda e a tela certa carrega.
- "Completar documentos" (prontidão) → leva à Vigia de certidões.
**Faça um inventário:** liste TODOS os botões/ações de cada tela e marque ✅ funciona (com teste que prova o resultado) / 🔇 desabilitado "em breve" / ❌ removido. Nenhum pode ficar clicável-e-morto.

## VISUAL — portar `docs/sentinela-dashboard-v2.html` 1:1
Paleta SEM VERDE (navy #0B2D89 · azul #3C83F6 · âmbar #F59F0A · vermelho #DC2626). Elementos: KPIs com ícone, "Atacar hoje" com anel de score SVG + chips de motivo + CAPAG, Pipeline, Sinais oficiais, Oportunidades estratégicas (iminência de deserta / baixa concorrência), donut, linha, Prontidão. Trocar os emoji do mockup por um set de ícones de verdade (lucide/tabler). Manter o dado real de Santos.

## Entrega
- Inventário de botões por tela (✅/🔇/❌) + autotestes que provam o RESULTADO.
- Dashboard com o visual do v2.
- Screenshot de cada tela + um vídeo/gif curto OU a lista de asserts de resultado, pra eu conferir que clicar faz algo.
- Commit local (sem push). Régua de sempre (aditivo, sem destrutivo, sem segredo, sem IA paga).
