-- 18: eventos — telemetria append-only (TDR: "a decisão mais barata e mais
-- irreversível do projeto"; histórico não tem backfill).
-- Toda ação relevante (busca, clique, adicionar/dispensar, run de agente)
-- vira uma linha. Jobs assíncronos de aprendizado consomem daqui.
create table public.eventos (
  id bigint generated always as identity primary key,
  org_id uuid references public.organizacoes(id),
  usuario_id uuid,
  tipo text not null,                -- ex.: 'tool_executada','alvo_adicionado','alvo_dispensado','agent_run'
  entidade_tipo text,                -- ex.: 'licitacao','orgao','agent_run'
  entidade_id text,
  payload jsonb not null default '{}'::jsonb,
  criado_em timestamptz not null default now()
);
comment on table public.eventos is 'Telemetria append-only. NUNCA update/delete (revogados). Camada 3 do aprendizado (feedback implícito) lê daqui.';

alter table public.eventos enable row level security;
create policy eventos_select_membro on public.eventos
  for select using (org_id is not null and public.is_org_member(org_id));
create policy eventos_insert_membro on public.eventos
  for insert with check (org_id is not null and public.is_org_member(org_id));
revoke update, delete on public.eventos from authenticated, anon;

create index idx_eventos_org_data on public.eventos (org_id, criado_em desc);
create index idx_eventos_tipo on public.eventos (tipo, criado_em desc);
create index idx_eventos_brin on public.eventos using brin (criado_em);
