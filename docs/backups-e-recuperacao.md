# Backups e recuperação

## Frequência sugerida

- Produção: backup diário e retenção mínima de 14 dias.
- Antes de migrations: exportar schema e dados críticos.
- Mensalmente: restaurar um backup em projeto isolado e validar contagens de workspaces, leads, projetos e sites publicados.

## Teste de recuperação

1. Criar ambiente temporário sem usuários reais.
2. Restaurar o backup.
3. Comparar contagens e amostras com o relatório de origem.
4. Validar login, RLS, abertura do CRM e uma página publicada.
5. Registrar data, duração, responsável e divergências.

O backup só é considerado confiável depois de um teste de restauração bem-sucedido.
