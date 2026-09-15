# Blueprint — Briaspas Scale

Status: revisado, pronto para orientar a implementação  
Data: 2026-09-06  
Modo de execução: direto (repositório local ainda sem aplicação ou remoto configurado)

## 1. Visão do produto

Uma plataforma própria de prospecção freelancer que encontra empresas reais por nicho e cidade, cria automaticamente uma demonstração de site personalizada para cada lead, publica essa demonstração em um link individual, mede o interesse do potencial cliente e conduz a venda e a posterior execução do projeto no mesmo sistema.

O produto será construído do zero. O gerador não reutilizará o Forja AI. A primeira implementação poderá usar Groq com `openai/gpt-oss-120b`, mas a aplicação deve ter uma interface de provedor para que modelo e fornecedor possam ser trocados sem alterar o restante do sistema.

### Fluxo principal

```text
Busca (nicho + cidade)
  -> seleção e importação de empresas
  -> enriquecimento dos dados
  -> fila de geração
  -> revisão/publicação do site-demo
  -> envio do link ao lead
  -> visitas e sinais de interesse
  -> CRM e follow-ups
  -> venda
  -> projeto com tarefas, prazo e Google Agenda
```

## 2. Pilares funcionais

### Prospecção de leads

- Busca por nicho, cidade e opcionalmente raio/região.
- Dados reais: nome, telefone, endereço, site existente, nota, quantidade de avaliações, categoria, horário, localização e referências de fotos quando disponíveis.
- Resultados são um snapshot da busca, não um cadastro completo da cidade: a Text Search (New) atualmente limita a resposta a até 60 lugares ao longo das páginas e não garante resultados idênticos entre consultas.
- Prévia dos resultados antes de importar, com seleção individual/em lote.
- Deduplicação por `google_place_id` dentro do workspace.
- Filtros para telefone disponível, sem site, baixa qualidade aparente do site, nota e quantidade de avaliações.
- Registro da consulta e do custo/volume aproximado de uso da API.

### Site personalizado por lead

- Geração assíncrona em lote, com estados `queued`, `generating`, `ready`, `failed`, `published`.
- Prompt montado somente com dados reais e instruções do nicho; a IA não deve inventar preços, depoimentos, certificações ou serviços não confirmados.
- Saída principal em JSON estruturado e versionado, validado por schema; HTML é derivado pelo renderer da aplicação.
- Temas e blocos reutilizáveis para manter qualidade, responsividade, acessibilidade e segurança.
- Editor simples para texto, cores, imagens, seções e CTA antes da publicação.
- Regeneração total ou por seção, com histórico de versões e restauração.
- Link individual por slug, publicação/despublicação em um clique e domínio customizado em fase posterior.

### CRM de vendas

- Kanban configurável; estados iniciais: `novo`, `contatado`, `respondeu`, `quente`, `proposta`, `fechado_ganho`, `fechado_perdido`.
- Cartão com empresa, responsável, WhatsApp/telefone, último contato, próxima ação, visitas, temperatura e valor esperado/fechado.
- Arrastar entre etapas, anotações, atividades e lembretes.
- Ação de WhatsApp por link; integração oficial de mensagens fica fora do MVP.
- Priorização por sinais: visitas recentes, visitas repetidas, resposta recente e atraso de follow-up.
- Filtros, busca, tags, exportação CSV e histórico de mudanças.
- Valor da venda, data do fechamento, origem e motivo de perda.

### Equipe

- Workspaces isolados, membros e papéis `owner`, `admin`, `seller`.
- Distribuição manual de leads no MVP; distribuição em lote/round-robin depois.
- Metas e painel por vendedor: leads trabalhados, respostas, conversão e receita fechada no período.
- Todas as tabelas privadas filtradas por `workspace_id` com RLS.

### Projetos, tarefas e Google Agenda

