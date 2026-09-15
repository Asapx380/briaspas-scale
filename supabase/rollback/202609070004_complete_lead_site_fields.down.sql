drop function if exists public.get_published_lead_site(text);

drop index if exists public.leads_workspace_visits_idx;
drop index if exists public.leads_workspace_follow_up_idx;
drop index if exists public.leads_slug_key;

alter table public.leads
  drop column if exists site_generated_at,
  drop column if exists site_schema,
  drop column if exists site_html,
  drop column if exists site_status,
  drop column if exists last_visited_at,
  drop column if exists visit_count,
  drop column if exists photos,
  drop column if exists slug,
  drop column if exists follow_up_at;
