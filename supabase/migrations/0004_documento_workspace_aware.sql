-- Correção 6 + Gate #5 (workspace-aware): certidao -> documento.
-- tipo deixa de ser enum (extensível); ganha rótulo livre e escopo (company | licitacao).

alter table certidao rename to documento;

-- tipo: enum certidao_tipo -> text (extensível; "Outro…" do usuário)
alter table documento alter column tipo type text using tipo::text;

alter table documento
  add column if not exists tipo_label text,                          -- rótulo de exibição (custom)
  add column if not exists escopo     text not null default 'company';  -- 'company' (cofre) | 'licitacao' (B3)

-- licitacao_id entra no Bloco 3 (workspace por licitação). Por ora todo documento é escopo 'company'.

-- constraint de unicidade segue: 1 doc por tipo por empresa (renomeada junto com a tabela).
do $$ begin
  alter index certidao_company_tipo_uk rename to documento_company_tipo_uk;
exception when undefined_object then null; end $$;