- Ao marcar uma venda como ganha, oferecer criação de projeto a partir do lead.
- Projeto com escopo, valor, data de início, prazo final, status, checklist e responsável.
- Tarefas com título, descrição, prioridade, prazo, status e estimativa.
- OAuth do Google por usuário; escolher uma agenda e criar/atualizar/remover eventos vinculados às tarefas.
- Sincronização inicialmente unidirecional (plataforma -> Google Agenda) para reduzir conflitos.
- Guardar `google_calendar_id`, `google_event_id`, estado de sincronização e último erro; operações devem ser idempotentes.
- Lembretes internos e alertas para tarefas vencendo ou atrasadas.

## 3. Decisões de arquitetura

### Stack

- Next.js com App Router e TypeScript.
- Supabase: Postgres, Auth, Storage e Realtime apenas onde trouxer valor.
- Google Places API (New) via Route Handlers/Server Actions, nunca diretamente do navegador.
- Google Calendar API com OAuth 2.0 e escopo mínimo suficiente para eventos (preferir `calendar.events`/escopo ainda mais restrito que atenda ao fluxo, em vez de acesso integral ao calendário).
- Motor de IA próprio dentro do projeto, atrás de `SiteGeneratorProvider`.
- Fila durável para lotes e retentativas. O MVP pode usar uma tabela de jobs no Postgres com worker agendado; não executar o lote inteiro dentro de uma requisição HTTP.
- Deploy inicialmente em Vercel + Supabase; domínios customizados somente após o fluxo principal estar estável.

### Escolha do formato gerado

Não salvar nem executar HTML arbitrário vindo da IA. Salvar um documento JSON versionado e validado, por exemplo:

```ts
type GeneratedSiteV1 = {
  schemaVersion: "1";
  locale: "pt-BR";
  seo: { title: string; description: string };
  theme: {
    preset: "classic" | "modern" | "bold" | "minimal";
    primaryColor: string;
    accentColor: string;
    fontPair: "sans" | "editorial" | "friendly";
  };
  hero: { eyebrow: string | null; title: string; subtitle: string; cta: string };
  about: { title: string; body: string };
  services: Array<{ title: string; description: string }>;
  highlights: Array<{ label: string; value: string }>;
  contact: { phone: string | null; address: string | null; whatsappUrl: string | null };
  gallery: Array<{ placePhotoName: string; alt: string }>;
};
```

O schema real deve limitar comprimentos e quantidade de blocos. A validação ocorre no servidor antes de persistir uma versão publicável. O renderer é código confiável da aplicação.

### Contagem de visitas

- A página pública gera um `visit_session_id` anônimo em cookie first-party.
- A abertura envia evento para um endpoint de tracking após o carregamento; o render da página não fica bloqueado.
- Registrar `site_id`, data/hora, sessão com hash/ID, referrer, UTM, user agent resumido e flag de bot. IP cru não deve ser persistido.
- Separar `page_views` de `unique_visitors`; visualizações do próprio time devem poder ser ignoradas.
- Agregar por dia para o CRM. A pontuação de calor considera recência e repetição, não apenas o total histórico.
- Rate limit e filtros de bot evitam que refreshes ou crawlers inflam os números.

### Segurança e privacidade

- Chaves da Places, IA, Supabase service role e tokens OAuth somente no servidor.
- RLS + grants mínimos em todas as tabelas privadas. `service_role` nunca chega ao cliente.
- Rota pública recebe somente o conteúdo publicado necessário; dados internos do CRM nunca são expostos pelo slug.
- Slugs não sequenciais e difíceis de enumerar; publicar/despublicar deve invalidar cache.
- Criptografar refresh tokens do Google em repouso e permitir desconectar/revogar a integração.
- Política de retenção para eventos de visita e trilha de auditoria para mudanças comerciais.
- Revisar obrigações da LGPD e os termos de exibição/armazenamento de dados e fotos do Google antes do lançamento comercial.

## 4. Modelo de dados inicial

