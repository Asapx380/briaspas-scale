-- Pré-visualização privada e temporária dos sites enviados.

alter table public.leads
  add column site_preview_token_hash text check (site_preview_token_hash is null or char_length(site_preview_token_hash) = 64),
  add column site_preview_expires_at timestamptz;

create policy "members read uploaded lead site files" on storage.objects for select to authenticated
using (
  bucket_id = 'lead-sites'
  and name ~ '^leads/[0-9]+/site/[0-9a-f-]+/.+'
  and exists (
    select 1 from public.leads
    where id = split_part(name, '/', 2)::bigint
      and workspace_id in (select private.user_workspace_ids())
  )
);
