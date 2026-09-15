drop index if exists public.leads_workspace_email_idx;

alter table public.leads
  drop column if exists longitude,
  drop column if exists latitude,
  drop column if exists twitter,
  drop column if exists facebook_id,
  drop column if exists instagram,
  drop column if exists email;