| Tabela | Responsabilidade e campos principais |
|---|---|
| `profiles` | `id`, nome, avatar, timezone |
| `workspaces` | conta/equipe, nome, owner |
| `workspace_members` | workspace, user, papel, ativo |
| `lead_searches` | consulta, cidade, filtros, paginação, autor, totais |
| `leads` | workspace, place_id, empresa, contatos, endereço, rating, site, status, owner, valores, datas |
| `lead_photos` | lead, photo resource name, atribuições, ordem |
| `lead_notes` | lead, autor, texto, created_at |
| `lead_activities` | lead, tipo, payload, autor, data |
| `follow_ups` | lead, responsável, prazo, status, observação |
| `sites` | lead, slug, estado, versão publicada, published_at |
| `site_versions` | site, schema_version, content_json, prompt_version, provider/model, estado, erro |
| `generation_jobs` | lead/site, estado, tentativas, prioridade, lock, erro, custo/tokens |
| `visit_events` | site, timestamp, session_id, origem, UTM, metadados resumidos |
| `visit_daily_stats` | site, data, views, unique_visitors |
| `projects` | workspace, lead, cliente, escopo, valor, status, início, prazo |
| `tasks` | projeto, responsável, título, status, prioridade, prazo, estimativa |
| `google_connections` | user, conta, tokens criptografados, scopes, expiração |
| `calendar_event_links` | tarefa, calendar_id, event_id, sync_status, synced_at, erro |
| `audit_log` | workspace, ator, entidade, ação, diff resumido, data |

Invariantes:

- `unique(workspace_id, google_place_id)` em leads.
- `unique(slug)` em sites.
- Um site pertence ao mesmo workspace do lead.
- Uma versão publicada deve ter schema válido e estado `ready`.
- Uma tarefa só pode estar ligada a um projeto do mesmo workspace.
- Um evento do Google deve ter no máximo um vínculo ativo por tarefa e agenda.

## 5. Interfaces e rotas propostas

### Telas

- `/login`
- `/app/dashboard`
- `/app/buscar`
- `/app/leads` (lista)
- `/app/crm` (kanban)
- `/app/leads/[id]` (detalhes, atividades, site e projeto)
- `/app/sites/[id]/editar`
- `/app/projetos`
- `/app/projetos/[id]`
- `/app/equipe`
- `/app/configuracoes/integracoes`
- `/empresa/[slug]` (pública)

### Endpoints internos

- `POST /api/places/search`
- `POST /api/leads/import`
- `POST /api/sites/generate`
- `GET /api/jobs/[id]`
- `POST /api/sites/[id]/publish`
- `POST /api/sites/[id]/track`
- `PATCH /api/leads/[id]/stage`
- `POST /api/projects/from-lead`
- `GET /api/integrations/google/connect`
- `GET /api/integrations/google/callback`
- `POST /api/tasks/[id]/calendar-sync`

Contratos HTTP devem ser validados com Zod, incluir autorização pelo workspace e retornar erros tipados.

Comandos-padrão de verificação a serem definidos no `package.json` desde a Etapa 1: `npm run lint`, `npm run typecheck`, `npm test` e `npm run test:e2e`. Cada etapa deve executar ao menos os três primeiros; fluxos de UI/publicação executam também o E2E correspondente.

## 6. Plano de construção

### Etapa 1 — Fundação, autenticação e tenancy

**Contexto:** o repositório está vazio. Esta etapa cria a base que todas as demais usam.

**Tarefas:**

- Criar Next.js/TypeScript, lint, testes e configuração de ambiente.
- Configurar Supabase SSR/Auth, layout autenticado e perfis.
- Criar workspaces, membros, papéis, migrations, seeds e políticas RLS.
- Criar utilitários server-only e impedir importação de segredos em Client Components.
- Documentar `.env.example` sem valores reais.

**Verificação:** lint, typecheck, testes de login e testes negativos de isolamento entre workspaces.

**Saída:** usuário entra no painel vazio e nunca acessa dados de outro workspace.

**Rollback:** remover migrations desta etapa somente antes de existirem dados reais; depois, usar migrations reversíveis.

### Etapa 2 — Busca e importação via Places

**Depende de:** Etapa 1.

**Tarefas:**

- Implementar cliente server-only para Text Search (New), field mask explícita, paginação, timeout e erros.
- Criar tela de busca com prévia e seleção em lote.
- Persistir consulta, importar leads e deduplicar por place ID.
- Armazenar apenas os campos permitidos e as referências/metadados de foto necessários.
- Criar rate limit por usuário/workspace e telemetria de volume.

