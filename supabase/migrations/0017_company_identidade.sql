-- ============================================================================
-- 0017 — Identidade Visual da EMPRESA (licitante)
-- Campos de marca/cabeçalho/assinatura usados para gerar propostas e documentos.
-- Adaptado do "Perfil do Órgão" do MeuJurídico → entidade = company (não órgão).
-- Tudo opcional (ADD COLUMN IF NOT EXISTS) — idempotente. RLS de company (0002)
-- já cobre estas colunas (tenant_id = auth.uid()).
-- ============================================================================

alter table company add column if not exists logo_url               text;   -- path no bucket company-assets (ou URL)
alter table company add column if not exists cor_primaria           text;   -- ex.: #1e3a5f
alter table company add column if not exists cor_secundaria         text;
alter table company add column if not exists cor_texto              text;
alter table company add column if not exists tipografia             text default 'Arial';
alter table company add column if not exists cabecalho_linha1       text;
alter table company add column if not exists cabecalho_linha2       text;
alter table company add column if not exists cabecalho_linha3       text;
alter table company add column if not exists cabecalho_linha4       text;
alter table company add column if not exists usar_logo_no_cabecalho boolean default true;
alter table company add column if not exists rodape_padrao          text;
alter table company add column if not exists rodape_texto_extra     text;
alter table company add column if not exists rodape_mostrar_gerado  boolean default true;
alter table company add column if not exists papel                  text default 'a4';
alter table company add column if not exists margens                jsonb default '{"top":2.5,"right":2,"bottom":2,"left":2.5}'::jsonb;
-- Quem assina / responde pelas propostas e documentos da empresa
alter table company add column if not exists assinante_padrao_nome  text;
alter table company add column if not exists assinante_padrao_cargo text;
alter table company add column if not exists responsavel_nome       text;
alter table company add column if not exists responsavel_cargo      text;
alter table company add column if not exists responsavel_email      text;
alter table company add column if not exists responsavel_telefone   text;
-- Numeração/formatação dos documentos gerados
alter table company add column if not exists numeracao_formato      text default 'PROP/{seq}/{ano}';
alter table company add column if not exists formato_data           text default 'dd/MM/yyyy';

-- ----------------------------------------------------------------------------
-- Storage: bucket PRIVADO para logo/brasão da empresa, com path scoped por tenant.
-- Convenção de path: "<auth.uid()>/<arquivo>" → cada empresa só lê/escreve a SUA pasta.
-- NÃO é bucket aberto: leitura/escrita exigem ser o dono do path (ajuste #4).
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('company-assets', 'company-assets', false)
on conflict (id) do nothing;

do $$ begin
  create policy company_assets_select_own on storage.objects for select
    using (bucket_id = 'company-assets' and (storage.foldername(name))[1] = auth.uid()::text);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy company_assets_insert_own on storage.objects for insert
    with check (bucket_id = 'company-assets' and (storage.foldername(name))[1] = auth.uid()::text);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy company_assets_update_own on storage.objects for update
    using (bucket_id = 'company-assets' and (storage.foldername(name))[1] = auth.uid()::text)
    with check (bucket_id = 'company-assets' and (storage.foldername(name))[1] = auth.uid()::text);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy company_assets_delete_own on storage.objects for delete
    using (bucket_id = 'company-assets' and (storage.foldername(name))[1] = auth.uid()::text);
exception when duplicate_object then null; end $$;
