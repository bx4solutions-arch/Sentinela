-- 22: watchdog de runs órfãos (achado do teste de usabilidade 02/07/2026).
-- Edge Function morta por timeout (504/546) nunca fecha o harvester_run →
-- linha fica "em_execucao" pra sempre e polui métricas/telas.
create or replace function public.fechar_runs_orfaos() returns integer
language sql security definer set search_path = public as $$
  with fechados as (
    update harvester_runs
      set status = 'erro',
          finalizado_em = now(),
          erros = erros || jsonb_build_array(jsonb_build_object(
            'etapa','watchdog',
            'mensagem','Run órfão: função morreu sem fechar o run (timeout provável). Fechado automaticamente após 30min.'))
      where status = 'em_execucao' and iniciado_em < now() - interval '30 minutes'
      returning id)
  select count(*)::integer from fechados;
$$;
revoke execute on function public.fechar_runs_orfaos() from public, anon, authenticated;

select cron.schedule('watchdog-runs-orfaos', '*/30 * * * *', 'select public.fechar_runs_orfaos();');

-- higiene imediata: fecha os presos agora
select public.fechar_runs_orfaos();
