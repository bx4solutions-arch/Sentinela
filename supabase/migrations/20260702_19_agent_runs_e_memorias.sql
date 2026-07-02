-- 19: agent_runs (state machine de execução do agente) + memorias (camada 2
-- do aprendizado — explícita, visível e editável pelo tenant).
create table public.agent_runs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizacoes(id),
  usuario_id uuid,
  superficie text not null default 'chat' check (superficie in ('chat','tela','rotina')),
  status text not null default 'planejando'
    check (status in ('planejando','executando','aguardando_confirmacao','concluida','falhou')),
  entrada jsonb not null default '{}'::jsonb,     -- pergunta + contexto injetado
  plano jsonb,                                    -- plano do modelo (quando houver)
  passos jsonb not null default '[]'::jsonb,      -- tool calls executadas [{tool, input, output_resumo, ms}]
  proposta_write jsonb,                           -- write pendente (Fase C: confirmação lê DAQUI, nunca re-gera)
  resposta jsonb,                                 -- blocos {widget, props} + takeaway (Fase B)
  erro text,
  provider text,
  modelo text,
  tokens_entrada integer not null default 0,
  tokens_saida integer not null default 0,
  custo_usd numeric(12,6) not null default 0,
  criado_em timestamptz not null default now(),
  finalizado_em timestamptz
);
comment on table public.agent_runs is 'Cada execução do agente. State machine no dado (TDR Parte 10). Escrita só pelo runtime (service role); tenant lê as próprias.';
alter table public.agent_runs enable row level security;
create policy agent_runs_select_membro on public.agent_runs
  for select using (public.is_org_member(org_id));
create index idx_agent_runs_org on public.agent_runs (org_id, criado_em desc);
create index idx_agent_runs_status on public.agent_runs (status) where status in ('executando','aguardando_confirmacao');

create table public.memorias (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizacoes(id),
  tipo text not null default 'fato' check (tipo in ('preferencia','fato','restricao')),
  conteudo text not null,
  fonte_run_id uuid references public.agent_runs(id),
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
comment on table public.memorias is 'Memória explícita do agente (camada 2). Cliente VÊ e EDITA (princípio 7) — CRUD completo por membro da org. Injetada no system prompt quando ativo=true.';
alter table public.memorias enable row level security;
create policy memorias_select_membro on public.memorias for select using (public.is_org_member(org_id));
create policy memorias_insert_membro on public.memorias for insert with check (public.is_org_member(org_id));
create policy memorias_update_membro on public.memorias for update using (public.is_org_member(org_id));
create policy memorias_delete_membro on public.memorias for delete using (public.is_org_member(org_id));
create index idx_memorias_org_ativa on public.memorias (org_id) where ativo;
