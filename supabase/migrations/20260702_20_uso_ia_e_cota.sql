-- 20: medição de uso de IA por tenant/mês + cota (decisão 6 do PRD do agente).
-- Runtime faz upsert via service role a cada run; tela "Uso de IA" lê daqui.
create table public.uso_ia (
  id bigint generated always as identity primary key,
  org_id uuid not null references public.organizacoes(id),
  periodo date not null,                          -- primeiro dia do mês
  interacoes integer not null default 0,
  tokens_entrada bigint not null default 0,
  tokens_saida bigint not null default 0,
  custo_usd numeric(14,6) not null default 0,
  atualizado_em timestamptz not null default now(),
  unique (org_id, periodo)
);
alter table public.uso_ia enable row level security;
create policy uso_ia_select_membro on public.uso_ia
  for select using (public.is_org_member(org_id));
create index idx_uso_ia_org on public.uso_ia (org_id, periodo desc);

alter table public.organizacoes
  add column if not exists cota_mensal_ia integer not null default 200;
comment on column public.organizacoes.cota_mensal_ia is 'Interações de agente incluídas/mês no contrato de consultoria. Excedente = upsell (PRD agente, decisão 6).';

-- Incremento atômico usado pelo runtime
create or replace function public.incrementar_uso_ia(
  p_org uuid, p_tokens_in bigint, p_tokens_out bigint, p_custo numeric
) returns void
language sql security definer set search_path = public as $$
  insert into public.uso_ia (org_id, periodo, interacoes, tokens_entrada, tokens_saida, custo_usd)
  values (p_org, date_trunc('month', now())::date, 1, p_tokens_in, p_tokens_out, p_custo)
  on conflict (org_id, periodo) do update set
    interacoes = uso_ia.interacoes + 1,
    tokens_entrada = uso_ia.tokens_entrada + excluded.tokens_entrada,
    tokens_saida = uso_ia.tokens_saida + excluded.tokens_saida,
    custo_usd = uso_ia.custo_usd + excluded.custo_usd,
    atualizado_em = now();
$$;
-- só o runtime (service role) chama; nunca o browser
revoke execute on function public.incrementar_uso_ia(uuid, bigint, bigint, numeric) from public, anon, authenticated;
