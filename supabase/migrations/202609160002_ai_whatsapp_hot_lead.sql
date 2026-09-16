-- Diagnóstico/outreach de IA e notificações de lead quente (visita ao demo).

alter table public.leads
  add column if not exists ai_diagnosis jsonb,
  add column if not exists ai_outreach jsonb;

create table if not exists public.workspace_notifications (
  id bigint generated always as identity primary key,
  workspace_id bigint not null references public.workspaces(id) on delete cascade,
  lead_id bigint references public.leads(id) on delete cascade,
  kind text not null check (kind in ('hot_lead_visit', 'whatsapp_inbound', 'system')),
  title text not null,
  body text not null,
  metadata jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists workspace_notifications_workspace_created_idx
  on public.workspace_notifications (workspace_id, created_at desc);

create index if not exists workspace_notifications_unread_idx
  on public.workspace_notifications (workspace_id, created_at desc)
  where read_at is null;

alter table public.workspace_notifications enable row level security;

revoke all on table public.workspace_notifications from anon, authenticated;
grant select, update on table public.workspace_notifications to authenticated;

create policy "members read notifications" on public.workspace_notifications
  for select to authenticated
  using (workspace_id in (select private.user_workspace_ids()));

create policy "members update notifications" on public.workspace_notifications
  for update to authenticated
  using (workspace_id in (select private.user_workspace_ids()))
  with check (workspace_id in (select private.user_workspace_ids()));

drop function if exists public.track_public_lead_site_visit(text, text, text, text, text, text);

-- Visitas em site publicado OU pré-visualização (demo) geram alerta de lead quente.
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

-- Conversas WhatsApp (stub local + webhook Meta)
create table if not exists public.whatsapp_conversations (
  id bigint generated always as identity primary key,
  workspace_id bigint not null references public.workspaces(id) on delete cascade,
  lead_id bigint references public.leads(id) on delete set null,
  wa_contact_id text not null,
  contact_name text,
  contact_phone text,
  status text not null default 'open' check (status in ('open', 'paused', 'closed')),
  agent_enabled boolean not null default true,
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  unique (workspace_id, wa_contact_id)
);

create table if not exists public.whatsapp_messages (
  id bigint generated always as identity primary key,
  conversation_id bigint not null references public.whatsapp_conversations(id) on delete cascade,
  direction text not null check (direction in ('inbound', 'outbound')),
  body text not null,
  wa_message_id text,
  status text not null default 'sent' check (status in ('queued', 'sent', 'delivered', 'read', 'failed', 'received')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists whatsapp_messages_conversation_created_idx
  on public.whatsapp_messages (conversation_id, created_at asc);

alter table public.whatsapp_conversations enable row level security;
alter table public.whatsapp_messages enable row level security;

revoke all on table public.whatsapp_conversations, public.whatsapp_messages from anon, authenticated;
grant select, insert, update on table public.whatsapp_conversations to authenticated;
grant select, insert on table public.whatsapp_messages to authenticated;

create policy "members manage whatsapp conversations" on public.whatsapp_conversations
  for all to authenticated
  using (workspace_id in (select private.user_workspace_ids()))
  with check (workspace_id in (select private.user_workspace_ids()));

create policy "members read whatsapp messages" on public.whatsapp_messages
  for select to authenticated
  using (
    conversation_id in (
      select id from public.whatsapp_conversations
      where workspace_id in (select private.user_workspace_ids())
    )
  );

create policy "members insert whatsapp messages" on public.whatsapp_messages
  for insert to authenticated
  with check (
    conversation_id in (
      select id from public.whatsapp_conversations
      where workspace_id in (select private.user_workspace_ids())
    )
  );

create or replace function public.ingest_whatsapp_inbound(
  target_workspace_id bigint,
  target_wa_contact_id text,
  target_contact_name text default null,
  target_body text default null,
  target_wa_message_id text default null
)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  conversation public.whatsapp_conversations%rowtype;
  inbound_id bigint;
begin
  if target_workspace_id is null or target_wa_contact_id is null or length(trim(target_wa_contact_id)) = 0 then
    return jsonb_build_object('ok', false, 'error', 'invalid_input');
  end if;

  insert into public.whatsapp_conversations (
    workspace_id, wa_contact_id, contact_name, contact_phone, last_message_at
  ) values (
    target_workspace_id,
    left(trim(target_wa_contact_id), 80),
    left(target_contact_name, 200),
    left(trim(target_wa_contact_id), 80),
    now()
  )
  on conflict (workspace_id, wa_contact_id) do update
    set
      contact_name = coalesce(excluded.contact_name, public.whatsapp_conversations.contact_name),
      last_message_at = now()
  returning * into conversation;

  if target_body is not null and length(trim(target_body)) > 0 then
    insert into public.whatsapp_messages (conversation_id, direction, body, wa_message_id, status)
    values (conversation.id, 'inbound', left(trim(target_body), 4000), target_wa_message_id, 'received')
    returning id into inbound_id;

    insert into public.workspace_notifications (workspace_id, lead_id, kind, title, body, metadata)
    values (
      conversation.workspace_id,
      conversation.lead_id,
      'whatsapp_inbound',
      'Nova mensagem no WhatsApp',
      left(format('%s: %s', coalesce(conversation.contact_name, conversation.wa_contact_id), trim(target_body)), 280),
      jsonb_build_object('conversationId', conversation.id, 'waContactId', conversation.wa_contact_id)
    );
  end if;

  return jsonb_build_object(
    'ok', true,
    'conversationId', conversation.id,
    'workspaceId', conversation.workspace_id,
    'leadId', conversation.lead_id,
    'agentEnabled', conversation.agent_enabled,
    'inboundMessageId', inbound_id
  );
end;
$$;

revoke all on function public.ingest_whatsapp_inbound(bigint, text, text, text, text) from public;
grant execute on function public.ingest_whatsapp_inbound(bigint, text, text, text, text) to anon, authenticated;

create or replace function public.append_whatsapp_outbound(
  target_conversation_id bigint,
  target_body text,
  target_wa_message_id text default null,
  target_status text default 'sent',
  target_metadata jsonb default '{}'::jsonb
)
returns boolean
language plpgsql security definer set search_path = public
as $$
begin
  if target_conversation_id is null or target_body is null then return false; end if;
  insert into public.whatsapp_messages (conversation_id, direction, body, wa_message_id, status, metadata)
  values (
    target_conversation_id,
    'outbound',
    left(trim(target_body), 4000),
    target_wa_message_id,
    coalesce(nullif(target_status, ''), 'sent'),
    coalesce(target_metadata, '{}'::jsonb)
  );
  update public.whatsapp_conversations
  set last_message_at = now()
  where id = target_conversation_id;
  return true;
end;
$$;

revoke all on function public.append_whatsapp_outbound(bigint, text, text, text, jsonb) from public;
grant execute on function public.append_whatsapp_outbound(bigint, text, text, text, jsonb) to anon, authenticated;
