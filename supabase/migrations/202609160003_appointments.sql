-- Minimal appointments calendar for /app/agendamentos (workspace-scoped + RLS).

create table public.appointments (
  id bigint generated always as identity primary key,
  workspace_id bigint not null references public.workspaces (id) on delete cascade,
  lead_id bigint references public.leads (id) on delete set null,
  title text not null check (char_length(title) between 1 and 200),
  notes text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  status text not null default 'scheduled'
    check (status in ('scheduled', 'pending', 'completed', 'cancelled')),
  created_by uuid not null default auth.uid() references auth.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or ends_at >= starts_at)
);

create index appointments_workspace_starts_idx
  on public.appointments (workspace_id, starts_at);

create index appointments_workspace_status_idx
  on public.appointments (workspace_id, status);

create trigger appointments_set_updated_at
before update on public.appointments
for each row execute function private.set_updated_at();

alter table public.appointments enable row level security;

revoke all on table public.appointments from anon, authenticated;
grant select, insert, update, delete on table public.appointments to authenticated;
grant usage, select on sequence public.appointments_id_seq to authenticated;

create policy "members manage appointments" on public.appointments
for all to authenticated
using (workspace_id in (select private.user_workspace_ids()))
with check (workspace_id in (select private.user_workspace_ids()));
