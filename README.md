# Sentinela — by BX4 Technology Solutions

Plataforma de inteligência e operação para fornecedores do setor público.
Diferencial: o **Raio-X Financeiro Pré-Edital**.

## Stack (2026)

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS v4** (tokens da paleta em `app/globals.css`)
- **shadcn/ui** (a adicionar conforme as telas pedirem) + **lucide-react** (ícones)
- **Supabase** (Postgres + Auth + RLS multi-tenant + pgvector)
- Deploy na **Vercel**

## Telas prontas

- `/login` — Login + Recuperação de senha (`app/login/page.tsx`)
- `/dashboard` — Página Inicial com sidebar, topbar e o card exclusivo
  **Alvos Quentes da Semana** (`app/dashboard/page.tsx`)

## Rodar no seu Mac

```bash
# 1. credenciais (NUNCA commite o .env.local)
cp .env.local.example .env.local
# edite .env.local e cole a chave publishable do Supabase

# 2. dependências (instala as versões corretas para o seu sistema)
rm -rf node_modules .next   # limpa artefatos de outro ambiente, se houver
npm install

# 3. ambiente de desenvolvimento
npm run dev
# abra http://localhost:3000  (redireciona para /login)
```

> O `node_modules` e o `.next` que vierem junto da pasta podem conter binários
> de outro sistema operacional — por isso o `rm -rf` antes do `npm install`.

## Publicar na Vercel

1. Suba o repositório (privado) para o GitHub — o `.gitignore` já exclui
   `.env*` e `node_modules`.
2. Em vercel.com → **Add New → Project** → importe o repositório.
3. Em **Environment Variables**, cadastre:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
4. Deploy. A Vercel detecta o Next.js automaticamente.

## Variáveis de ambiente

| Variável | Onde usar | Sensível? |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | client + server | não |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | client + server | não (chave pública) |
| `SUPABASE_SERVICE_ROLE_KEY` | **somente server** | **SIM — nunca exponha, nunca commite** |

## Estrutura

```
app/
  layout.tsx          fontes Sora + Inter, metadata
  globals.css         Tailwind v4 + tokens da paleta
  page.tsx            redireciona para /login
  login/page.tsx      Login + Recuperação
  dashboard/page.tsx  Página Inicial
components/
  brand-mark.tsx      logo (sentinela no cubo)
  sidebar.tsx         navegação (ordem oficial PRD v1.1)
  topbar.tsx          seletor de empresa, busca ⌘K, ajuda, avatar
lib/
  supabase/client.ts  cliente browser (chave publishable)
```

## Paleta

violeta `#5B21B6` · índigo `#1E1B4B` · roxo `#7C3AED` ·
**laranja `#FF6600`** (CTA, aprovado) · fontes Sora + Inter.

---

Os arquivos `login.html` e `dashboard.html` na raiz são os **mockups originais**
(prévia visual) e já foram substituídos pelos componentes React. Pode apagá-los.
