# Importação de leads

O Briaspas Scale aceita um arquivo CSV com até 100 empresas por importação. O caminho recomendado enquanto o Google Places estiver pausado é:

1. Buscar as empresas no Maps2Sheets.
2. Exportar o resultado como CSV.
3. Abrir **Adicionar leads** no Briaspas Scale.
4. Preencher nicho e cidade padrão, caso essas colunas não existam no arquivo.
5. Selecionar o CSV e conferir a pré-visualização.
6. Remover linhas indesejadas e clicar em **Importar empresas**.

## Colunas reconhecidas

Os títulos podem estar em português ou inglês. A importação reconhece variações comuns destes campos:

| Dado | Exemplos de título |
| --- | --- |
| Nome da empresa | `Nome`, `Name`, `Place Name`, `Business Name` |
| Telefone | `Telefone`, `Phone`, `Phone Number` |
| Endereço | `Endereço`, `Address`, `Formatted Address` |
| Nicho | `Categoria`, `Category`, `Business Category`, `Niche` |
| Cidade | `Cidade`, `City`, `Locality` |
| Site | `Site`, `Website`, `Website URL` |
| Google Maps | `Google Maps`, `Google Maps URL`, `Maps URL` |
| Avaliação | `Avaliação`, `Rating`, `Stars` |
| Quantidade de avaliações | `Avaliações`, `Reviews`, `Review Count` |
| Identificador do Google | `Place ID`, `Google Place ID` |

A única coluna obrigatória no arquivo é o nome da empresa. Nicho e cidade também são obrigatórios, mas podem ser preenchidos nos campos padrão antes da leitura do CSV.

## Proteções implementadas

- O arquivo é lido no navegador e só os campos reconhecidos são enviados ao servidor.
- O limite é de 2 MB e 100 empresas por importação.
- Links aceitos precisam começar com `http://` ou `https://`.
- O servidor valida novamente todos os dados.
- O mesmo arquivo pode ser importado novamente: empresas repetidas são ignoradas.
- As regras RLS do Supabase mantêm os leads dentro do espaço de trabalho do usuário autenticado.

## Modelo

Na tela de importação, use **Baixar modelo** para gerar um CSV de exemplo já compatível.

