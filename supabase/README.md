# Banco de dados do Briaspas Scale

As alterações do banco ficam em `supabase/migrations`. Cada arquivo representa uma mudança ordenada e imutável no PostgreSQL.

## Primeira migration

`202609070001_initial_crm_schema.sql` cria:

- `profiles`: dados públicos internos do usuário autenticado.
- `workspaces`: a conta ou equipe que possui os dados.
- `workspace_members`: liga usuários aos workspaces e define o papel.
- `leads`: empresas e oportunidades comerciais.
- Triggers para criar perfil e workspace ao cadastrar um usuário novo.
- Políticas RLS para impedir acesso entre workspaces.

## Aplicar no projeto remoto inicial

Enquanto o Supabase CLI ainda não estiver configurado, abra o SQL Editor do projeto de desenvolvimento, copie todo o conteúdo da primeira migration e execute uma única vez.

Depois, adotaremos o fluxo reproduzível da CLI:

```bash
npx supabase login
npx supabase link --project-ref SEU_PROJECT_REF
npx supabase db push --dry-run
npx supabase db push
```

Nunca edite uma migration depois de aplicá-la. Crie uma nova migration para qualquer alteração futura.

## Migration da importação de leads

`202609070002_lead_import_fields.sql` adiciona ao CRM os campos de site, link do mapa, avaliação, quantidade de avaliações, origem e identificador da origem. Ela também cria a proteção contra importações duplicadas.

Se a primeira migration já foi executada, copie apenas o conteúdo da segunda migration para o SQL Editor e execute uma vez.

`202609070003_lead_enrichment_fields.sql` adiciona e-mail, redes sociais e coordenadas retornadas pelas fontes automáticas.

`202609070004_complete_lead_site_fields.sql` completa o modelo com prazo de follow-up, fotos, slug, contador de visitas e os campos de geração/publicação do site. Também cria a função pública segura usada por `/empresa/[slug]`: ela entrega somente sites publicados e não expõe os dados privados do CRM.

## Rollback

O arquivo em `supabase/rollback` existe apenas para desfazer o esquema em um banco de desenvolvimento vazio. Ele apaga tabelas e dados. Não deve ser executado em produção.
