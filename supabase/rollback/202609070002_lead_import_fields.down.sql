drop index if exists public.leads_workspace_source_created_at_idx;
drop index if exists public.leads_workspace_source_ref_key;

alter table public.leads
  drop column if exists source_ref,
  drop column if exists source,
  drop column if exists review_count,
  drop column if exists rating,
  drop column if exists google_maps_url,
  drop column if exists website_url;
