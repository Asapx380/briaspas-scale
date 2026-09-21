# Briefing e publicação de sites

A IA gera um briefing estruturado. O operador cria o site e envia um ZIP para hospedagem.

## Configuração

1. Escolha Groq, OpenAI, Gemini ou OpenRouter e crie a respectiva chave de API.
2. Adicione a chave somente ao arquivo `.env.local`:

```env
GROQ_API_KEY=gsk_sua_chave
GROQ_SITE_MODEL=openai/gpt-oss-120b
SITE_GENERATOR_PROVIDER=groq
```

Para os outros provedores, altere `SITE_GENERATOR_PROVIDER` para `openai`, `gemini` ou `openrouter` e preencha a chave e modelo correspondentes. O servidor tenta outro provedor já configurado se o principal falhar, na ordem padrão Gemini, Groq, OpenRouter e OpenAI.

Fallback gratuito via OpenRouter (modelos free com capacidade variável; podem falhar ou atingir limite):

```env
OPENROUTER_API_KEY=sua_chave
OPENROUTER_SITE_MODEL=openrouter/free
SITE_GENERATOR_PROVIDER=openrouter
```

Modelos gratuitos não garantem geração ilimitada. Monitore falhas e limites no painel da OpenRouter.

Para usar foto de banco quando o lead não tiver foto real, crie uma chave em [Pexels API](https://www.pexels.com/api/) e adicione:

```env
PEXELS_API_KEY=sua_chave
```

A busca é opcional: erro, cota ou ausência de resultado não impede a geração. A foto retornada pelo backend entra na allowlist exata do HTML e recebe crédito visível para autor e Pexels. Ela nunca deve ser apresentada como foto do estabelecimento.

3. Reinicie `npm run dev` para o Next.js carregar a nova variável.

Nunca coloque essa chave em uma variável iniciada por `NEXT_PUBLIC_` e nunca envie o arquivo `.env.local` ao Git.

## Fluxo

1. No CRM, clique em **Gerar briefing** no card do lead.
2. O servidor usa nome, nicho, telefone, endereço, Instagram, site, fotos e avaliação para produzir resumo, tom, paleta, fontes, serviços, diferenciais, CTA e foto Pexels opcional.
3. Copie o briefing para sua ferramenta de criação.
4. Envie um ZIP de até 20 MB com `index.html` na raiz.
5. O servidor aceita somente HTML, CSS, JS, imagens, fontes e JSON. Caminhos inseguros, extensões não permitidas e ZIP bomb são recusados.
6. Publique para liberar `/empresa/[slug]`. O bucket `lead-sites` é privado; rota pública serve apenas arquivos do site publicado.

Antes de usar upload, aplique a migration `supabase/migrations/202609090002_site_briefs_and_uploaded_sites.sql` no SQL Editor do Supabase. Ela cria as colunas, bucket e políticas necessárias.

O código legado de geração de HTML continua no repositório, mas não é chamado pelo CRM.
