# Segurança e rotação de chaves

As chaves Groq, Google Places e Foursquare ficam somente em `.env.local` no desenvolvimento e em variáveis protegidas da hospedagem na produção. Nunca use prefixo `NEXT_PUBLIC_` para essas chaves.

## Rotação

1. Gere uma nova chave no painel do provedor sem apagar a anterior.
2. Restrinja a nova chave aos produtos e ambientes necessários.
3. Atualize a variável correspondente na hospedagem e em `.env.local`.
4. Faça um teste de busca ou geração.
5. Revogue a chave antiga somente depois do teste.
6. Registre data, motivo e responsável pela rotação sem copiar o valor secreto.

Variáveis:

- `GROQ_API_KEY`
- `GOOGLE_MAPS_DEMO_API_KEY` ou `GOOGLE_PLACES_API_KEY`
- `FOURSQUARE_PLACES_API_KEY`

Execute `npm run security:secrets` antes de publicar. Se uma chave aparecer em commit, histórico, log público ou captura compartilhada, trate-a como comprometida e faça a rotação imediatamente.
