# ADR 001 — formato dos sites gerados

## Decisão

Migrar progressivamente de HTML livre para um schema JSON validado e um renderer próprio.

## Motivo

O HTML sanitizado permite evoluir o MVP rapidamente, mas continua caro de validar e difícil de editar por seção. O renderer JSON melhora segurança, consistência, acessibilidade, testes e edição visual.

## Estado atual

O pipeline em duas passadas ainda retorna HTML, porém salva junto um site_schema versionado, o plano visual e os dados do lead. Todo HTML passa por allowlist, validação e sandbox. Scripts são recusados.

## Próxima versão

Criar componentes próprios para cabeçalho, hero, serviços, prova social, galeria, localização e CTAs. A IA retornará apenas conteúdo, tokens de design e referências a mídias permitidas. Sites v2 atuais permanecem renderizáveis durante a migração.
