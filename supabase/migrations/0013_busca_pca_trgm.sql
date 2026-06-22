-- Busca por nicho no PCA (Etapa 2 — Antecipação) — ADITIVA, não-destrutiva.
-- Mesmo padrão do 0012 (editais): ilike por substring na descrição do item de PCA precisa de
-- índice GIN trigram, não btree. Torna o PCA pesquisável por nicho como o edital.
create extension if not exists pg_trgm;
create index if not exists ix_pca_descricao_trgm on raw_pca using gin (descricao_item gin_trgm_ops);
