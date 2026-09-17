# Briaspas Scale

CRM de prospecção para negócios locais: importa empresas, gera um site-demo por lead, acompanha o funil de vendas e organiza os projetos vendidos.

**Status:** MVP em construção. Já dá para subir localmente, autenticar com Supabase, importar leads (Foursquare, CSV ou manual), gerar/publicar sites e usar o CRM. Ainda não é o produto fechado do [blueprint](./plans/blueprint-briaspas-scale.md) — metas de equipe, domínio customizado e WhatsApp oficial ficam para depois.

## O que já roda

- Login, cadastro e recuperação de senha (Supabase Auth)
- Busca/importação de leads sem Google Places (Foursquare, CSV, cadastro manual)
- Geração de site-demo por nicho, revisão e publicação em `/empresa/[slug]`
- CRM e projetos vendidos no app autenticado
- Testes unitários (Vitest) em sanitização, templates, zip e rate limit

## Stack

- Next.js 16 com App Router
- React 19
- TypeScript
- Tailwind CSS 4
- Supabase (Auth + Postgres + RLS)
- Vercel (hospedagem de produção)
- Turbopack no desenvolvimento e Webpack no build de produção

## Produção (Vercel)

URL: **https://briaspas-scale.vercel.app**

Deploy só na Vercel. Passo a passo, variáveis de ambiente e como apagar o site Netlify antigo: [`docs/deploy-vercel.md`](./docs/deploy-vercel.md).

## Executar localmente

Instale as dependências, caso ainda não estejam instaladas:

```bash
npm install
```

Inicie o servidor de desenvolvimento:

```bash
npm run dev
```

Abra http://localhost:3000 no navegador.

## Conectar ao Supabase

1. Crie um projeto em https://supabase.com/dashboard.
2. Abra o projeto e use o botão **Connect** para copiar a URL e a chave publicável.
3. Crie um arquivo `.env.local` na raiz usando `.env.example` como modelo:

```env
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_sua-chave
```

Não use a chave `service_role` nesses campos. Reinicie `npm run dev` depois de alterar o arquivo.

Para o primeiro acesso, crie um usuário em **Authentication > Users** no painel do Supabase e use o e-mail e a senha em http://localhost:3000/login.

O esquema inicial e as instruções para aplicá-lo estão em [`supabase/README.md`](./supabase/README.md).

## Adicionar leads sem Google Places

Enquanto o faturamento do Google Places estiver pausado, a aplicação usa o Foursquare como fonte automática e também aceita:

- Busca automática por nicho e cidade, com salvamento individual ou em lote.
- Importação de até 100 empresas por CSV do Maps2Sheets ou de outra planilha compatível.
- Cadastro manual de uma empresa por vez.
- Nome, telefone, endereço, nicho, cidade, site, link do mapa e avaliações.
- Detecção de empresas duplicadas no servidor.

O passo a passo e os nomes de colunas aceitos estão em [`docs/importacao-de-leads.md`](./docs/importacao-de-leads.md).

A configuração da busca automática está em [`docs/busca-automatica.md`](./docs/busca-automatica.md).

O schema completo do CRM e dos sites está em [`docs/modelo-completo-do-lead.md`](./docs/modelo-completo-do-lead.md).

A configuração da geração e publicação de sites está em [`docs/geracao-de-sites.md`](./docs/geracao-de-sites.md).

## Verificar o código

```bash
npm test
npm run lint
npm run typecheck
npm run build
```

Ou tudo de uma vez: `npm run check`.

O planejamento completo está em [`plans/blueprint-briaspas-scale.md`](./plans/blueprint-briaspas-scale.md).
