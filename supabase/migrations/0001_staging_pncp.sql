-- Staging cru do harvest PNCP (catálogo público — sem RLS).
-- Tabelas de tenant (company, certidao) virão com RLS no Bloco 1.

-- Órgãos (de _orgaos.json, enriquecido pelo 1º edital de cada CNPJ)
create table if not exists orgao (
  cnpj            text primary key,
  razao_social    text,
  cidade          text,
  unidades        jsonb,         -- {codigo: nome}
  n_editais       int,
  poder_id        text,          -- E/L/J
  esfera_id       text,          -- F/E/M
  uf_sigla        text,
  codigo_ibge     text,
  atualizado_em   timestamptz default now()
);

-- Editais crus (de editais.jsonl)
create table if not exists raw_editais (
  numero_controle_pncp   text primary key,
  cnpj_orgao             text references orgao(cnpj),
  cidade                 text,
  segmentos              text[],
  objeto                 text,
  modalidade_id          int,
  modalidade_nome        text,
  situacao_nome          text,
  valor_estimado         numeric,
  valor_homologado       numeric,
  data_publicacao        timestamptz,
  data_abertura_proposta timestamptz,
  data_encerramento      timestamptz,
  link_origem            text,
  payload                jsonb,
  inserido_em            timestamptz default now()
);

-- PCA cru (de pca.jsonl) — sinal de antecipação
create table if not exists raw_pca (
  id                text primary key,        -- _id do harvester
  cnpj_orgao        text references orgao(cnpj),
  cidade            text,
  segmentos         text[],
  classe            text,
  descricao_item    text,
  valor_total       numeric,
  ano_pca           int,
  data_publicacao   date,
  data_desejada     date,
  payload           jsonb,
  inserido_em       timestamptz default now()
);

-- Índices p/ as consultas do app
create index if not exists ix_edit_cidade   on raw_editais(cidade);
create index if not exists ix_edit_seg      on raw_editais using gin(segmentos);
create index if not exists ix_edit_situacao on raw_editais(situacao_nome);
create index if not exists ix_edit_datapub  on raw_editais(data_publicacao);
create index if not exists ix_edit_orgao    on raw_editais(cnpj_orgao);
create index if not exists ix_pca_orgao     on raw_pca(cnpj_orgao);
create index if not exists ix_pca_seg       on raw_pca using gin(segmentos);
