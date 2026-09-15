# Fontes, limites e custos

## Foursquare

Usado para descoberta inicial. O sistema registra a fonte em cada lead e remove duplicidades por referência externa e identidade normalizada. Acompanhe os limites e preços diretamente no painel do provedor, pois podem mudar.

## Google Maps Demo

Usado somente quando configurado e compatível com o endpoint necessário. Não dependa da chave de demonstração para produção nem para fotos/avaliações sem validar os termos e limites atuais.

## OpenStreetMap

Pode complementar buscas sem chave, respeitando a política de uso e evitando carga excessiva em instâncias públicas.

## Groq

Cada geração registra modelo, duração, tentativas e tokens. Preencha GROQ_INPUT_USD_PER_MILLION e GROQ_OUTPUT_USD_PER_MILLION no servidor para calcular custo estimado no painel Operação.

## Alertas recomendados

- mais de 5% de falhas de geração em 24 horas;
- crescimento anormal de chamadas por usuário;
- 80% da cota diária de qualquer fonte;
- custo médio por site acima do teto definido pelo negócio.
