-- Campos de operação comercial, geração de site e medição de visitas.

alter table public.leads
  add column follow_up_at timestamptz,
  add column slug text,
  add column photos jsonb not null default '[]'::jsonb check (jsonb_typeof(photos) = 'array'),
  add column visit_count bigint not null default 0 check (visit_count >= 0),
  add column last_visited_at timestamptz,
  add column site_status text not null default 'not_generated' check (
    site_status in ('not_generated', 'generating', 'ready', 'failed', 'published')
  ),
  add column site_html text,
  add column site_schema jsonb,
  add column site_generated_at timestamptz;

update public.leads
set slug = concat(
  nullif(trim(both '-' from regexp_replace(lower(company_name), '[^a-z0-9]+', '-', 'g')), ''),
  case when regexp_replace(lower(company_name), '[^a-z0-9]+', '', 'g') = '' then 'empresa-' else '-' end,
  id
)
where slug is null;

alter table public.leads alter column slug set not null;

create unique index leads_slug_key
  on public.leads (slug)
  where slug is not null;

create index leads_workspace_follow_up_idx
  on public.leads (workspace_id, follow_up_at)
  where follow_up_at is not null;

create index leads_workspace_visits_idx
  on public.leads (workspace_id, visit_count desc);

-- Esta função é a única leitura pública dos leads. Ela devolve somente
-- sites publicados e registra a visita no mesmo comando, sem expor o CRM.
create or replace function public.get_published_lead_site(target_slug text)
returns table (
  company_name text,
  address text,
  site_html text,
  site_schema jsonb,
  visit_count bigint
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  update public.leads as lead
  set
    visit_count = lead.visit_count + 1,
    last_visited_at = now()
  where lead.slug = target_slug
    and lead.site_status = 'published'
  returning
    lead.company_name,
    lead.address,
    lead.site_html,
    lead.site_schema,
    lead.visit_count;
end;
$$;

revoke all on function public.get_published_lead_site(text) from public;
grant execute on function public.get_published_lead_site(text) to anon, authenticated;
