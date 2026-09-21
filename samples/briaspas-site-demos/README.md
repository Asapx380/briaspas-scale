# Amostras de geração de site (dados demonstrativos)

Leads fictícios definidos em `src/lib/sites/site-generation-sample-leads.ts`.

## Gerar HTML com IA (local)

Com chave de provedor em `.env.local`:

```bash
npm run generate-site-samples
```

Saída padrão:

- `/tmp/briaspas-samples/<slug>/index.html`
- `/tmp/briaspas-samples/<slug>/report.json`
- `/tmp/briaspas-samples/<slug>/lead.json`
- `/tmp/briaspas-samples/summary.json`

Diretório customizado: `npx tsx scripts/generate-site-samples.ts ./caminho/de-saida`

Nunca commitar chaves nem leads reais.
