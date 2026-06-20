-- Backbone do Radar (Q2) + Kanban (Q4): oportunidade rastreada por tenant.
-- Liga um edital real (raw_editais) ao funil do cliente. RLS por tenant.

create table if not exists oportunidade (
  id                   uuid primary key default gen_random_uuid(),
  tenant_id            uuid not null default auth.uid() references auth.users(id) on delete cascade,
  numero_controle_pncp text not null references raw_editais(numero_controle_pncp),
  stage                text not null default 'monitorando',  -- nova|monitorando|preparacao|edital|resultado|descartado
  motivo               text,
  criado_em            timestamptz default now(),
  atualizado_em        timestamptz default now(),
  unique (tenant_id, numero_controle_pncp)
);

create index if not exists ix_oport_tenant on oportunidade(tenant_id);
create index if not exists ix_oport_stage on oportunidade(tenant_id, stage);

alter table oportunidade enable row level security;

do $$ begin
  create policy oport_select on oportunidade for select using (tenant_id = auth.uid());
  create policy oport_insert on oportunidade for insert with check (tenant_id = auth.uid());
  create policy oport_update on oportunidade for update using (tenant_id = auth.uid()) with check (tenant_id = auth.uid());
  create policy oport_delete on oportunidade for delete using (tenant_id = auth.uid());
exception when duplicate_object then null; end $$;
