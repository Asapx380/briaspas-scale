-- Dados adicionais retornados por fontes automáticas de empresas.

alter table public.leads
  add column email text,
  add column instagram text,
  add column facebook_id text,
  add column twitter text,
  add column latitude double precision check (latitude between -90 and 90),
  add column longitude double precision check (longitude between -180 and 180);

create index leads_workspace_email_idx
  on public.leads (workspace_id, lower(email))
  where email is not null;

