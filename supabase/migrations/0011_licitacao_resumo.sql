-- Resumo Executivo pré-computado (determinístico do payload) — cache p/ abrir instantâneo.
alter table licitacao add column if not exists resumo_json jsonb;
