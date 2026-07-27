# Metodologia

O infra-ms é um MVP técnico para organizar indicadores municipais de saneamento e infraestrutura dos municípios de Mato Grosso do Sul. A primeira etapa prioriza estrutura, banco de dados, importação, API e visualização simples.

## Dados oficiais

O projeto deve usar dados de fontes oficiais ou institucionais, como SINISA, SNIS Série Histórica, IBGE e bases públicas estaduais ou municipais. Nesta versão, os arquivos devem ser baixados manualmente e colocados em `data/raw`, sem tentativa de contornar login, CAPTCHA, CORS, erro 403 ou endpoints internos.

## Chave de padronização

A chave principal para cruzamento é sempre o `codigo_ibge` do município. Nomes de municípios podem variar entre bases, então eles devem ser usados apenas como apoio para conferência ou tentativa controlada de identificação.

## Dado bruto e indicador tratado

Dado bruto é o arquivo original recebido ou baixado de uma fonte oficial. Ele deve ser preservado em `data/raw`.

Indicador tratado é a informação padronizada para consulta, com município, ano, fonte, código do indicador e valor. Arquivos processados pelo importador são salvos em `data/processed` para auditoria e reprocessamento.

## Rastreabilidade

Cada importação deve registrar fonte, ano de referência, nome do arquivo, data de importação, total de linhas, linhas importadas, erros e avisos. Esse registro ajuda a revisar divergências e atualizar os dados quando a fonte publicar uma nova versão.

## Limitações da primeira versão

O importador é genérico e ainda não cobre perfeitamente todos os layouts de SINISA/SNIS. Campos categóricos são tratados de forma simples, e geometrias municipais completas ainda não foram incorporadas. As próximas etapas podem adicionar mapas, gráficos, rankings mais completos, comparadores e validações específicas por fonte.
