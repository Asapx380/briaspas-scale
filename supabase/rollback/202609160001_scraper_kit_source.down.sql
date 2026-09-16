alter table public.leads drop constraint if exists leads_source_check;

alter table public.leads
  add constraint leads_source_check check (
    source in (
      'manual',
      'maps2sheets',
      'google_places',
      'openstreetmap',
      'foursquare'
    )
  );
