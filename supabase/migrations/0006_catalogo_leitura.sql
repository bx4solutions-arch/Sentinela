-- Catálogo público do PNCP (orgao/raw_editais/raw_pca): leitura liberada.
-- O projeto força RLS em tabelas novas; sem policy elas ficavam invisíveis ao app.
-- São dados públicos (não-tenant) → policy de SELECT permissiva. Escrita só via service_role.

do $$ begin
  create policy catalogo_read on raw_editais for select using (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy catalogo_read on raw_pca for select using (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy catalogo_read on orgao for select using (true);
exception when duplicate_object then null; end $$;
