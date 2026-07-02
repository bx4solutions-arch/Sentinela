-- 17: vínculo canônico órgão→ente + índices críticos do TDR
-- orgaos.ente_id: aponta da linha "órgão gestor" (criada pelo PNCP, chaveada
-- por CNPJ) para a linha canônica do ente federativo (criada pelo SICONFI,
-- chaveada por codigo_ibge). Corrige a falha de join central do Raio-X.
alter table public.orgaos add column if not exists ente_id uuid references public.orgaos(id);
comment on column public.orgaos.ente_id is 'FK auto-referência: órgão gestor → ente federativo canônico (linha com codigo_ibge, mantida pelo siconfi-harvester). NULL = ainda não vinculado ou a própria linha já é o ente.';
create index if not exists idx_orgaos_ente on public.orgaos(ente_id);

-- licitacoes.codigo_ibge: vem de unidadeOrgao.codigoIbge do PNCP; é a chave
-- que permite o backfill idempotente do vínculo (re-run do harvester).
alter table public.licitacoes add column if not exists codigo_ibge text;
comment on column public.licitacoes.codigo_ibge is 'Código IBGE do município da unidade compradora (unidadeOrgao.codigoIbge, API PNCP). Mesma chave usada por SICONFI e emendas.';

-- Índices apontados no TDR (Parte 8)
create index if not exists idx_licitacoes_orgao on public.licitacoes(orgao_id);
create index if not exists idx_licitacoes_ibge on public.licitacoes(codigo_ibge);
create extension if not exists pg_trgm;
create index if not exists idx_licitacoes_objeto_trgm on public.licitacoes using gin (objeto gin_trgm_ops);