**Verificação:** testes do adapter com fixtures; busca manual; reimportar a mesma empresa não duplica; falha da API não cria registros parciais.

**Saída:** Wesley busca `barbearia + Campinas`, escolhe resultados e os vê na lista de leads.

**Rollback:** feature flag desliga novas buscas sem afetar leads importados.

### Etapa 3 — CRM individual

**Depende de:** Etapa 1. Pode ser desenvolvido em paralelo com a Etapa 2 após o contrato de `leads` estar fechado.

**Tarefas:**

- Implementar lista, detalhes e Kanban responsivo.
- Alterar etapa com optimistic UI e persistência segura.
- Notas, atividades, follow-ups, tags, valores e motivos de perda.
- CTA de WhatsApp e filtros.
- Trilha de auditoria para mudanças de etapa, dono e valor.

**Verificação:** testes de permissão, movimentação entre colunas, filtros e auditoria.

**Saída:** ciclo comercial pode ser operado manualmente mesmo sem geração de sites.

**Rollback:** manter lista como fallback se o drag-and-drop for desativado.

### Etapa 4 — Motor próprio de geração

**Depende de:** Etapa 2.

**Tarefas:**

- Definir `GeneratedSiteV1` com JSON Schema/Zod e fixtures por nicho.
- Criar `SiteGeneratorProvider` e adapter inicial de IA.
- Criar prompt versionado com regras contra informações inventadas.
- Usar structured output quando suportado, validar novamente no servidor e aplicar retentativas limitadas.
- Criar tabela/worker de jobs duráveis com idempotência, concorrência e backoff.
- Registrar modelo, prompt, duração, tokens/custo, tentativa e erro sem vazar segredos.

**Verificação:** testes de contrato do provider; fixtures válidas; lote com sucesso parcial; retentativa não duplica versão; falha fica visível e recuperável.

**Saída:** selecionar leads cria jobs e produz JSON de site válido por empresa.

**Rollback:** trocar/desligar o adapter por feature flag sem afetar o CRM.

### Etapa 5 — Renderer, editor e publicação

**Depende de:** Etapa 4.

**Tarefas:**

- Implementar componentes de seção e presets visuais que renderizam o schema.
- Criar preview responsivo e editor controlado.
- Versionar alterações, restaurar versão e publicar snapshot imutável.
- Implementar `/empresa/[slug]`, metadados SEO e estados 404/despublicado.
- Resolver fotos por fluxo permitido pela Places API e exibir atribuições quando exigidas.

**Verificação:** testes visuais em mobile/desktop, acessibilidade, SEO básico, nenhum HTML/script gerado executável, preview diferente do snapshot publicado.

**Saída:** um site-demo revisado pode ser colocado no ar por um link individual.

**Rollback:** apontar novamente para a versão publicada anterior.

### Etapa 6 — Analytics de visitas e lead scoring

**Depende de:** Etapa 5. Pode ser preparado em paralelo com a Etapa 7.

**Tarefas:**

- Criar endpoint de evento, cookie de sessão, rate limit e detecção básica de bot.
- Agregar visualizações e visitantes únicos por dia.
- Exibir total, recência e tendência no CRM.
- Criar score explicável e ordenar fila de contato por prioridade.
- Adicionar consentimento/aviso e retenção conforme decisão jurídica de LGPD.

**Verificação:** refresh repetido não infla visitante único; bot conhecido não aquece lead; usuário interno pode ser excluído; agregação é reconciliável.

**Saída:** o CRM mostra quem abriu, quantas vezes e quando, com prioridade acionável.

**Rollback:** ocultar score e continuar mostrando apenas eventos/contagens.

### Etapa 7 — Equipe e relatórios

**Depende de:** Etapa 3.

**Tarefas:**

- Convite e gerenciamento de membros.
- Atribuição manual/em lote e filtros por vendedor.
- Dashboard de funil, conversão e receita por período/vendedor.
- Garantir que `seller` veja/edite somente o escopo definido pelo produto.

