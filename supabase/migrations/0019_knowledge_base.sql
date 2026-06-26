-- ============================================================================
-- 0019 — Base de Conhecimento PRÓPRIA do tenant (normas/documentos da empresa)
-- Diferente da lexia_corpus (federal compartilhada): aqui cada empresa sobe suas
-- normas internas/estaduais/municipais. TENANT-SCOPED com RLS (tenant_id=auth.uid()).
-- ============================================================================

create table if not exists knowledge_base (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  titulo        text not null,
  categoria     text,                   -- 'lei','decreto','instrucao_normativa','portaria','interno','outro'
  esfera        text,                   -- 'federal','estadual','municipal','org'
  numero_norma  text,
  orgao_emissor text,
  url           text,
  conteudo      text,
  status        text default 'pronto',  -- 'processando','pronto','erro'
  criado_em     timestamptz default now()
);
create index if not exists ix_kb_tenant on knowledge_base(tenant_id);

create table if not exists knowledge_chunks (
  id           uuid primary key default gen_random_uuid(),
  document_id  uuid not null references knowledge_base(id) on delete cascade,
  tenant_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  content_text text not null,
  embedding    vector(1536),
  chunk_index  int default 0,
  criado_em    timestamptz default now()
);
create index if not exists ix_kc_tenant on knowledge_chunks(tenant_id);
create index if not exists ix_kc_doc    on knowledge_chunks(document_id);

alter table knowledge_base   enable row level security;
alter table knowledge_chunks enable row level security;
do $$ begin
  create policy kb_all    on knowledge_base   for all using (tenant_id = auth.uid()) with check (tenant_id = auth.uid());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy kc_all    on knowledge_chunks for all using (tenant_id = auth.uid()) with check (tenant_id = auth.uid());
exception when duplicate_object then null; end $$;

-- Busca semântica na base própria (RLS já restringe ao tenant do caller)
create or replace function match_knowledge(query_embedding vector(1536), match_count int default 6)
returns table (id uuid, document_id uuid, content_text text, similarity float)
language sql stable as $$
  select c.id, c.document_id, c.content_text,
         1 - (c.embedding <=> query_embedding) as similarity
  from knowledge_chunks c
  where c.embedding is not null
  order by c.embedding <=> query_embedding
  limit match_count;
$$;
