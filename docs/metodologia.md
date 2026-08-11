# Metodologia

O Observatório de Saneamento é uma plataforma para organizar indicadores municipais de saneamento e infraestrutura dos municípios de Mato Grosso do Sul. A primeira etapa prioriza estrutura, banco de dados, importação, API e visualização simples.

## Dados oficiais

O projeto deve usar dados de fontes oficiais ou institucionais, como SINISA, SNIS Série Histórica, IBGE e bases públicas estaduais ou municipais. Nesta versão, os arquivos devem ser baixados manualmente e colocados em `data/raw`, sem tentativa de contornar login, CAPTCHA, CORS, erro 403 ou endpoints internos.

## Chave de padronização

A chave principal para cruzamento é sempre o `codigo_ibge` do município. Nomes de municípios podem variar entre bases, então eles devem ser usados apenas como apoio para conferência ou tentativa controlada de identificação.

## Dado bruto e indicador tratado

Dado bruto é o arquivo original recebido ou baixado de uma fonte oficial. Ele deve ser preservado em `data/raw`.

Indicador tratado é a informação padronizada para consulta, com município, ano, fonte, código do indicador e valor. Arquivos processados pelo importador são salvos em `data/processed` para auditoria e reprocessamento.

## Rastreabilidade

Cada importação deve registrar fonte, ano de referência, nome do arquivo, data de importação, total de linhas, linhas importadas, erros e avisos. Esse registro ajuda a revisar divergências e atualizar os dados quando a fonte publicar uma nova versão.

## Ranking municipal — referência PNQS/ABES

O ranking municipal é um cálculo próprio do Observatório, inspirado no sistema de indicadores do Guia de Referência para Medição do Desempenho (GRMD) do PNQS/ABES. Ele não é uma classificação, nota, certificação ou premiação oficial da ABES. O PNQS avalia organizações de saneamento por metodologia própria; aqui, a referência foi adaptada à unidade municipal e aos dados públicos disponíveis no SINISA/SNIS.

A nota varia de 0 a 100 e reúne 16 indicadores do ano de 2023 em cinco módulos: água (25%), esgoto (25%), resíduos sólidos (20%), águas pluviais (20%) e gestão municipal (10%). Dentro de cada módulo, os indicadores disponíveis têm o mesmo peso. Percentuais são limitados ao intervalo de 0 a 100; a massa recuperada de resíduos é convertida em posição percentílica entre os municípios do estado; e perdas de água, domicílios sujeitos a inundação e população impactada por eventos hidrológicos têm sentido invertido, pois valores menores representam melhor desempenho.

Indicadores ausentes não são estimados e recebem contribuição zero, mantendo o peso originalmente reservado a eles. A tela informa a cobertura de dados de cada município. Em caso de empate na nota, prevalece a maior cobertura e, depois, a ordem alfabética. As fontes de referência são o [PNQS](https://pnqs.com.br/), o [GRMD 2026](https://pnqs.com.br/wp-content/uploads/2026/02/GRMD-2026-v1.0.pdf) e o [Regulamento PNQS 2026](https://pnqs.com.br/wp-content/uploads/2026/02/Regulamento-PNQS-2026-v1.2.pdf).

## Limitações da primeira versão

O importador é genérico e ainda não cobre perfeitamente todos os layouts de SINISA/SNIS. Campos categóricos são tratados de forma simples, e geometrias municipais completas ainda não foram incorporadas. As próximas etapas podem adicionar mapas, gráficos, rankings mais completos, comparadores e validações específicas por fonte.