**Verificação:** matriz de testes por papel; membro removido perde acesso; valores agregados reconciliam com as vendas.

**Saída:** Wesley consegue operar sozinho ou distribuir leads e acompanhar desempenho.

**Rollback:** owner assume leads e convites podem ser desativados por feature flag.

### Etapa 8 — Projetos e tarefas pós-venda

**Depende de:** Etapa 3.

**Tarefas:**

- Criar projeto a partir de `fechado_ganho`, copiando apenas o snapshot necessário do cliente.
- Implementar lista/detalhe de projeto, tarefas, checklist, responsáveis e prazos.
- Alertas internos de atraso e painel de próximas entregas.
- Templates simples de projeto por tipo de serviço.

**Verificação:** criação idempotente; datas respeitam timezone do usuário; projeto continua consistente se o lead mudar.

**Saída:** uma venda ganha vira trabalho planejado com prazo.

**Rollback:** projetos são independentes do status atual do lead e não são apagados ao reabrir a oportunidade.

### Etapa 9 — Integração com Google Agenda

**Depende de:** Etapas 1 e 8.

**Tarefas:**

- Configurar tela de consentimento OAuth e Calendar API no Google Cloud.
- Implementar conectar, callback, refresh, desconectar e escolha de agenda.
- Criar/atualizar/remover evento a partir de tarefa com idempotência.
- Guardar falhas de sync e oferecer retentativa manual.
- Inserir deep link de volta para projeto/tarefa no evento.

**Verificação:** expiração/refresh de token; alteração de prazo atualiza um único evento; desconexão não apaga tarefas; timezone e horário de verão corretos.

**Saída:** tarefas com prazo aparecem na agenda escolhida pelo usuário.

**Rollback:** desativar sync mantém tarefas internas intactas e marca links como desconectados.

### Etapa 10 — Produção, domínios e hardening

**Depende de:** Etapas 2–9 conforme o recorte do lançamento.

**Tarefas:**

- CI, ambientes preview/staging/production, migrations seguras e backups.
- Observabilidade, alertas de jobs, logs estruturados e limites de consumo.
- Testes E2E do funil completo e auditoria de segurança/RLS.
- Custom domains e automação de DNS/TLS somente após validar o modelo operacional e limites do provedor de deploy.
- Runbook de incidentes, exclusão/exportação de dados e recuperação.

**Verificação:** E2E `buscar -> importar -> gerar -> publicar -> visitar -> vender -> criar projeto -> sincronizar agenda`; teste de restauração; nenhuma chave no bundle/log.

**Saída:** produto utilizável diariamente com operação e custos controlados.

**Rollback:** deploy anterior + migrations backward-compatible; geração, tracking e integrações protegidos por feature flags.

## 7. Grafo de dependências e cortes de entrega

```text
1 Fundação
├─► 2 Places ─► 4 Geração ─► 5 Publicação ─► 6 Analytics
├─► 3 CRM ─┬─► 7 Equipe
│           └─► 8 Projetos ─► 9 Agenda
└─► 10 Hardening acompanha todas e fecha o lançamento
```

### Corte A — MVP operacional individual

Etapas 1–6, com geração, revisão, link público, CRM e visitas. Este é o primeiro corte que entrega a promessa comercial principal.

### Corte B — Operação completa do Wesley

Adicionar Etapas 8 e 9 para transformar venda em projeto e prazo no Google Agenda.

### Corte C — Produto para equipe/escala

Adicionar Etapa 7, domínios customizados, relatórios avançados e hardening completo da Etapa 10.

## 8. O que deliberadamente não entra no primeiro MVP

- Envio oficial automatizado de WhatsApp, campanhas em massa e cold email.
- Sincronização bidirecional completa com Google Agenda.
- Editor visual livre no estilo page builder.
- Cobrança/assinaturas da plataforma.
- Múltiplos sites por lead, A/B testing e analytics comportamental avançado.
- Compra/registro automático de domínios.
- Scraping de sites e redes sociais fora de integrações/licenças permitidas.

## 9. Riscos que precisam de decisão cedo

