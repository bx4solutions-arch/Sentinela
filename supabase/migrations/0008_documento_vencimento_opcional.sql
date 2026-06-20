-- Documentos de processo (escopo licitacao) não têm vencimento. Relaxa NOT NULL (sem perda).
alter table documento alter column vencimento drop not null;
