-- Segurança, observabilidade, visitas únicas, projetos e integrações.

alter table public.leads add column won_at timestamptz;
update public.leads set won_at = updated_at where status = 'won' and won_at is null;
create or replace function private.set_lead_won_at()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if new.status = 'won' and old.status is distinct from 'won' then new.won_at = now(); end if;
  if new.status <> 'won' then new.won_at = null; end if;
  return new;
end;
$$;
create trigger leads_set_won_at before update of status on public.leads
for each row execute function private.set_lead_won_at();

create table public.generation_runs (
  id bigint generated always as identity primary key,
  workspace_id bigint not null references public.workspaces (id) on delete cascade,
  lead_id bigint not null references public.leads (id) on delete cascade,
  requested_by uuid not null references auth.users (id) on delete restrict,
  provider text not null,
  model text not null,
  status text not null check (status in ('succeeded', 'failed')),
  duration_ms integer not null check (duration_ms >= 0),
  design_attempts smallint not null default 0,
  html_attempts smallint not null default 0,
  prompt_tokens integer not null default 0,
  completion_tokens integer not null default 0,
  total_tokens integer not null default 0,
  estimated_cost_usd numeric(12, 6),
  error_code text,
  created_at timestamptz not null default now()
);

create index generation_runs_workspace_created_idx
  on public.generation_runs (workspace_id, created_at desc);

create table public.site_visit_sessions (
  id bigint generated always as identity primary key,
  lead_id bigint not null references public.leads (id) on delete cascade,
  session_hash text not null check (char_length(session_hash) = 64),
  viewed_on date not null default current_date,
  first_seen_at timestamptz not null default now(),
  referrer_host text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  unique (lead_id, session_hash, viewed_on)
);

create index site_visit_sessions_lead_date_idx
  on public.site_visit_sessions (lead_id, viewed_on desc);

create table public.projects (
  id bigint generated always as identity primary key,
  workspace_id bigint not null references public.workspaces (id) on delete cascade,
  lead_id bigint references public.leads (id) on delete set null,
  name text not null check (char_length(name) between 1 and 160),
  scope text,
  value numeric(12, 2) check (value >= 0),
  status text not null default 'planned' check (status in ('planned', 'active', 'paused', 'completed', 'cancelled')),
  assigned_to uuid references auth.users (id) on delete set null,
  starts_on date,
  due_on date,
  created_by uuid not null default auth.uid() references auth.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (due_on is null or starts_on is null or due_on >= starts_on)
);

create table public.project_tasks (
  id bigint generated always as identity primary key,
  project_id bigint not null references public.projects (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  description text,
  status text not null default 'todo' check (status in ('todo', 'doing', 'done', 'cancelled')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'urgent')),
  assigned_to uuid references auth.users (id) on delete set null,
  due_at timestamptz,
  estimate_minutes integer check (estimate_minutes >= 0),
  google_calendar_id text,
  google_event_id text,
  calendar_sync_status text not null default 'not_synced' check (calendar_sync_status in ('not_synced', 'pending', 'synced', 'failed')),
  calendar_last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index projects_workspace_status_idx on public.projects (workspace_id, status, due_on);
create index project_tasks_project_status_idx on public.project_tasks (project_id, status, due_at);

create table public.custom_domains (
  id bigint generated always as identity primary key,
  workspace_id bigint not null references public.workspaces (id) on delete cascade,
  lead_id bigint not null references public.leads (id) on delete cascade,
  hostname text not null,
  status text not null default 'pending' check (status in ('pending', 'verifying', 'active', 'failed')),
  verification_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (hostname),
  unique (lead_id)
);

create table public.google_connections (
  user_id uuid primary key references auth.users (id) on delete cascade,
  google_account_email text,
  encrypted_refresh_token bytea,
  scopes text[] not null default array[]::text[],
  expires_at timestamptz,
  status text not null default 'not_connected' check (status in ('not_connected', 'connected', 'expired', 'revoked', 'error')),
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger projects_set_updated_at before update on public.projects
for each row execute function private.set_updated_at();
create trigger project_tasks_set_updated_at before update on public.project_tasks
for each row execute function private.set_updated_at();
create trigger custom_domains_set_updated_at before update on public.custom_domains
for each row execute function private.set_updated_at();
create trigger google_connections_set_updated_at before update on public.google_connections
for each row execute function private.set_updated_at();

alter table public.generation_runs enable row level security;
alter table public.site_visit_sessions enable row level security;
alter table public.projects enable row level security;
alter table public.project_tasks enable row level security;
alter table public.custom_domains enable row level security;
alter table public.google_connections enable row level security;

revoke all on table public.generation_runs, public.site_visit_sessions, public.projects, public.project_tasks, public.custom_domains, public.google_connections from anon, authenticated;
grant select, insert on table public.generation_runs to authenticated;
grant select on table public.site_visit_sessions to authenticated;
grant select, insert, update, delete on table public.projects, public.project_tasks, public.custom_domains to authenticated;
grant select, insert, update, delete on table public.google_connections to authenticated;
grant usage, select on sequence public.generation_runs_id_seq, public.projects_id_seq, public.project_tasks_id_seq, public.custom_domains_id_seq to authenticated;

create policy "workspace members read teammate profiles" on public.profiles for select to authenticated
using (
  id in (
    select teammate.user_id
    from public.workspace_members mine
    join public.workspace_members teammate on teammate.workspace_id = mine.workspace_id
    where mine.user_id = (select auth.uid())
  )
);

create policy "members read generation runs" on public.generation_runs for select to authenticated
using (workspace_id in (select private.user_workspace_ids()));
create policy "members insert generation runs" on public.generation_runs for insert to authenticated
with check (workspace_id in (select private.user_workspace_ids()) and requested_by = (select auth.uid()));

create policy "members read visit sessions" on public.site_visit_sessions for select to authenticated
using (lead_id in (select id from public.leads where workspace_id in (select private.user_workspace_ids())));

create policy "members manage projects" on public.projects for all to authenticated
using (workspace_id in (select private.user_workspace_ids()))
with check (workspace_id in (select private.user_workspace_ids()));

create policy "members manage project tasks" on public.project_tasks for all to authenticated
using (project_id in (select id from public.projects where workspace_id in (select private.user_workspace_ids())))
with check (project_id in (select id from public.projects where workspace_id in (select private.user_workspace_ids())));

create policy "members manage custom domains" on public.custom_domains for all to authenticated
using (workspace_id in (select private.user_workspace_ids()))
with check (workspace_id in (select private.user_workspace_ids()));

create policy "users manage own google connection" on public.google_connections for all to authenticated
using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create or replace function public.get_published_lead_site_v2(target_slug text)
returns table (lead_id bigint, company_name text, address text, site_html text, site_schema jsonb, visit_count bigint)
language sql security definer set search_path = public stable
as $$
  select id, company_name, address, site_html, site_schema, visit_count
  from public.leads
  where slug = target_slug and site_status = 'published'
  limit 1;
$$;

revoke all on function public.get_published_lead_site_v2(text) from public;
grant execute on function public.get_published_lead_site_v2(text) to anon, authenticated;

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

create or replace function public.resolve_custom_domain(target_hostname text)
returns text language sql security definer set search_path = public stable
as $$
  select leads.slug
  from public.custom_domains
  join public.leads on leads.id = custom_domains.lead_id
  where custom_domains.hostname = lower(target_hostname)
    and custom_domains.status = 'active'
    and leads.site_status = 'published'
  limit 1;
$$;
revoke all on function public.resolve_custom_domain(text) from public;
grant execute on function public.resolve_custom_domain(text) to anon, authenticated;