1. **Qualidade versus liberdade da IA:** schema + componentes elevam consistência e segurança, mas limitam layouts totalmente livres. Para uso comercial, esta é a escolha recomendada.
2. **Dados/fotos do Google:** regras de armazenamento, cache, atribuição e exibição precisam ser confirmadas contra os termos vigentes antes de persistir ou publicar conteúdo.
3. **Visita não identifica necessariamente a empresa:** o link por lead indica forte associação, mas pode ter sido encaminhado. A interface deve dizer “visitas ao link do lead”, não afirmar identidade pessoal.
4. **Serverless e geração em lote:** jobs longos não devem depender do tempo de vida de uma requisição Vercel.
5. **Google OAuth:** consentimento, armazenamento seguro de tokens e eventual verificação do app podem afetar o cronograma.
6. **Custo imprevisível:** field masks, limites por busca, cotas por workspace e registro de tokens são obrigatórios desde o início.
7. **Automação de contato:** obter um telefone público não equivale a autorização para disparos em massa; consentimento, opt-out e regras do canal precisam ser tratados antes de automatizar mensagens.

## 10. Critérios de sucesso do MVP

- Uma busca real importa leads sem duplicatas e sem expor a chave do Google.
- Um lote de pelo menos 20 leads pode ser processado com sucesso parcial e retentativa segura.
- Todo site publicado deriva de JSON válido e pode ser revisado antes de ir ao ar.
- A rota pública não revela notas, valores, membros ou dados internos do CRM.
- Visitas aparecem no CRM com recência e distinção entre views e visitantes aproximados.
- Wesley consegue registrar contato, follow-up, proposta, venda e valor.
- Uma venda ganha pode virar projeto; tarefa com prazo pode ser sincronizada uma única vez na Google Agenda.
- Testes provam isolamento entre workspaces e ausência de segredos no cliente.

## 11. Protocolo de mudança deste plano

- Toda nova ideia entra primeiro em uma destas categorias: `MVP`, `pós-MVP`, `experimento` ou `fora de escopo`.
- Se alterar modelo de dados, segurança, provedor ou dependências, registrar a decisão antes de implementar.
- Uma etapa pode ser dividida quando exceder um PR/sessão revisável; preservar os mesmos critérios de saída.
- Reordenar somente quando as dependências e o E2E continuarem válidos.
- Feature flags protegem integrações externas e recursos ainda instáveis.

## 12. Revisão adversarial do plano

O ambiente atual não disponibilizou outro agente para a revisão independente prevista pelo processo de blueprint; foi feita uma revisão crítica local. Os principais problemas encontrados e incorporados foram:

- Evitar a promessa incorreta de que uma busca representa todas as empresas da região; documentado o limite e a instabilidade dos resultados da Text Search.
- Evitar atribuir uma visita a uma pessoa/empresa com certeza; a métrica foi definida como visita ao link do lead.
- Impedir execução de HTML produzido pela IA; adotado schema versionado + renderer confiável.
- Evitar jobs de IA presos ao timeout de requisição; adotada fila durável e idempotente.
- Evitar escopo OAuth excessivo e perda de tarefas quando a integração falhar; definido privilégio mínimo e desacoplamento.
- Evitar misturar o MVP individual com equipe, custom domains e mensageria em massa; estabelecidos cortes de entrega.
- Tornar a validação reproduzível; definidos scripts-padrão de qualidade e E2E.

## 13. Referências oficiais consultadas

- Google Places Text Search (New): https://developers.google.com/maps/documentation/places/web-service/text-search
- Google Places API (New), visão geral e fotos: https://developers.google.com/maps/documentation/places/web-service/op-overview
- Google Calendar, criação de eventos: https://developers.google.com/workspace/calendar/api/guides/create-events
- Google Calendar, escopos OAuth: https://developers.google.com/workspace/calendar/api/auth
- Supabase Auth/SSR: https://supabase.com/docs/guides/auth/server-side
- Supabase Row Level Security: https://supabase.com/docs/guides/database/postgres/row-level-security
- Groq Structured Outputs: https://console.groq.com/docs/structured-outputs
