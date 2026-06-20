-- Q5: workspace por licitação (Pasta Inteligente). Container deletável por tenant.
-- Documento ganha licitacao_id (escopo 'licitacao'); company_id passa a ser opcional
-- (doc do cofre da empresa = company_id; doc do processo = licitacao_id).

create table if not exists licitacao (
  id                   uuid primary key default gen_random_uuid(),
  tenant_id            uuid not null default auth.uid() references auth.users(id) on delete cascade,
  numero_controle_pncp text not null references raw_editais(numero_controle_pncp),
  titulo               text,
  criado_em            timestamptz default now(),
  unique (tenant_id, numero_controle_pncp)
);

create index if not exists ix_licitacao_tenant on licitacao(tenant_id);

alter table documento
  add column if not exists licitacao_id uuid references licitacao(id) on delete cascade;

-- relaxa NOT NULL (sem perda de dado): docs de processo não têm company_id
alter table documento alter column company_id drop not null;

alter table licitacao enable row level security;
do $$ begin
  create policy licitacao_select on licitacao for select using (tenant_id = auth.uid());
  create policy licitacao_insert on licitacao for insert with check (tenant_id = auth.uid());
  create policy licitacao_update on licitacao for update using (tenant_id = auth.uid()) with check (tenant_id = auth.uid());
  create policy licitacao_delete on licitacao for delete using (tenant_id = auth.uid());
exception when duplicate_object then null; end $$;
