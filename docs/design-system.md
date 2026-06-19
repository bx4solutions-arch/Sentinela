# Design System — Sentinela

> Registro dos tokens visuais. **Não é o PRD** (esse é `docs/sentinela-prd-blueprint.md`,
> canônico e read-only). Toda tela puxa cor/tipografia/raio daqui para evitar divergência.

## Herança do MeuJurídico (1:1)

Extraído de `…/Meu-Juridico.Ai/src/index.css`. Implementado em `app/globals.css` (CSS vars HSL)
e mapeado em `tailwind.config.ts`.

- **Tipografia:** Inter (via `next/font`, `--font-inter`).
- **Raio:** `--radius: 0.5rem` (8px).
- **Primary:** navy `224 85% 29%` (≈ `#0B2D89`). *Decisão do usuário: usar o navy do MeuJurídico
  como cor-assinatura do Sentinela (revisão da ideia inicial de cor própria). Fica 1:1, alinhado
  ao §9.1 do PRD.*
- **Neutros (slate):** background `210 40% 98%`, foreground `222 47% 11%`, border/input `214 32% 91%`,
  muted `210 40% 96.1%` / mf `215 16% 47%`.
- **Semânticos:** success `142 72% 29%` · warning `38 92% 50%` · destructive `0 84% 50%`.
- **Sidebar:** navy escuro `222 47% 11%` (nav lateral do shell).
- Dark mode incluído (mesmas chaves).

## Mapa de uso (Sentinela)

- `primary` → botões, links, ativo da nav, stepper da esteira, marca.
- `warning` → iminência ALTA / alertas (badges de "quente").
- `success` → estágio concluído, certidão ATIVA, chance alta.
- `muted` → metadados, iminência BAIXA.

## ⚠️ Decisão a revisitar — Tailwind v3.4 (não enshrine como stack de produção)

O mock usa **Tailwind v3.4** *de propósito*, para casar 1:1 com o token system HSL-var do
MeuJurídico (`hsl(var(--primary))`) com **velocidade visual** e zero fricção de migração.

**Isto é "paridade agora", não decisão de produção.** Quando o shell graduar para o **F1 real**
(ingestão de verdade), decidir **deliberadamente**: manter v3.4 ou migrar para **v4**
(`@theme`/CSS-first). Não deixar o "v3.4 do mock" virar o stack de produção por inércia.

- Stack atual do mock: Next.js 16.2 · React 19.2 · Tailwind 3.4 · shadcn "classic" (componentes em
  `components/ui.tsx`).
- Gatilho de revisão: início do F1 / primeira ingestão real.
