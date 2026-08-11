# Observatório de Saneamento

MVP técnico para uma plataforma pública de indicadores municipais de saneamento e infraestrutura dos municípios de Mato Grosso do Sul.

Nesta primeira etapa, o projeto entrega uma base simples: PostgreSQL/PostGIS, backend FastAPI, importador de arquivos oficiais, lista base dos 79 municípios de MS, API inicial e frontend Next.js para conferência.

## Estrutura

```text
backend/   API FastAPI, SQLAlchemy, Alembic e importador
frontend/  Next.js, TypeScript e Tailwind CSS
data/      arquivos brutos, processados e exemplos
docs/      metodologia e governança de dados
```

## Configuração

Copie os exemplos de ambiente se quiser rodar fora do Docker:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Não coloque senhas reais no repositório. Para desenvolvimento local, os valores do `docker-compose.yml` usam credenciais descartáveis.

## Rodar com Docker

```bash
docker-compose up --build
```

Serviços:

- API: `http://localhost:8000`
- documentação OpenAPI: `http://localhost:8000/docs`
- frontend: `http://localhost:3000`
- PostgreSQL/PostGIS: `localhost:5432`

O backend cria as tabelas e cadastra automaticamente os municípios de MS e os indicadores iniciais ao iniciar.

## Publicar em produção

O projeto inclui uma composição separada para VPS com Docker. Ela utiliza:

- Next.js em modo `standalone`;
- FastAPI com múltiplos workers;
- PostgreSQL/PostGIS sem porta pública;
- Caddy como proxy reverso e HTTPS automático;
- reinício automático dos serviços.

No DNS do domínio, crie registros `A` apontando para o IP público da VPS:

```text
@     -> IP_DA_VPS
www   -> IP_DA_VPS
api   -> IP_DA_VPS
```

Na VPS, copie o exemplo de ambiente e defina uma senha longa e exclusiva:

```bash
cp .env.production.example .env
nano .env
```

Libere somente as portas `22`, `80` e `443` no firewall. Depois execute:

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

Para carregar os dados oficiais, envie os arquivos necessários para `data/raw/` na VPS e execute:

```bash
docker compose -f docker-compose.prod.yml exec backend python -m app.scripts.importar_sinisa_2023
docker compose -f docker-compose.prod.yml exec backend python -m app.scripts.importar_snis_historico
```

Os arquivos `.env`, bases brutas, bases processadas, logs e ferramentas locais não são versionados.

### Backup do banco

Exemplo de backup manual:

```bash
docker compose -f docker-compose.prod.yml exec -T db \
  pg_dump -U observatorio_saneamento -d observatorio_saneamento -Fc > observatorio_saneamento_$(date +%F).dump
```

Guarde cópias fora da VPS e teste periodicamente a restauração.

## Importar municípios

Os municípios base ficam em:

```text
data/examples/municipios_ms.csv
```

Eles são importados automaticamente pelo backend no startup. A chave de cruzamento é `codigo_ibge`.

## Importar dados oficiais

Coloque arquivos `.csv`, `.xlsx`, `.xls` ou `.zip` em:

```text
data/raw/
```

Com os containers rodando, execute:

```bash
docker-compose exec backend python -m app.scripts.importar_dados --input /app/data/raw --fonte SINISA --ano 2024
```

Rodando localmente a partir de `backend/`:

```bash
python -m app.scripts.importar_dados --input ../data/raw --fonte SINISA --ano 2024
```

O importador preserva os arquivos originais, salva uma versão tratada em `data/processed`, tenta identificar município, UF, código IBGE, ano e colunas de indicadores, filtra Mato Grosso do Sul e registra logs no banco.

## Importar SINISA 2023

Para a carga oficial do SINISA 2024, ano de referência 2023, baixe os arquivos públicos do Ministério das Cidades em `data/raw`:

- `SINISA_Resultados_Ref2023.zip`
- `SINISA_ESGOTO_Planilhas_2023_v2.zip`
- `SINISA_GESTAOMUNICIPAL_Informacoes_2023.xlsx`

Com os containers rodando, execute:

```bash
docker-compose exec backend python -m app.scripts.importar_sinisa_2023
```

O script mapeia indicadores oficiais de água, esgoto e gestão municipal para os códigos internos do MVP e grava um resumo tratado em:

```text
data/processed/sinisa_2023_ms_indicadores_tratado.csv
```

## Endpoints iniciais

```text
GET /health
GET /municipios
GET /municipios/{codigo_ibge}
GET /indicadores
GET /indicadores?tema=agua
GET /municipios/{codigo_ibge}/indicadores
GET /municipios/{codigo_ibge}/indicadores?ano=2024
GET /ranking?indicador=agua_atendimento_total&ano=2024
GET /ranking/saneamento?ano=2023
```

## Operação e qualidade

Antes de publicar uma alteração de banco:

```bash
cd backend
python -m app.scripts.migrar
alembic check
```

Atualize população e área do IBGE fora das requisições públicas:

```bash
python -m app.scripts.atualizar_ibge
```

Testes e decisões de cache, pool, carga e SSE estão documentados em
[`docs/arquitetura-operacional.md`](docs/arquitetura-operacional.md).

## Próximas etapas

Para uma publicação provisória com frontend e API na Vercel e PostgreSQL no Supabase, consulte [docs/deploy-vercel-supabase.md](docs/deploy-vercel-supabase.md).

- mapear layouts específicos de SINISA/SNIS;
- importar população e área por fonte oficial;
- adicionar validações por indicador;
- criar rankings e comparadores mais completos;
- incluir gráficos e mapas;
- publicar fichas municipais mais ricas;
- definir fluxo institucional para dados não públicos.
