-- Somente para ambiente de desenvolvimento vazio.
-- Em produção, crie uma nova migration forward-only em vez de executar este arquivo.

drop trigger if exists on_auth_user_created on auth.users;
drop function if exists private.handle_new_user();

drop table if exists public.leads;
drop table if exists public.workspace_members;
drop table if exists public.workspaces;
drop table if exists public.profiles;

drop function if exists private.user_workspace_ids();
drop function if exists private.set_updated_at();
drop schema if exists private;
