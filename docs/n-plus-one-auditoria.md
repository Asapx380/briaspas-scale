# Auditoria e correção N+1 — Briaspas Scale

**Método:** cliente instrumentado + RTT simulado de **15 ms** por round-trip. Dados: **200 leads** com JSON de `site_brief` / AI.  
**Regressão:** `src/lib/crm/nplusone.test.ts`.

## Mapa route → data layer → DB → UI

| Rota | Fluxo | Antes | Depois |
|------|-------|-------|--------|
| `/app/crm` | RSC → `loadCrmBoardData` → Supabase → `CrmBoard` | 3 queries sequenciais (2× leads + WA) | 2 em paralelo; colunas enxutas |
| `/app/crm/[id]` | RSC → `loadCrmLeadDetail` → Supabase → `LeadDetailView` | 3 selects sequenciais em `leads` | 2 em paralelo |
| `POST .../site-upload` e `.../create-template-site` | Storage upload | N `await` sequenciais | pool concorrência 6 |
| `POST .../whatsapp/webhook` | ingest → contexto do lead | 1 `leads.select` / mensagem | 1 `.in("id", …)` / batch |
| `POST /api/v1/leads/imports` | dedup | full scan do workspace | `.in("company_name", chunk)` |
| `PATCH .../site` (publish) | checagem de HTML | select com `site_html` completo | metadados + existência sem baixar HTML |

Sem mudança de shape de API de lista (compatível com paginação futura).

## Números (medidos em `nplusone.test.ts`)

### CRM board — 200 leads

| | Queries | Wall (ms) | Bytes (est.) |
|--|--------:|----------:|-------------:|
| BEFORE | 3 | 52.99 | 2 024 918 |
| AFTER | 2 | 16.57 | 94 414 |

### CRM detail — 120 siblings

| | Queries | Wall (ms) |
|--|--------:|----------:|
| BEFORE | 3 | 46.17 |
| AFTER | 2 | 15.58 |

### Storage — 12 arquivos

| | Round-trips | Wall (ms) |
|--|------------:|----------:|
| BEFORE | 12 sequenciais | 182.66 |
| AFTER | 12 paralelos (conc=6) | 30.52 |

### WhatsApp — 10 mensagens

| | `leads.select` |
|--|---------------:|
| BEFORE | 10 |
| AFTER | 1 |

## Reproduzir

```bash
npx vitest run src/lib/crm/nplusone.test.ts
```
