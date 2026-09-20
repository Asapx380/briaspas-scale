-- Lixeira recuperável para leads. Nenhum registro existente é removido.
alter table public.leads
  add column if not exists deleted_at timestamptz;

-- Mantém a listagem ativa rápida sem afetar o histórico na lixeira.
create index if not exists leads_workspace_active_created_at_idx
  on public.leads (workspace_id, created_at desc)
  where deleted_at is null;

create index if not exists leads_workspace_deleted_at_idx
  on public.leads (workspace_id, deleted_at desc)
  where deleted_at is not null;
