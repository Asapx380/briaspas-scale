# T10 — Lighthouse, acessibilidade e acabamento

Medição mobile realizada em 19/09/2026. O comparativo usa a produção anterior como
linha de base e o build local do PR como resultado.

| Rota | Antes — P / A / BP / SEO | Depois — P / A / BP / SEO |
| --- | --- | --- |
| `/` | 92 / 100 / 100 / 100 | 97 / 100 / 100 / 100 |
| `/demonstracao` | 97 / 96 / 100 / 100 | 99 / 100 / 100 / 100 |

## Matriz verificada

- Viewports: 375, 768 e 1280 px.
- Navegação por teclado e foco visível.
- `prefers-reduced-motion: reduce` sem conteúdo oculto.
- Canonicals específicos para `/` e `/demonstracao`.
- Contraste e alvos de toque das páginas públicas.
- Remoção das animações CSS sem consumidores.

Os testes E2E cobrem os limites do cabeçalho, canonicals, persistência do tema,
movimento reduzido, atalho de teclado e visibilidade do botão Entrar no hover.
