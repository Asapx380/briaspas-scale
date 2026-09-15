-- Briefing estruturado e arquivos enviados pelo operador.

alter table public.leads
  add column site_brief jsonb,
  add column brief_generated_at timestamptz,
  add column site_source text check (site_source in ('uploaded', 'generated')),
  add column site_storage_path text;

insert into storage.buckets (id, name, public)
values ('lead-sites', 'lead-sites', false)
on conflict (id) do nothing;

create policy "members upload lead site files" on storage.objects for insert to authenticated
with check (
  bucket_id = 'lead-sites'
  and name ~ '^leads/[0-9]+/site/[0-9a-f-]+/.+'
  and exists (
    select 1 from public.leads
    where id = split_part(name, '/', 2)::bigint
      and workspace_id in (select private.user_workspace_ids())
  )
);

create policy "members update lead site files" on storage.objects for update to authenticated
using (
  bucket_id = 'lead-sites'
  and name ~ '^leads/[0-9]+/site/[0-9a-f-]+/.+'
  and exists (
    select 1 from public.leads
    where id = split_part(name, '/', 2)::bigint
      and workspace_id in (select private.user_workspace_ids())
  )
);

create policy "members delete lead site files" on storage.objects for delete to authenticated
using (
  bucket_id = 'lead-sites'
  and name ~ '^leads/[0-9]+/site/[0-9a-f-]+/.+'
  and exists (
    select 1 from public.leads
    where id = split_part(name, '/', 2)::bigint
      and workspace_id in (select private.user_workspace_ids())
  )
);

-- Arquivos continuam privados: leitura só para site publicado no prefixo atualmente ativo.
create policy "public read published uploaded sites" on storage.objects for select to anon, authenticated
using (
  bucket_id = 'lead-sites'
  and exists (
    select 1 from public.leads
    where site_status = 'published'
      and site_source = 'uploaded'
      and name like site_storage_path || '/%'
  )
);

create or replace function public.get_published_lead_site_v3(target_slug text)
returns table (
  lead_id bigint, company_name text, address text, site_html text, site_schema jsonb,
  site_source text, site_storage_path text, visit_count bigint
)
language sql security definer set search_path = public stable
as $$
  select id, company_name, address, site_html, site_schema, site_source, site_storage_path, visit_count
  from public.leads
  where slug = target_slug and site_status = 'published'
  limit 1;
$$;

revoke all on function public.get_published_lead_site_v3(text) from public;
grant execute on function public.get_published_lead_site_v3(text) to anon, authenticated;
