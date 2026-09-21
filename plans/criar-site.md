# Plano: Criar site, Meus sites e construtor por conversa

## Como usar este plano
- Um PR por vez, em branch própria, sempre em draft. Nunca misturar tarefas de PRs diferentes.
- Ao terminar cada PR: rodar npm run check (e npm run test:e2e se o ambiente permitir), esperar o CI (incluindo o job "browser") e parar.
- Relatório final de cada PR: link do PR, o que mudou, o que ficou de fora, resultado do check e do CI, e o que precisa de conferência visual minha (375, 768, 1024 e 1280 px).
- Não fazer merge. Eu mesclo pelo GitHub.
- Antes de codar qualquer PR, responder só com um plano curto (arquivos que vai tocar e dúvidas) e esperar meu ok.

## Contexto
Briaspas Scale é um CRM de prospecção (Next.js 16, React 19, TypeScript, Tailwind 4, Supabase com RLS, deploy na Vercel). Já existem:
- AppShell com sidebar neumórfica (src/components/app/app-sidebar.tsx) e tokens --neu-* em globals.css;
- logo em public/brand/briaspas-scale-symbol.png;
- leads com site_html, site_schema, site_status e slug;
- rota POST /api/v1/leads/[id]/generate-site (pipeline em duas passadas, provedores Groq, OpenAI e Gemini, Pexels, registro em generation_runs);
- catálogo de 15 templates (src/lib/sites/template-catalog.ts e template-renderer.ts);
- upload de ZIP, prévia privada e publicação em /empresa/[slug].
Ler antes de começar: AGENTS.md, docs/geracao-de-sites.md, docs/adr-001-formato-dos-sites-gerados.md e docs/fontes-limites-e-custos.md.

## Objetivo
Transformar o app num construtor de sites por lead, no estilo de um "Lovable" interno: criar o site a partir dos dados do lead, listar na galeria "Meus sites" e, em fases futuras, editar com prévia ao vivo e por conversa. O site deve sair bem completo, usando só dados reais do lead.

## Referência visual (2 prints anexados nos PRs 1 e 3)
Usar APENAS como referência de estrutura:
- menu lateral com item de destaque "Criar site" ao fim da lista;
- tela central com logo grande, título, subtítulo e cartão com abas e busca;
- galeria com cards com capa, nome, selo de status, "Editado há X", busca e ordenação.
Proibido reproduzir logo/estrela, nome, textos, ícones, ilustrações ou qualquer arte do produto de referência. Usar a logo do Briaspas, os tokens e a identidade atuais e copy própria em português do Brasil.

## Decisões já tomadas
- Item de menu "Meus sites" (rota /app/sites). "Projetos" (pós-venda) continua como está.
- Rota da criação: /app/criar-site (não /app/sites/novo, para o menu não destacar dois itens por prefixo).
- Sem itens de menu sem função real: nada de Cobrar clientes, Ranking, Templates, Seja um afiliado, Fazer upgrade ou troca de idioma.
- Aba "Link do Google": desabilitada, com "Em breve". Nenhuma chamada ao Google Places nesta entrega.
- Hospedagem: site publicado em /empresa/[slug]. Domínio próprio é próxima etapa e não pode ser prometido na interface.
- Sem dados inventados: nada de depoimentos, números, horários, preços ou endereços que não estejam no lead. Foto de banco sempre com crédito e rótulo.
- Não alterar o conteúdo da página Dashboard, a landing (exceto no PR 6) nem a autenticação.

## Regras técnicas
- Reusar tokens (--neu-*, --brand etc.), ícones Phosphor e a lib motion; sem dependência pesada nova sem avisar. Respeitar o tema claro e escuro que já existir.
- Texto pequeno (menor que 14px) usa --text-3, nunca --text-4. Texto de marca sobre fundo claro tingido usa --brand-hover. Contraste AA, foco visível, teclado e prefers-reduced-motion.
- Textos em pt-BR, sem emojis.
- Segredos só no servidor. Entrada do usuário (descrição, nome, cor) validada com zod no servidor e tratada como dado não confiável no prompt (bloco delimitado, instruindo o modelo a ignorar instruções ali dentro). A saída passa pela sanitização e validação existentes.
- checkRateLimit é em memória e não vale em serverless. Para geração por IA, usar cota diária por workspace baseada em contagem de generation_runs (SITE_GENERATION_DAILY_LIMIT, padrão 20), com mensagem clara ao estourar.
- Não criar nem aplicar migration sem antes me mostrar o plano (colunas, RLS e rollback).
- Nunca enviar .env, chaves ou leads reais em prompts, testes ou amostras. Amostras usam só leads fictícios.

