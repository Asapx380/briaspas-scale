# Briaspas Scale

CRM de prospecção para negócios locais: importa empresas, gera um site-demo por lead, acompanha o funil e organiza os projetos vendidos.

**Status:** MVP utilizável. Sobe localmente com Supabase Auth, busca/importação de leads, geração/publicação de sites, CRM, equipe, projetos, operação e integrações. Metas avançadas de time e WhatsApp oficial ainda ficam fora deste corte.

## O que já roda

- Login, cadastro e recuperação de senha (Supabase Auth)
- Busca automática com **Google Places** (quando configurado) e fallback **Foursquare**; CSV e cadastro manual
- Geração de site-demo (Groq / OpenAI / Gemini), revisão e publicação em `/empresa/[slug]`
- CRM, equipe, projetos, operação e integrações (domínio customizado + Google Agenda, quando as envs existem)
- Testes unitários (Vitest) em sanitização, templates, zip e rate limit

## Stack

- Next.js 16 (App Router)
- React 19 + TypeScript
- Tailwind CSS 4
- Supabase (Auth + Postgres + RLS)

## Executar localmente

```bash
npm install
npm run dev
```

Abra http://localhost:3000.

## Variáveis de ambiente

Copie `.env.example` para `.env.local`. Mínimo para autenticar:

```env
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_sua-chave
```

Para busca e geração de sites, configure também (conforme o provedor):

- `GOOGLE_PLACES_API_KEY` ou `GOOGLE_MAPS_DEMO_API_KEY`
- `FOURSQUARE_PLACES_API_KEY`
- `SITE_GENERATOR_PROVIDER` (`groq` | `openai` | `gemini`) + `GROQ_API_KEY` / `OPENAI_API_KEY` / `GEMINI_API_KEY`


Não use a chave `service_role` no browser. Reinicie `npm run dev` após alterar o `.env.local`.

Crie o primeiro usuário em **Authentication > Users** no Supabase e entre em `/login`.

O esquema SQL está em [`supabase/README.md`](./supabase/README.md).

## Leads

A API tenta **Google Places** quando a chave está presente; senão (ou em falha) usa **Foursquare**. Também há:

- Importação CSV (Maps2Sheets / planilha compatível)
- Cadastro manual
- Detecção de duplicados no servidor

Detalhes: [`docs/importacao-de-leads.md`](./docs/importacao-de-leads.md), [`docs/busca-automatica.md`](./docs/busca-automatica.md), [`docs/modelo-completo-do-lead.md`](./docs/modelo-completo-do-lead.md), [`docs/geracao-de-sites.md`](./docs/geracao-de-sites.md).

## Verificar

```bash
npm test
npm run lint
npm run typecheck
```
