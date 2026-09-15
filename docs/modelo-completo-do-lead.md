# Modelo completo do lead

O cadastro foi separado em três grupos. Isso permite trocar a fonte de busca sem alterar o CRM ou o gerador de sites.

## Dados obtidos ou enriquecidos

- Nome da empresa, telefone/WhatsApp, e-mail, endereço e categoria.
- Instagram, Facebook, X/Twitter, site atual e link do mapa.
- Latitude, longitude, fotos, avaliação média e quantidade de avaliações.
- Fonte e identificador externo, usados para evitar duplicatas.

Esses campos são opcionais porque cada provedor possui cobertura diferente. O sistema nunca deve inventar um dado ausente.

## Dados comerciais do CRM

- Status: novo, contatado, respondeu, quente, proposta, fechado ou perdido.
- Anotações e prazo de follow-up.
- Valor estimado/fechado e vendedor responsável.

## Dados gerados pelo sistema

- Slug público exclusivo.
- Fotos armazenadas como uma lista de URLs.
- Estado do site: não gerado, gerando, pronto, falhou ou publicado.
- HTML final, JSON estruturado e data da geração.
- Total de visitas e data da visita mais recente.

## Geração e publicação

O construtor de prompt fica em `src/lib/sites/build-generation-prompt.ts`. Ele passa os dados reais de maneira estruturada, proíbe a invenção de informações e pede as dez seções padronizadas.

O HTML gerado será salvo em `site_html`. Apenas um lead com `site_status = 'published'` pode ser aberto em `/empresa/[slug]`. A rota renderiza o HTML em um iframe isolado e incrementa o contador sem tornar o restante da ficha acessível ao visitante.
