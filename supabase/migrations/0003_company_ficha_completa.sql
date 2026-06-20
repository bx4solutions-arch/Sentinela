-- Correção 4: ficha completa da empresa (todos os campos da BrasilAPI).
-- Correção 3: checklist de habilitação → novos tipos de certidão + 1 doc por tipo.

alter table company
  add column if not exists matriz_filial         text,
  add column if not exists situacao_data         date,
  add column if not exists data_inicio_atividade date,
  add column if not exists capital_social        numeric,
  add column if not exists opcao_simples         boolean,
  add column if not exists opcao_mei             boolean,
  add column if not exists logradouro            text,
  add column if not exists numero                text,
  add column if not exists complemento           text,
  add column if not exists bairro                text,
  add column if not exists cep                   text,
  add column if not exists telefone              text,
  add column if not exists email                 text,
  add column if not exists qsa                   jsonb;

-- Um documento por tipo por empresa (modelo do Vigia). Dedupe antes da constraint.
delete from certidao a using certidao b
  where a.company_id = b.company_id and a.tipo = b.tipo and a.ctid < b.ctid;

do $$ begin
  alter table certidao add constraint certidao_company_tipo_uk unique (company_id, tipo);
exception when duplicate_object then null; end $$;
