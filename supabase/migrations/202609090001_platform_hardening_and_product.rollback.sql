-- Rollback manual da migration 202609090001.
drop trigger if exists leads_set_won_at on public.leads;
drop function if exists private.set_lead_won_at();
alter table public.leads drop column if exists won_at;
drop function if exists public.resolve_custom_domain(text);
drop function if exists public.track_public_lead_site_visit(text, text, text, text, text, text);
drop function if exists public.get_published_lead_site_v2(text);
drop policy if exists "workspace members read teammate profiles" on public.profiles;
drop table if exists public.google_connections cascade;
drop table if exists public.custom_domains cascade;
drop table if exists public.project_tasks cascade;
drop table if exists public.projects cascade;
drop table if exists public.site_visit_sessions cascade;
drop table if exists public.generation_runs cascade;
