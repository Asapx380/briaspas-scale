# Evolução da Briaspas Scale por partes

Este documento transforma o checklist amplo em entregas pequenas e verificáveis.

## Parte 1 — Qualidade e fidelidade da geração (concluída)

- [x] Tratar dados objetivos do lead como imutáveis.
- [x] Gerar a URL de WhatsApp no servidor e aplicá-la aos três CTAs.
- [x] Banir clichês visuais recorrentes de páginas geradas por IA.
- [x] Exigir escala tipográfica, largura de leitura e limite de fontes.
- [x] Restringir animações e respeitar `prefers-reduced-motion`.
- [x] Exigir SEO mínimo, foco visível e texto alternativo das imagens.
- [x] Recusar HTML maior que 150 KB ou que falhe nas regras mínimas.
- [x] Testar a geração real de um lead sem publicar o rascunho.

## Parte 2 — Fluxo de duas passadas

- [ ] Primeira chamada: produzir um plano de design estruturado.
- [ ] Validar o plano antes de gerar HTML.
- [ ] Segunda chamada: gerar o HTML usando o plano aprovado.
- [ ] Registrar plano, modelo, duração e erros no `site_schema`.
- [ ] Comparar quatro nichos para confirmar variedade real.

Observação: o checklist cita `gerador-duas-passadas.md`, mas esse arquivo ainda não está no projeto. A implementação deve preservar a intenção descrita acima ou incorporar o documento caso ele seja adicionado depois.

## Parte 3 — Segurança da publicação

- [ ] Adicionar sanitização dedicada além das validações atuais.
- [ ] Resolver o conflito entre mapa incorporado e remoção de `allow-scripts`.
- [ ] Adicionar CSP para CRM e páginas públicas.
- [ ] Documentar rotação das chaves e automatizar a auditoria de exposição.

## Parte 4 — Confiabilidade e custos

- [ ] Retry controlado e fallback da IA.
- [ ] Rate limiting de busca, importação e geração.
- [ ] Logs de duração, erro, modelo e custo estimado.
- [ ] Cache da rota pública com revalidação.

## Parte 5 — Dados e métricas

- [ ] Deduplicar leads entre fontes.
- [ ] Deduplicar visitas por dia.
- [ ] Decidir entre HTML validado e schema JSON + renderer.
- [ ] Confirmar backup e restauração do Supabase.

## Parte 6 — Produto

- [ ] Distribuição de leads para vendedores.
- [ ] Resultado mensal por vendedor.
- [ ] Alertas de follow-up vencido.
- [ ] Projetos e tarefas.
- [ ] Domínio próprio e certificado.
- [ ] Google Agenda por último.

## Parte 7 — Testes, operação e LGPD

- [ ] Testes automatizados das rotas críticas.
- [ ] Testes em 320, 360 e 375 px.
- [ ] Monitoramento de custos dos provedores.
- [ ] Política de retenção e remoção de dados conforme a LGPD.
