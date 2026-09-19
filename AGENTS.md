<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# AGENTS.md — Briaspas Scale (landing / marketing)

## Modelos
- Evitar Other Models (Claude/GPT premium). Preferir Cursor Models / Composer.

## Escopo
- Só mexer em landing, `/demonstracao` e componentes de marketing, a menos que a tarefa diga o contrário.
- Não alterar área logada, auth, Supabase ou migrations sem pedir.

## Design
- Tokens só em `src/app/globals.css`. Cor nova = token no `:root`, nunca hex solto no JSX.
- Ícones: `@phosphor-icons/react`. Animações: `motion` ou CSS. Sem deps pesadas sem avisar.
- Todo movimento respeita `prefers-reduced-motion` (sem animação; conteúdo visível).
- A11y: contraste AA, foco visível, alt/aria-label, HTML semântico; nada essencial só em hover.
- Dados de exemplo fictícios e rotulados "Dados demonstrativos". Nunca leads reais.
- Sem emojis em código, UI, comentários ou README.
- Textos em pt-BR. Não prometer recurso inexistente.

## Entrega
- Ao terminar: `npm run check` e listar o que mudou, o que não mudou e decisões pendentes.

## Economia de créditos

- Responda em português, de forma compacta. Remova saudações, elogios, transições e texto de preenchimento.
- Preserve integralmente código, mensagens de erro, nomes de arquivo, comandos e termos técnicos.
- Resuma saídas longas de terminal. Mostre erros, avisos e o resumo final; consulte a saída completa somente quando necessária.
- Use `rtk` nos comandos compatíveis para reduzir saída (`git`, testes, lint, typecheck e buscas). Em falhas ambíguas, recupere a saída original.
- Use esforço baixo ou médio em execução direta já decidida. Reserve esforço alto para arquitetura nova, depuração difícil ou código desconhecido.
- Antes de tarefa grande, apresente um plano curto e aguarde confirmação. Para tarefa pequena e clara, execute diretamente.
