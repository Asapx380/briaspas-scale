# Deploy — somente Vercel

Produção oficial: **https://briaspas-scale.vercel.app**

O app é hospedado só na Vercel. Não use Netlify.

## Subir ou atualizar na Vercel

1. Conta em https://vercel.com e importe o repositório `Asapx380/briaspas-scale` (ou confirme que o projeto já existe).
2. Framework: **Next.js**. Build: `npm run build` (definido em `vercel.json` e `package.json`).
3. Em **Settings → Environment Variables**, copie as variáveis de `.env.example` (nunca commitar `.env.local`).
4. Domínio de produção: o padrão `*.vercel.app` ou um domínio customizado via DNS na Vercel.
5. Domínios de sites publicados pelo CRM usam `VERCEL_TOKEN` e `VERCEL_PROJECT_ID` (ver `.env.example`).

Após o push em `main`, a Vercel faz o deploy automaticamente se o Git estiver conectado.

## Forçar Production (Create Deployment)

Se o painel mostrar Production em SHA antigo (ex.: `14d6df6` / “baseline limpa”) ou erro *GitHub could not find the given branch or commit reference*:

1. Confirme o tip atual: `git ls-remote origin refs/heads/main` (SHA completo).
2. Em **Deployments → Create Deployment**, cole o **SHA completo** do tip de `main` (não `tree/main`, não SHA curto só).
3. Target: **Production**.
4. Se o SHA novo ainda falhar: **Settings → Git → Disconnect** → **Connect** `Asapx380/briaspas-scale`, Production Branch = `main`, e tente de novo.

`14d6df6` era tip pré–force-push e **não existe mais** no GitHub. Use sempre o tip atual de `main`.

## Remover o site Netlify (dashboard)

Ainda existe um site Netlify ligado ao GitHub: **`briaspasscale`**  
(URL típica: https://app.netlify.com/projects/briaspasscale · previews `*.netlify.app`).

Sem token Netlify nesta máquina — faça no painel:

### Opção A — apagar o site (recomendado)

1. Entre em https://app.netlify.com/ e abra o projeto **`briaspasscale`**.
2. **Project configuration** (ou **Site configuration**) → **General**.
3. Role até **Danger zone**.
4. **Delete this site** / **Delete this project** → confirme o nome do site.
5. Confirme que checks `netlify/briaspasscale/deploy-preview` sumiram nos próximos PRs.

### Opção B — só desvincular o GitHub (sem apagar ainda)

1. No mesmo projeto: **Project configuration** → **Build & deploy** → **Continuous deployment**.
2. **Manage repository** / **Unlink** o repositório GitHub.
3. Depois use a Opção A para apagar o site e liberar o slug.

Produção e previews oficiais passam a ser só Vercel.
