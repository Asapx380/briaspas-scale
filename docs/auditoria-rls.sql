-- Execute autenticado com usuários de workspaces diferentes.
-- Todas as consultas devem retornar apenas registros do workspace do usuário atual.
select * from public.leads;
select * from public.projects;
select * from public.project_tasks;
select * from public.generation_runs;
select * from public.site_visit_sessions;
select * from public.custom_domains;
