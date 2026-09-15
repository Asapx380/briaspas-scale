# QA e matriz de nichos

## Matriz visual obrigatória

Antes de uma versão comercial, gere e compare ao menos:

1. Clínica odontológica — linguagem confiável, clara e acolhedora.
2. Barbearia — linguagem próxima, composição editorial e tons quentes.
3. Restaurante — destaque fotográfico, apetite e reserva rápida.
4. Escritório contábil — estrutura sóbria, informação e credibilidade.

Falha se dois nichos repetirem simultaneamente a mesma paleta, família tipográfica, composição de hero e motivo gráfico.

## Viewports

- 320 × 568
- 360 × 800
- 375 × 812
- 768 × 1024
- 1440 × 900

Em cada largura, verificar: nenhum scroll horizontal na página, CTA visível, texto sem corte, navegação alcançável por teclado, mapa contido e imagens com proporção preservada.

## Estado desta rodada

- Build de produção, lint, TypeScript, testes unitários e auditoria de segredos: aprovados.
- Smoke test autenticado de CRM, Equipe, Projetos e Operação: aprovado.
- Nova navegação: todos os destinos renderizaram; módulos dependentes da migration exibem orientação em vez de quebrar.
- Regressão visual por screenshot: inconclusiva sem baseline versionado.
- Teste real em 320/360/375 e comparação de quatro gerações: pendentes até aplicar a migration e publicar páginas de teste.

Não classificar acessibilidade como totalmente aprovada apenas pelos validadores automáticos; ainda é necessário um passe manual de teclado e leitor de tela.
