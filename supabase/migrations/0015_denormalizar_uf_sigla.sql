-- Denormaliza uf_sigla em raw_editais/raw_pca (Etapa 2) — ADITIVA, não-destrutiva.
-- A busca nacional por UF precisa filtrar uf + objeto(trigram) na MESMA tabela (BitmapAnd),
-- sem join lento a orgao e sem IN gigante de CNPJs (estoura em UF grande como SP).
alter table raw_editais add column if not exists uf_sigla text;
alter table raw_pca add column if not exists uf_sigla text;
-- backfill a partir de orgao (idempotente: só onde está nulo)
update raw_editais e set uf_sigla = o.uf_sigla from orgao o where o.cnpj = e.cnpj_orgao and e.uf_sigla is null;
update raw_pca p set uf_sigla = o.uf_sigla from orgao o where o.cnpj = p.cnpj_orgao and p.uf_sigla is null;
create index if not exists ix_edit_uf on raw_editais(uf_sigla);
create index if not exists ix_pca_uf on raw_pca(uf_sigla);
