drop policy if exists "members insert whatsapp messages" on public.whatsapp_messages;
drop policy if exists "members read whatsapp messages" on public.whatsapp_messages;
drop policy if exists "members manage whatsapp conversations" on public.whatsapp_conversations;
drop policy if exists "members update notifications" on public.workspace_notifications;
drop policy if exists "members read notifications" on public.workspace_notifications;

drop table if exists public.whatsapp_messages;
drop table if exists public.whatsapp_conversations;
drop table if exists public.workspace_notifications;

alter table public.leads
  drop column if exists ai_outreach,
  drop column if exists ai_diagnosis;

drop function if exists public.track_public_lead_site_visit(text, text, text, text, text, text, boolean);
drop function if exists public.track_public_lead_site_visit(text, text, text, text, text, text);

-- Restaura assinatura anterior (somente publicados).
create or replace function public.track_public_lead_site_visit(
  target_slug text,
  target_session_hash text,
  target_referrer_host text default null,
  target_utm_source text default null,
  target_utm_medium text default null,
  target_utm_campaign text default null
)
returns boolean
language plpgsql security definer set search_path = public
as $$
declare
  target_lead_id bigint;
  inserted_id bigint;
begin
  if target_session_hash !~ '^[0-9a-f]{64}$' then return false; end if;
  select id into target_lead_id from public.leads
  where slug = target_slug and site_status = 'published' limit 1;
  if target_lead_id is null then return false; end if;

  insert into public.site_visit_sessions (
    lead_id, session_hash, referrer_host, utm_source, utm_medium, utm_campaign
  ) values (
    target_lead_id, target_session_hash,
    left(target_referrer_host, 255), left(target_utm_source, 120),
    left(target_utm_medium, 120), left(target_utm_campaign, 120)
  ) on conflict (lead_id, session_hash, viewed_on) do nothing
  returning id into inserted_id;

  if inserted_id is not null then
    update public.leads set visit_count = visit_count + 1, last_visited_at = now()
    where id = target_lead_id;
    return true;
  end if;
  return false;
end;
$$;

revoke all on function public.track_public_lead_site_visit(text, text, text, text, text, text) from public;
grant execute on function public.track_public_lead_site_visit(text, text, text, text, text, text) to anon, authenticated;
