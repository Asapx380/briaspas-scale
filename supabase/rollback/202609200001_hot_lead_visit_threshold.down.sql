drop index if exists public.site_visit_sessions_lead_first_seen_idx;

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
language plpgsql security definer set search_path = public
as $$
declare
  target_lead public.leads%rowtype;
  inserted_id bigint;
  notification_title text;
begin
  if target_session_hash !~ '^[0-9a-f]{64}$' then return false; end if;

  if target_is_preview then
    select * into target_lead from public.leads
    where slug = target_slug
      and site_status in ('ready', 'published')
    limit 1;
  else
    select * into target_lead from public.leads
    where slug = target_slug and site_status = 'published'
    limit 1;
  end if;

  if target_lead.id is null then return false; end if;

  insert into public.site_visit_sessions (
    lead_id, session_hash, referrer_host, utm_source, utm_medium, utm_campaign
  ) values (
    target_lead.id, target_session_hash,
    left(target_referrer_host, 255), left(target_utm_source, 120),
    left(target_utm_medium, 120), left(target_utm_campaign, 120)
  ) on conflict (lead_id, session_hash, viewed_on) do nothing
  returning id into inserted_id;

  if inserted_id is null then return false; end if;

  update public.leads
  set
    visit_count = visit_count + 1,
    last_visited_at = now(),
    status = case
      when status in ('won', 'lost', 'hot', 'proposal') then status
      else 'hot'
    end
  where id = target_lead.id;

  notification_title := case
    when target_is_preview then 'Lead abriu a prévia do site'
    else 'Lead visitou o site publicado'
  end;

  insert into public.workspace_notifications (workspace_id, lead_id, kind, title, body, metadata)
  values (
    target_lead.workspace_id,
    target_lead.id,
    'hot_lead_visit',
    notification_title,
    format('%s acabou de abrir o site demonstrativo. Priorize o contato agora.', target_lead.company_name),
    jsonb_build_object(
      'slug', target_slug,
      'isPreview', target_is_preview,
      'companyName', target_lead.company_name
    )
  );

  return true;
end;
$$;

revoke all on function public.track_public_lead_site_visit(text, text, text, text, text, text, boolean) from public;
grant execute on function public.track_public_lead_site_visit(text, text, text, text, text, text, boolean) to anon, authenticated;
