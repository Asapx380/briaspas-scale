-- Briaspas Scale: esquema inicial do CRM.
-- Esta migration cria perfis, workspaces, membros e leads com RLS.

create schema if not exists private;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspaces (
  id bigint generated always as identity primary key,
  name text not null check (char_length(name) between 1 and 120),
  owner_id uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspace_members (
  workspace_id bigint not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'seller' check (role in ('owner', 'admin', 'seller')),
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create table public.leads (
  id bigint generated always as identity primary key,
  workspace_id bigint not null references public.workspaces (id) on delete cascade,
  google_place_id text,
  company_name text not null check (char_length(company_name) between 1 and 200),
  phone text,
  address text,
  niche text,
  city text,
  status text not null default 'new' check (
    status in (
      'new',
      'contacted',
      'replied',
      'hot',
      'proposal',
      'won',
      'lost'
    )
  ),
  notes text,
  estimated_value numeric(12, 2) check (estimated_value >= 0),
  assigned_to uuid references auth.users (id) on delete set null,
  created_by uuid not null default auth.uid() references auth.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index leads_workspace_google_place_id_key
  on public.leads (workspace_id, google_place_id)
  where google_place_id is not null;

create index leads_workspace_status_created_at_idx
  on public.leads (workspace_id, status, created_at desc);

create index leads_assigned_to_idx
  on public.leads (assigned_to)
  where assigned_to is not null;

create index workspace_members_user_id_idx
  on public.workspace_members (user_id, workspace_id);

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function private.set_updated_at();

create trigger workspaces_set_updated_at
before update on public.workspaces
for each row execute function private.set_updated_at();

create trigger leads_set_updated_at
before update on public.leads
for each row execute function private.set_updated_at();

create or replace function private.user_workspace_ids()
returns setof bigint
language sql
security definer
set search_path = ''
stable
as $$
  select workspace_id
  from public.workspace_members
  where user_id = (select auth.uid());
$$;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  created_workspace_id bigint;
  display_name text;
begin
  display_name := coalesce(
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(split_part(new.email, '@', 1), ''),
    'Novo usuário'
  );

  insert into public.profiles (id, full_name)
  values (new.id, display_name);

  insert into public.workspaces (name, owner_id)
  values (display_name || ' Workspace', new.id)
  returning id into created_workspace_id;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (created_workspace_id, new.id, 'owner');

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.handle_new_user();

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.leads enable row level security;

revoke all on table public.profiles from anon, authenticated;
revoke all on table public.workspaces from anon, authenticated;
revoke all on table public.workspace_members from anon, authenticated;
revoke all on table public.leads from anon, authenticated;

grant select, update on table public.profiles to authenticated;
grant select on table public.workspaces to authenticated;
grant select on table public.workspace_members to authenticated;
grant select, insert, update, delete on table public.leads to authenticated;
grant usage, select on sequence public.workspaces_id_seq to authenticated;
grant usage, select on sequence public.leads_id_seq to authenticated;

revoke all on function private.user_workspace_ids() from public;
revoke all on function private.handle_new_user() from public;
grant usage on schema private to authenticated;
grant execute on function private.user_workspace_ids() to authenticated;

create policy "users read own profile"
on public.profiles
for select
to authenticated
using ((select auth.uid()) = id);

create policy "users update own profile"
on public.profiles
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy "members read workspaces"
on public.workspaces
for select
to authenticated
using (id in (select private.user_workspace_ids()));

create policy "members read workspace membership"
on public.workspace_members
for select
to authenticated
using (workspace_id in (select private.user_workspace_ids()));

create policy "members read leads"
on public.leads
for select
to authenticated
using (workspace_id in (select private.user_workspace_ids()));

create policy "members create leads"
on public.leads
for insert
to authenticated
with check (
  workspace_id in (select private.user_workspace_ids())
  and created_by = (select auth.uid())
);

create policy "members update leads"
on public.leads
for update
to authenticated
using (workspace_id in (select private.user_workspace_ids()))
with check (workspace_id in (select private.user_workspace_ids()));

create policy "members delete leads"
on public.leads
for delete
to authenticated
using (workspace_id in (select private.user_workspace_ids()));
