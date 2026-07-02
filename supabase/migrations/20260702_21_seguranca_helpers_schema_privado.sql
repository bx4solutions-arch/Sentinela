-- 21: tira os helpers de RLS da superfície da API REST (advisor 0029).
-- Mover de schema preserva o OID — todas as políticas existentes continuam
-- válidas. PostgREST só expõe o schema public, então /rest/v1/rpc/is_* some.
-- EXECUTE continua concedido (as políticas rodam como o role consultante).
-- ATENÇÃO: novas políticas a partir daqui referenciam app_privado.is_org_member.
create schema if not exists app_privado;
grant usage on schema app_privado to authenticated, anon;

alter function public.is_org_member(uuid) set schema app_privado;
alter function public.is_org_admin(uuid) set schema app_privado;
alter function public.is_cnpj_member(text) set schema app_privado;
