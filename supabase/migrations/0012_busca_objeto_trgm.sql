-- Busca por nicho/objeto no Radar (Etapa 1) — ADITIVA, não-destrutiva.
-- ilike '%termo%' (curinga na frente) NÃO usa índice btree → varreria a tabela inteira
-- pós-backfill nacional. pg_trgm + índice GIN trigram acelera o ilike por substring.
create extension if not exists pg_trgm;
create index if not exists ix_edit_objeto_trgm on raw_editais using gin (objeto gin_trgm_ops);
