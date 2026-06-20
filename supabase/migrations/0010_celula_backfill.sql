-- Backfill on-demand por célula (cidade). Duas camadas:
--  cidade_coletada (GLOBAL): estado de coleta de metadados por codigo_ibge → reuso entre tenants.
--  celula (POR TENANT): cidades que a empresa escolheu monitorar.

create table if not exists cidade_coletada (
  codigo_ibge   text primary key,
  municipio     text,
  uf            text,
  status        text not null default 'pendente',  -- pendente | coletando | pronta | erro
  editais_count int default 0,
  ultima_coleta timestamptz,
  criado_em     timestamptz default now()
);
alter table cidade_coletada enable row level security;
do $$ begin
  create policy cidade_read on cidade_coletada for select using (true); -- status é público (catálogo)
exception when duplicate_object then null; end $$;
-- escrita: só service_role (worker)

create table if not exists celula (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null default auth.uid() references auth.users(id) on delete cascade,
  codigo_ibge text not null,
  municipio  text,
  uf         text,
  criado_em  timestamptz default now(),
  unique (tenant_id, codigo_ibge)
);
create index if not exists ix_celula_tenant on celula(tenant_id);
alter table celula enable row level security;
do $$ begin
  create policy celula_select on celula for select using (tenant_id = auth.uid());
  create policy celula_insert on celula for insert with check (tenant_id = auth.uid());
  create policy celula_delete on celula for delete using (tenant_id = auth.uid());
exception when duplicate_object then null; end $$;

-- Seed: cidades já coletadas pelo harvest de teste = 'pronta' (reuso imediato).
insert into cidade_coletada (codigo_ibge, municipio, uf, status, editais_count, ultima_coleta)
values
  ('3550308','São Paulo','SP','pronta', (select count(*) from raw_editais where cidade='São Paulo'), now()),
  ('2211001','Teresina','PI','pronta', (select count(*) from raw_editais where cidade='Teresina'), now())
on conflict (codigo_ibge) do nothing;
