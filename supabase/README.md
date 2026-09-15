# Banco de dados do Briaspas Scale

As alterações do banco ficam em `supabase/migrations`. Cada arquivo é uma mudança ordenada e imutável no PostgreSQL. Aplique na ordem do nome do arquivo.

## Migrations atuais

| Arquivo | Função |
| --- | --- |
| `202609070001_initial_crm_schema.sql` | Perfis, workspaces, membros, leads, triggers e RLS base |
| `202609070002_lead_import_fields.sql` | Campos de importação, origem e proteção contra duplicados |
| `202609070003_lead_enrichment_fields.sql` | E-mail, redes e coordenadas das fontes automáticas |
| `202609070004_complete_lead_site_fields.sql` | Follow-up, fotos, slug, visitas e publicação do site + função pública segura |
| `202609090001_platform_hardening_and_product.sql` | Endurecimento e tabelas de produto |
| `202609090002_site_briefs_and_uploaded_sites.sql` | Briefs e sites enviados/upload |
| `202609090003_private_site_preview.sql` | Preview privado do site |

Rollback da migration de produto: `202609090001_platform_hardening_and_product.rollback.sql`. Use só em banco de desenvolvimento.

## Aplicar no projeto remoto

Enquanto o Supabase CLI não estiver linkado, abra o SQL Editor do projeto de desenvolvimento e execute **uma migration por vez**, na ordem acima.

Fluxo preferido depois:

```bash
npx supabase login
npx supabase link --project-ref SEU_PROJECT_REF
npx supabase db push --dry-run
npx supabase db push
```

Nunca edite uma migration já aplicada. Crie um arquivo novo para qualquer alteração.
