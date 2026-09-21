# Briaspas Scale

CRM de prospecção para negócios locais. Interface em português, marca Briaspas.

Produção: [https://briaspas-scale.vercel.app](https://briaspas-scale.vercel.app)

O ambiente público usa **dados demonstrativos** (nada de lead real). Dá para ver a landing e o CRM em `/demonstracao`.

Hospedagem só na Vercel.

## Para quem

Quem vende site ou serviço para comércio local e hoje espalha o trabalho entre planilha, gerador de página e conversa no WhatsApp. O lead entra, fica no funil e, se fizer sentido, ganha um site-demo no próprio link.

MVP em validação. O que está em `main` é o que está listado abaixo — sem prometer tela que ainda não entrou.

## O que está no ar

- **Auth** — login, cadastro e recuperação de senha (Supabase Auth). Dados isolados por workspace, com RLS.
- **Leads** — busca por nicho e cidade (Google Places; Foursquare como fallback), CSV e cadastro manual.
- **CRM** — kanban, lixeira e potencial comercial.
- **Abordagem** — texto, CTA e abertura no WhatsApp via `wa.me`. Histórico rápido desta sessão no navegador. A Cloud API oficial da Meta **não está conectada** (adiado).
- **Sites por lead** — briefing no card, upload de ZIP, prévia privada, publicação em `/empresa/[slug]`, visitas no link e alerta de lead quente (2+ visitas em 24 h). Galeria em **Meus sites**.
- **Google Maps** — consulta temporária para conferência, quando a chave está configurada. Telefone, endereço e nota da API não são gravados.
- **Projetos, agendamentos e equipe** — as telas existem; ainda em evolução.

A tela **Criar site** (gerar HTML automaticamente) **não faz parte do produto em `main`**. O CRM usa briefing + ZIP. Há código de geração no repositório, mas essa UI ainda não entrou.

Mais detalhe operacional: [`docs/importacao-de-leads.md`](./docs/importacao-de-leads.md), [`docs/geracao-de-sites.md`](./docs/geracao-de-sites.md), [`docs/modelo-completo-do-lead.md`](./docs/modelo-completo-do-lead.md).

## Stack

- Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4
- Supabase — Auth, Postgres e RLS por workspace
- Vercel — único host de produção

Desenvolvimento com Turbopack (`npm run dev`). Build de produção com Webpack (`npm run build`).

## Rodar local

```bash
npm install
npm run dev
```

Abra http://localhost:3000.

Copie [`.env.example`](./.env.example) para `.env.local`. O mínimo para auth:

```env
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_sua-chave
```

Use só a chave **publicável** — nunca `service_role` no cliente. Busca, briefing, Maps e o restante das chaves estão no mesmo arquivo de exemplo.

Esquema e migrations: [`supabase/README.md`](./supabase/README.md). Deploy: [`docs/deploy-vercel.md`](./docs/deploy-vercel.md).

O hook `commit-msg` (via `npm run hooks:install`) remove trailers `Co-authored-by` de agentes.

## Testes

```bash
npm test              # Vitest
npm run test:e2e      # Playwright — páginas públicas
npm run lint
npm run typecheck
npm run build
```

Tudo junto: **`npm run check`** (lint, typecheck, testes unitários e `security:secrets`).

## Notas de segurança (já no código)

- ZIP de site: limite de tamanho (arquivo e descompactado), teto de arquivos, extensões fechadas, `index.html` na raiz, zip bomb e path traversal. Ver [`src/lib/sites/uploaded-site-zip.ts`](./src/lib/sites/uploaded-site-zip.ts).
- Prévia privada: token aleatório com hash SHA-256, expiração (~30 min) e cookie por slug.
- HTML gerado por IA (caminho de geração no código, não a tela **Criar site**): sanitização com allowlist (`sanitize-html`) antes de persistir ou servir.
- Segredos de provedor só em variáveis de ambiente do servidor; `npm run security:secrets` impede vazamento no bundle do cliente.

## Próximo

- Histórico de follow-up compartilhado com a equipe (hoje o registro rápido é só nesta sessão).
- WhatsApp Cloud API da Meta, se conta e política de consentimento fecharem.
- Geração de HTML no produto — ainda fora de `main`.

Planejamento: [`plans/blueprint-briaspas-scale.md`](./plans/blueprint-briaspas-scale.md) e [`docs/plano-de-evolucao-em-partes.md`](./docs/plano-de-evolucao-em-partes.md).

## Licença

Repositório público: https://github.com/Asapx380/briaspas-scale

Licença **MIT** — [`LICENSE`](./LICENSE). Não cole dados reais de clientes em issues ou PRs; use a demonstração pública para avaliar.
