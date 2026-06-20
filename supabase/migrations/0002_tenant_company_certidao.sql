-- Tabelas de TENANT (muralha de dados, isolada do catálogo público).
-- tenant = usuário autenticado (MVP). RLS obrigatória: tenant_id = auth.uid().

-- Tipo de certidão/documento (Vigia)
do $$ begin
  create type certidao_tipo as enum (
    'fiscal_federal', 'fgts', 'trabalhista', 'estadual', 'municipal',
    'licenca', 'alvara', 'atestado'
  );
exception when duplicate_object then null; end $$;

-- Empresa do cliente (Raio-X por CNPJ). 1 por tenant no MVP.
create table if not exists company (
  id                  uuid primary key default gen_random_uuid(),
  tenant_id           uuid not null default auth.uid() references auth.users(id) on delete cascade,
  cnpj                text not null,
  razao_social        text,
  nome_fantasia       text,
  cnae_principal      text,
  cnae_principal_desc text,
  cnaes_secundarios   jsonb,        -- [{codigo, descricao}]
  porte               text,
  natureza_juridica   text,
  municipio           text,
  uf                  text,
  situacao_cadastral  text,
  segmentos           text[] default '{}',   -- nichos mapeados/escolhidos
  raw                 jsonb,        -- payload bruto da BrasilAPI
  criado_em           timestamptz default now(),
  atualizado_em       timestamptz default now(),
  unique (tenant_id)
);

-- Certidões/documentos do Vigia (cadastro manual + alerta de vencimento)
create table if not exists certidao (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null default auth.uid() references auth.users(id) on delete cascade,
  company_id  uuid not null references company(id) on delete cascade,
  tipo        certidao_tipo not null,
  descricao   text,
  numero      text,
  emissao     date,
  vencimento  date not null,
  criado_em   timestamptz default now()
);

create index if not exists ix_certidao_tenant on certidao(tenant_id);
create index if not exists ix_certidao_company on certidao(company_id);

-- RLS — muralha por tenant
alter table company  enable row level security;
alter table certidao enable row level security;

do $$ begin
  create policy company_select on company for select using (tenant_id = auth.uid());
  create policy company_insert on company for insert with check (tenant_id = auth.uid());
  create policy company_update on company for update using (tenant_id = auth.uid()) with check (tenant_id = auth.uid());
  create policy company_delete on company for delete using (tenant_id = auth.uid());
exception when duplicate_object then null; end $$;

do $$ begin
  create policy certidao_select on certidao for select using (tenant_id = auth.uid());
  create policy certidao_insert on certidao for insert with check (tenant_id = auth.uid());
  create policy certidao_update on certidao for update using (tenant_id = auth.uid()) with check (tenant_id = auth.uid());
  create policy certidao_delete on certidao for delete using (tenant_id = auth.uid());
exception when duplicate_object then null; end $$;
