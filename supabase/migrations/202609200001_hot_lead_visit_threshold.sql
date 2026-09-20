-- T9: notificar lead quente somente com 2+ visitas em 24h e no máximo 1/dia.

create index if not exists site_visit_sessions_lead_first_seen_idx
  on public.site_visit_sessions (lead_id, first_seen_at desc);

create unique index if not exists workspace_notifications_hot_lead_one_per_lead_day_idx
  on public.workspace_notifications (
    lead_id,
    ((timezone('America/Sao_Paulo', created_at))::date)
  )
  where kind = 'hot_lead_visit' and lead_id is not null;

create or replace function public.track_public_lead_site_visit(
  target_slug text,
  target_session_hash text,
  target_referrer_host text default null,
  target_utm_source text default null,
  target_utm_medium text default null,
  target_utm_campaign text default null,
  target_is_preview boolean default false
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  target_lead public.leads%rowtype;
  inserted_id bigint;
  visits_24h integer;
  visit_day date;
  day_start timestamptz;
  min_visits constant integer := 2;
  lock_key constant integer := 947291;
begin
  if target_session_hash !~ '^[0-9a-f]{64}$' then
    return false;
  end if;

  visit_day := (timezone('America/Sao_Paulo', now()))::date;

  if target_is_preview then
    select * into target_lead
    from public.leads
    where slug = target_slug
      and site_status in ('ready', 'published')
    limit 1;
  else
    select * into target_lead
    from public.leads
    where slug = target_slug
      and site_status = 'published'
    limit 1;
  end if;

  if target_lead.id is null then
    return false;
  end if;

  insert into public.site_visit_sessions (
    lead_id,
    session_hash,
    viewed_on,
    referrer_host,
    utm_source,
    utm_medium,
    utm_campaign
  ) values (
    target_lead.id,
    target_session_hash,
    visit_day,
    left(target_referrer_host, 255),
    left(target_utm_source, 120),
    left(target_utm_medium, 120),
    left(target_utm_campaign, 120)
  )
  on conflict (lead_id, session_hash, viewed_on) do nothing
  returning id into inserted_id;

  if inserted_id is null then
    return false;
  end if;

  if target_is_preview then
    update public.leads
    set
      visit_count = visit_count + 1,
      last_visited_at = now()
    where id = target_lead.id;
    return true;
  end if;

  update public.leads
  set
    visit_count = visit_count + 1,
    last_visited_at = now(),
    status = case
      when status in ('won', 'lost', 'hot', 'proposal') then status
      else 'hot'
    end
  where id = target_lead.id;

  perform pg_advisory_xact_lock(
    lock_key,
    (target_lead.id % 2147483647)::integer
  );

  select count(*)::integer into visits_24h
  from public.site_visit_sessions
  where lead_id = target_lead.id
    and first_seen_at >= now() - interval '24 hours';

  if visits_24h < min_visits then
    return true;
  end if;

  day_start := (
    date_trunc(
      'day',
      timezone('America/Sao_Paulo', now())
    ) at time zone 'America/Sao_Paulo'
  );

  if exists (
    select 1
    from public.workspace_notifications n
    where n.lead_id = target_lead.id
      and n.kind = 'hot_lead_visit'
      and n.created_at >= day_start
  ) then
    return true;
  end if;

  insert into public.workspace_notifications (
    workspace_id, lead_id, kind, title, body, metadata
  ) values (
    target_lead.workspace_id,
    target_lead.id,
    'hot_lead_visit',
    format(
      'Lead %s abriu seu site %s vezes nas últimas 24 horas',
      target_lead.company_name,
      visits_24h
    ),
    'Priorize o contato — interesse repetido no site demonstrativo nas últimas 24 horas.',
    jsonb_build_object(
      'slug', target_slug,
      'isPreview', false,
      'visitCount24h', visits_24h,
      'companyName', target_lead.company_name
    )
  )
  on conflict do nothing;

  return true;
end;
$$;

revoke all on function public.track_public_lead_site_visit(text, text, text, text, text, text, boolean) from public;
grant execute on function public.track_public_lead_site_visit(text, text, text, text, text, text, boolean) to anon, authenticated;
