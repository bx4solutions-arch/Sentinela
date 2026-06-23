-- Camada 2 (Bloco 1) — CONTRATOS: contrato vencendo (dataVigenciaFim) + quem ganhou (niFornecedor).
-- Metadado, nacional por data. ADITIVO. uf_sigla denormalizado (padrão 0015) p/ busca rápida.
create table if not exists contratos (
  numero_controle_pncp    text primary key,        -- PK do contrato
  numero_controle_compra  text,                    -- liga ao edital (raw_editais.numero_controle_pncp)
  cnpj_orgao              text,
  uf_sigla                text,                     -- denormalizado (unidadeOrgao.ufSigla)
  cidade                  text,
  objeto                  text,
  ni_fornecedor           text,                     -- CNPJ/CPF do VENCEDOR ("quem ganhou")
  nome_fornecedor         text,
  tipo_pessoa             text,                     -- PJ/PF
  valor_global            numeric,
  valor_inicial           numeric,
  data_vigencia_inicio    date,
  data_vigencia_fim       date,                     -- "contrato vencendo"
  data_assinatura         date,
  data_publicacao         timestamptz,
  tipo_contrato           text,
  payload                 jsonb,
  inserido_em             timestamptz default now()
);
create index if not exists ix_contr_uf         on contratos(uf_sigla);
create index if not exists ix_contr_fornecedor on contratos(ni_fornecedor);
create index if not exists ix_contr_vigfim     on contratos(data_vigencia_fim);
create index if not exists ix_contr_orgao      on contratos(cnpj_orgao);
create index if not exists ix_contr_compra     on contratos(numero_controle_compra);
create index if not exists ix_contr_objeto_trgm on contratos using gin (objeto gin_trgm_ops);

-- Catálogo público (mesmo padrão de raw_editais/raw_pca): SELECT liberado; escrita só via service_role.
do $$ begin
  create policy catalogo_read on contratos for select using (true);
exception when duplicate_object then null; end $$;
