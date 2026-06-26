-- 0020 — Escopo definido pelo cliente: SETOR × REGIÃO (cidade OU estado).
--
-- RASCUNHO PARA APROVAÇÃO (gate de schema). Não aplicar sem OK do Bione.
--
-- Objetivo: célula e cidade_coletada passam a representar escopo em nível
-- MUNICÍPIO ou ESTADO, e ganham o eixo de SEGMENTOS (setor). Assim a célula
-- vira literalmente "setor × região", e a ingestão pode filtrar por ambos.
--
-- Nada destrutivo: só ADICIONA colunas/constraints e RELAXA NOT NULL.
-- Linhas existentes viram nivel='municipio', segmentos='{}' (= todos, legado)
-- até o cliente definir o escopo na UI de Monitoramento.

begin;

-- ===================== celula (por tenant) =====================
alter table celula add column if not exists nivel     text   not null default 'municipio';
alter table celula add column if not exists segmentos text[] not null default '{}';

-- estado não tem município → relaxa NOT NULL do codigo_ibge
alter table celula alter column codigo_ibge drop not null;

-- nível válido
alter table celula drop constraint if exists celula_nivel_chk;
alter table celula add  constraint celula_nivel_chk check (nivel in ('municipio','estado'));

-- coerência região × nível: município exige ibge; estado exige ibge nulo + uf
alter table celula drop constraint if exists celula_escopo_chk;
alter table celula add  constraint celula_escopo_chk check (
  (nivel = 'municipio' and codigo_ibge is not null) or
  (nivel = 'estado'    and codigo_ibge is null and uf is not null)
);

-- a unique antiga (tenant_id, codigo_ibge) não cobre estado (ibge nulo).
-- Troca por índice único por escopo: tenant × uf × (ibge ou '*' p/ estado).
alter table celula drop constraint if exists celula_tenant_id_codigo_ibge_key;
create unique index if not exists celula_escopo_ux
  on celula (tenant_id, uf, coalesce(codigo_ibge, '*'));

-- ============== cidade_coletada (registro GLOBAL de coleta) ==============
alter table cidade_coletada add column if not exists nivel     text   not null default 'municipio';
alter table cidade_coletada add column if not exists segmentos text[] not null default '{}';

-- PK era codigo_ibge (não serve p/ estado). Vira surrogate + índice por escopo.
-- ORDEM IMPORTA: dropar a PK ANTES de relaxar o NOT NULL (PK é implicitamente NOT NULL).
alter table cidade_coletada add column if not exists id uuid not null default gen_random_uuid();
alter table cidade_coletada drop constraint if exists cidade_coletada_pkey;
alter table cidade_coletada add  constraint cidade_coletada_pkey primary key (id);
alter table cidade_coletada alter column codigo_ibge drop not null;
alter table cidade_coletada drop constraint if exists cidade_coletada_nivel_chk;
alter table cidade_coletada add  constraint cidade_coletada_nivel_chk check (nivel in ('municipio','estado'));
create unique index if not exists cidade_coletada_escopo_ux
  on cidade_coletada (uf, coalesce(codigo_ibge, '*'));

commit;

-- Reversão (se preciso): drop das colunas nivel/segmentos/id, restaurar NOT NULL
-- e a PK/unique antigas. Guardado fora desta migração para manter o forward limpo.
