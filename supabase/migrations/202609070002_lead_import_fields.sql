-- Campos necessários para importação do Maps2Sheets e futuras fontes de leads.

alter table public.leads
  add column website_url text,
  add column google_maps_url text,
  add column rating numeric(2, 1) check (rating between 0 and 5),
  add column review_count integer check (review_count >= 0),
  add column source text not null default 'manual' check (
    source in ('manual', 'maps2sheets', 'google_places', 'openstreetmap', 'foursquare')
  ),
  add column source_ref text;

update public.leads
set source = 'google_places', source_ref = google_place_id
where google_place_id is not null;

create unique index leads_workspace_source_ref_key
  on public.leads (workspace_id, source, source_ref);

create index leads_workspace_source_created_at_idx
  on public.leads (workspace_id, source, created_at desc);