## Lições deste repositório (evitar regressão)
- Não usar data-reveal="clip" em nada novo: o Chromium nunca dispara IntersectionObserver em elemento totalmente recortado por clip-path, e o conteúdo fica invisível.
- No e2e, usar locators escopados. getByText que casa com vários elementos quebra em strict mode. toBeVisible ignora clip-path e opacidade, então checar com toHaveCSS quando isso importar.
- Painéis puramente demonstrativos são decorativos (aria-hidden e inert). Nada focável que não faça nada.
- Sem layout shift: reservar altura, animar só transform e opacity.
- Tela nova precisa de rota de fixture em /preview/... (padrão de /preview/crm) para testar sem login.

## PR 1: Navegação e "Meus sites"
1.1 Sidebar (app-sidebar.tsx): ordem Dashboard, Leads, CRM, Agendamentos, Meus sites (ícone Globe), Equipe, Projetos, Operação, Integrações. "Criar site" como item de destaque (pílula em --brand, texto branco, ícone sparkle) logo abaixo da lista; no modo recolhido, só o ícone com title. Manter logo e nome atuais.
1.2 /app/sites: título "Meus sites", subtítulo próprio, busca por nome (query param q, com debounce), ordenação (Última edição, Nome, Status), grid de 1/2/3 colunas e paginação com ListPagination (6/12/24).
Card: capa, nome da empresa, chip de nicho, status (ready = Rascunho, published = Publicado, generating = Gerando, failed = Falhou), "Editado há X" (pt-BR, Intl.RelativeTimeFormat) e menu de ações (Abrir prévia, Abrir site publicado quando publicado, Ver no CRM). Clicar no card abre /app/leads/[id]/site.
Capa v1: primeira foto real do lead; sem foto, gradiente com as iniciais nos tokens da marca. NÃO selecionar site_html na listagem. Miniatura por screenshot fica fora desta entrega.
Dados: leads do workspace com site (site_status diferente de not_generated ou site enviado por ZIP; inspecionar supabase/migrations/202609090002_site_briefs_and_uploaded_sites.sql). Última edição: usar coluna existente de geração ou publicação; se não houver coluna adequada, propor migration antes.
Estados: carregando (skeleton), vazio (com botão Criar site) e erro.
1.3 Restilizar /app/leads/[id]/site (hoje com fundo escuro fixo) com os tokens do app e um cabeçalho igual ao do resto.
1.4 Testes: unitários do mapeamento de status e do tempo relativo; fixture /preview/sites e e2e (a galeria renderiza, a busca filtra, estado vazio).
Critério: nenhum item de menu com destaque duplicado por prefixo; npm run check verde.

## PR 2a: Validador de site gerado (sem chamar IA)
Em generated-site-validation.ts, funções puras que checam o HTML gerado:
- seções obrigatórias presentes (header, hero, serviços, contato, rodapé) e um único h1;
- ausência de placeholders (lorem, {{ }}, TODO);
- ausência de números, depoimentos e horários que não vieram do lead;
- links wa.me e de mapa coerentes com o telefone e o endereço do lead;
- seção sem dado real omitida (prova social sem avaliação real, galeria sem foto real ou de banco rotulada, mapa sem endereço).
Retornar lista de erros legíveis. Testes com HTML de fixture (um válido e um por tipo de erro). Não chamar provedor de IA.

## PR 2b: Prompt melhor e amostras (portão de qualidade)
Só depois do 2a aprovado. Contexto: resultados de gerações anteriores não agradaram; este PR prova a qualidade antes de investir em interface.
- Revisar buildLeadSitePrompt e buildDesignPlanPrompt (não criar outro pipeline) para exigir o site completo: header com CTA, hero, serviços, sobre, diferenciais, prova social só com nota e número de avaliações reais do lead, galeria só com fotos reais ou de banco rotuladas, localização com mapa quando houver endereço, botão flutuante de WhatsApp, FAQ curto do nicho sem afirmações factuais inventadas, CTA final e rodapé com créditos das fotos.
- Qualidade técnica: mobile-first, HTML semântico, um h1, alt nas imagens, meta title e description, Open Graph, JSON-LD LocalBusiness só com campos reais, sem scripts externos, peso baixo.
- Integrar o validador do 2a: se falhar, nova tentativa com os erros no prompt, no máximo 2.
- scripts/generate-site-samples.ts: 5 leads FICTÍCIOS (petshop, odontologia, salão de beleza, oficina, advocacia) gerando em /tmp/briaspas-samples/. Ao final, relatório por amostra: tempo, tokens, tentativas, custo estimado e resultado do validador.
- Testes com fixtures do prompt builder. Não usar chave de produção em teste automatizado.
Parar aqui e esperar meu veredito sobre as 5 amostras antes do PR 3.

