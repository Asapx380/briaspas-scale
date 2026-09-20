-- Teste transacional da RPC track_public_lead_site_visit (T9).
-- Requer migrations aplicadas (incl. 202609200001) e ao menos um workspace_member.
-- Uso: psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/hot_lead_visit_rpc.sql

\set ON_ERROR_STOP on

begin;

do $$
declare
  v_workspace_id bigint;
  v_user_id uuid;
  v_lead_id bigint;
  v_slug text := 't9-sql-test-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 16);
  v_hash1 text := repeat('a', 64);
  v_hash2 text := repeat('b', 64);
  v_hash3 text := repeat('c', 64);
  v_preview_hash text := repeat('d', 64);
  v_notifications integer;
  v_status text;
  v_viewed_on date;
begin
  select wm.workspace_id, wm.user_id
  into v_workspace_id, v_user_id
  from public.workspace_members wm
  limit 1;

  if v_workspace_id is null then
    raise exception 'hot_lead_visit_rpc_test: nenhum workspace_member — pule ou cadastre um usuário';
  end if;

  insert into public.leads (
    workspace_id, company_name, slug, site_status, status, created_by
  ) values (
    v_workspace_id, 'Empresa T9 SQL Test', v_slug, 'published', 'new', v_user_id
  )
  returning id into v_lead_id;

  if not public.track_public_lead_site_visit(v_slug, v_hash1, null, null, null, null, false) then
    raise exception 'primeira visita deveria registrar';
  end if;

  select count(*) into v_notifications
  from public.workspace_notifications
  where lead_id = v_lead_id and kind = 'hot_lead_visit';

  if v_notifications <> 0 then
    raise exception 'primeira visita não deve notificar (got %)', v_notifications;
  end if;

  if not public.track_public_lead_site_visit(v_slug, v_hash2, null, null, null, null, false) then
    raise exception 'segunda visita deveria registrar';
  end if;

  select count(*) into v_notifications
  from public.workspace_notifications
  where lead_id = v_lead_id and kind = 'hot_lead_visit';

  if v_notifications <> 1 then
    raise exception 'segunda visita deve gerar 1 notificação (got %)', v_notifications;
  end if;

  if not public.track_public_lead_site_visit(v_slug, v_hash3, null, null, null, null, false) then
    raise exception 'terceira visita deveria registrar';
  end if;

  select count(*) into v_notifications
  from public.workspace_notifications
  where lead_id = v_lead_id and kind = 'hot_lead_visit';

  if v_notifications <> 1 then
    raise exception 'terceira visita não deve duplicar notificação (got %)', v_notifications;
  end if;

  select viewed_on into v_viewed_on
  from public.site_visit_sessions
  where lead_id = v_lead_id
  order by id desc
  limit 1;

  if v_viewed_on is distinct from (timezone('America/Sao_Paulo', now()))::date then
    raise exception 'viewed_on deve usar America/Sao_Paulo (got %)', v_viewed_on;
  end if;

  update public.leads set status = 'new' where id = v_lead_id;

  if not public.track_public_lead_site_visit(v_slug, v_preview_hash, null, null, null, null, true) then
    raise exception 'prévia deveria registrar visita';
  end if;

  select status into v_status from public.leads where id = v_lead_id;

  if v_status <> 'new' then
    raise exception 'prévia não deve promover para hot (status=%)', v_status;
  end if;

  select count(*) into v_notifications
  from public.workspace_notifications
  where lead_id = v_lead_id and kind = 'hot_lead_visit';

  if v_notifications <> 1 then
    raise exception 'prévia não deve criar notificação hot_lead_visit (got %)', v_notifications;
  end if;

  raise notice 'hot_lead_visit_rpc_test: ok';
end $$;

rollback;
