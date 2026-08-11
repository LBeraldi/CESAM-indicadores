# Fontes de Dados

As fontes previstas para o Observatório de Saneamento são:

- SINISA;
- SNIS Série Histórica;
- IBGE;
- dados municipais obtidos por cooperação institucional;
- dados estaduais públicos.

## Uso nesta etapa

Nesta primeira etapa, os arquivos devem ser baixados manualmente nos canais oficiais e colocados em `data/raw`. O projeto não deve usar scraping agressivo, endpoints internos de painéis públicos, rotas com token não documentado ou qualquer tentativa de contornar login, CAPTCHA, CORS ou erro 403.

## Organização recomendada

Mantenha os nomes dos arquivos originais sempre que possível. Quando houver mais de uma versão da mesma fonte, inclua ano e data de download no nome do arquivo antes de colocar em `data/raw`.

Exemplo:

```text
data/raw/sinisa_agua_esgoto_2024_download_2026-07-07.xlsx
```

Os arquivos tratados gerados pelo importador são salvos em `data/processed`.
