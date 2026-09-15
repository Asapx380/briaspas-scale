# Busca automática de empresas

A fonte automática principal da Briaspas Scale é o Google Places API (New), usando uma Maps Demo Key durante a prototipagem. O Foursquare Places API permanece configurado como fallback automático. As chaves ficam apenas no servidor Next.js e nunca são enviadas ao navegador.

## Configuração única

1. Gere uma Maps Demo Key na documentação oficial do Google Maps Platform.
2. Abra `.env.local` na raiz do projeto.
3. Adicione a variável abaixo, sem aspas:

```env
GOOGLE_MAPS_DEMO_API_KEY=sua-chave-demo
```

4. Para manter a contingência, configure também a chave do Foursquare:

```env
FOURSQUARE_PLACES_API_KEY=sua-chave-foursquare
```

5. Reinicie o servidor com `npm run dev`.

Não envie essa chave pelo chat, não coloque `NEXT_PUBLIC_` no nome e não faça commit do `.env.local`.

## Fluxo dentro da ferramenta

1. Abra **Adicionar leads**.
2. Informe um nicho, como `barbearia`.
3. Informe uma cidade, como `Teresina, PI`.
4. Clique em **Buscar empresas**.
5. Confira nome, telefone, endereço e site disponíveis.
6. Salve uma empresa individualmente ou use **Salvar todas no CRM**.

Cada resultado recebe o identificador do provedor que respondeu. Se a mesma empresa for salva novamente pela mesma fonte, o banco ignora a duplicata.

A Maps Demo Key não fornece fotos, avaliações ou outros conteúdos enviados por usuários. Esses campos ficam vazios e o gerador de sites remove as seções correspondentes.

## Arquitetura

- O navegador envia somente nicho, cidade e limite ao Route Handler do Next.js.
- O servidor verifica a sessão do Supabase antes da consulta.
- O servidor tenta o Google Places primeiro e usa o Foursquare se o Google falhar.
- A chave escolhida é adicionada somente na chamada feita pelo servidor.
- A resposta externa é convertida para o formato interno do Briaspas Scale.
- O salvamento em lote passa por uma segunda validação antes de chegar ao Supabase.

O CSV continua disponível como contingência e para listas obtidas de outras fontes.
