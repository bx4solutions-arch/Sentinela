-- Índice em orgao(uf_sigla) — ADITIVO. Acelera resolver os CNPJs de uma UF (cnpjsDaUf),
-- usado pela busca nacional que filtra raw_editais por cnpj_orgao (índice) em vez de join lento.
create index if not exists ix_orgao_uf on orgao(uf_sigla);
