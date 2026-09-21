# Amostras de geração de site (dados demonstrativos)

Leads fictícios definidos em `src/lib/sites/site-generation-sample-leads.ts`.

## Gerar HTML com IA (local)

Com chave de provedor em `.env.local`:

```bash
npm run generate-site-samples
npm run generate-site-samples -- --only petshop-dados-demonstrativos
npm run generate-site-samples -- --only odontologia-dados-demonstrativos --respect-rate-limit
```

Flags:

- `--only <slug>` — gera só uma amostra (slugs em `site-generation-sample-leads.ts`).
- `--respect-rate-limit` ou `--wait-on-429` — em HTTP 429, aguarda `Retry-After` do provedor (ou 60s padrão) e repete até `--max-rate-limit-retries` (padrão 3).
- `--out <dir>` — diretório de saída (padrão `/tmp/briaspas-samples`).

Saída padrão:

- `/tmp/briaspas-samples/<slug>/index.html`
- `/tmp/briaspas-samples/<slug>/report.json`
- `/tmp/briaspas-samples/<slug>/lead.json`
- `/tmp/briaspas-samples/summary.json`

Diretório customizado: `npm run generate-site-samples -- ./caminho/de-saida`

Nunca commitar chaves nem leads reais.