## PR 3: Criar site (/app/criar-site)
3.1 Tela: logo do Briaspas grande e centralizada, título e subtítulo originais (ex.: "Crie o site de um negócio em poucos minutos") e cartão com as abas "Lead existente" (padrão), "Descrever" e "Link do Google" (desabilitada, "Em breve").
- Lead existente: busca por nome ou cidade e lista com inicial, nome e nicho · cidade. Selo "Já tem site" com link para abri-lo. Aviso para leads sem telefone. Link "Buscar mais leads" para /app/leads (a busca por nicho e cidade já existe lá; não duplicar).
- Descrever: nome*, nicho* (categorias do catálogo + "Outro"), cidade*, telefone/WhatsApp, endereço, Instagram e descrição livre (até 600 caracteres: serviços, diferenciais, horário). Ao gerar, cria um lead manual (source manual) no workspace, com deduplicação, e segue o fluxo.
3.2 Barra inferior: seletor "Modelo" (Automático pelo nicho + os 15 de listSiteTemplateManifests()), Estilo (Moderno, Clássico, Minimalista), cor principal (paleta sugerida + hex validado), CTA principal (WhatsApp, Ligar, Agendar, Pedir orçamento) e botão "Gerar", desabilitado até a seleção ser válida, com o motivo visível.
3.3 API: estender POST /api/v1/leads/[id]/generate-site com corpo opcional { templateId?, style?, primaryColor?, cta? } validado por zod (templateId em allowlist do catálogo, cor #RRGGBB, enums). As preferências entram no prompt como dados delimitados. Aplicar a cota diária (contagem em generation_runs), mantendo o lock site_status=generating.
3.4 Progresso: estado de geração honesto (mensagem "pode levar até 1 minuto", sem barra falsa), erro com "Tentar de novo" e possibilidade de sair da tela sem perder o lead criado. Ao terminar, abrir /app/leads/[id]/site (prévia privada). A publicação continua manual, como hoje.
3.5 Testes: zod do corpo da API, cota, criação de lead manual, fixture /preview/criar-site e e2e (abas, aba Google desabilitada, botão Gerar bloqueado sem seleção).

## PR 4: SÓ PLANO. Editor com prévia ao vivo
Não codar. Criar plans/editor-ao-vivo.md em PR docs-only com o plano de: schema JSON versionado (v3) conforme docs/adr-001, renderer próprio (header, hero, serviços, prova social, galeria, localização, CTAs), compatibilidade com sites v2 já gerados, painel de ajustes (cores, textos, seções, botão de WhatsApp) com prévia em iframe sandbox, salvar rascunho e publicar. Incluir migrations necessárias, riscos e estimativa de PRs.

## PR 5: SÓ PLANO. Chat por IA sobre o schema
Não codar. Criar plans/chat-por-ia.md em PR docs-only com o plano de: chat à esquerda e prévia à direita; a IA devolve SOMENTE JSON de ajustes (patch no schema v3), validado no servidor, nunca HTML ou JS livre; histórico de versões com desfazer; cota diária por workspace; escolha de provedor (preferência por gratuitos, Groq e Gemini, com o fallback já existente) e custo estimado por edição via generation_runs; aviso sobre os dados de leads enviados ao provedor conforme os termos atuais do plano usado; riscos de prompt injection e mitigação.

## PR 6: Landing (só depois do PR 3 em produção)
Atualizar a copy da seção de recursos e o README ("O que já funciona") para refletir o que existe:
- busca por nicho e cidade (Foursquare, CSV e manual; sem citar Google Maps);
- site-demo personalizado a partir dos dados do lead;
- Meus sites;
- CRM comercial com registro de visitas;
- construtor por conversa com selo "Em breve";
- hospedagem no link do Briaspas (domínio próprio em breve).
Ajustar o e2e se algum texto mudar. Sem promessa de recurso inexistente.
