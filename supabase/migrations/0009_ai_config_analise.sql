-- PART 2: config de IA por tenant (BYOK) + resultados de análise.

-- Config de IA: chave NUNCA exposta ao client → RLS ligada SEM policies (só service_role lê/escreve).
create table if not exists tenant_ai_config (
  tenant_id        uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  provider         text not null default 'anthropic',
  model            text not null default 'claude-haiku-4-5-20251001',
  api_key_encrypted text,
  atualizado_em    timestamptz default now()
);
alter table tenant_ai_config enable row level security;  -- sem policy: bloqueado p/ anon/authenticated

-- Resultados de análise da Pasta (Resumo/Veredito/etc.)
create table if not exists analise (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  licitacao_id uuid not null references licitacao(id) on delete cascade,
  tipo         text not null,          -- resumo | veredito | empresa_edital | riscos
  conteudo     jsonb,
  modelo       text,
  criado_em    timestamptz default now(),
  unique (licitacao_id, tipo)
);
alter table analise enable row level security;
do $$ begin
  create policy analise_select on analise for select using (tenant_id = auth.uid());
exception when duplicate_object then null; end $$;
