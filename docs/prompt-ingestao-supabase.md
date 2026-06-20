# PROMPT PARA O TERMINAL — Ingestão do harvest no Supabase (staging cru)

## Objetivo
Não perder a coleta da noite. Carregar `worker/harvester/pncp_data/*.jsonl` no Supabase
como **staging cru, consultável**. A modelagem final (máquina de estados `demand`) vem depois,
por cima destas tabelas. Storage estimado: ~65 mil linhas / ~120 MB → cabe no free tier.

## Conexão
- Supabase ref: `ciupgqwsdmmmqpvbtyxx` (credenciais em `.env.local`, NÃO commitar).
- Pré-requisito: rodar antes/junto a higiene do `.gitignore` (prompt-higiene-gitignore.md).

## Régua de execução
Plan mode → criar migration isolada → STOP para aprovar o schema → `db push` → rodar o loader → reportar contagens.
Sem heredoc. Nunca commitar segredo. Idempotente (re-rodar não duplica).

## Schema staging (migration — STOP para aprovar antes do push)
```sql
-- Órgãos (de _orgaos.json)
create table if not exists orgao (
  cnpj            text primary key,
  razao_social    text,
  cidade          text,
  unidades        jsonb,         -- {codigo: nome}
  n_editais       int,
  poder_id        text,          -- E/L/J (do edital)
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
  segmentos              text[],            -- [] = sem segmento
  objeto                 text,
  modalidade_id          int,
  modalidade_nome        text,
  situacao_nome          text,              -- Divulgada/Revogada/Suspensa/Anulada
  valor_estimado         numeric,
  valor_homologado       numeric,           -- preenchido = homologado/contratado
  data_publicacao        timestamptz,
  data_abertura_proposta timestamptz,
  data_encerramento      timestamptz,
  link_origem            text,
  payload                jsonb,             -- registro completo, p/ não perder nada
  inserido_em            timestamptz default now()
);

-- PCA cru (de pca.jsonl) — o sinal de antecipação
create table if not exists raw_pca (
  id                text primary key,       -- _id do harvester
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
```
> RLS: estas são tabelas de catálogo público (dado do PNCP), não de tenant — sem RLS por enquanto.
> As tabelas de tenant (company, subscription) virão com a muralha no Bloco 0/1.

## Loader (script idempotente — `worker/harvester/load_supabase.py`)
- Lê os 3 arquivos de `worker/harvester/pncp_data/`.
- `upsert` por chave primária (`numero_controle_pncp`, `id`, `cnpj`) → re-rodar não duplica.
- Mapeia os campos acima; joga o registro inteiro em `payload jsonb`.
- Enriquecer `orgao` com poder/esfera/uf/ibge a partir do 1º edital de cada CNPJ.
- Carregar em lotes (ex. 1.000 linhas) com retry; logar progresso.

## Reportar ao final
- Contagem por tabela (orgao / raw_editais / raw_pca).
- Quantos editais homologados vs em andamento.
- Quantos editais com segmento vs sem.
- Tamanho do banco (Supabase Studio → Database) — confirmar folga no free tier.

## NÃO fazer agora
- NÃO baixar documentos/PDF (endpoint `/arquivos`) — fica para uso on-demand por oportunidade.
- NÃO modelar `demand`/stage_event ainda — isto é só preservar o dado cru consultável.
```
