# Observatório de Saneamento

Plataforma pública do CESAM para consulta, comparação e exportação de indicadores municipais de saneamento de Mato Grosso do Sul.

## Arquitetura

```text
frontend/   Next.js 15, React 19, TypeScript, Tailwind e Playwright
backend/    FastAPI, SQLAlchemy, Alembic, Pytest e importadores oficiais
data/       exemplos versionados e áreas locais de dados brutos/processados
docs/       metodologia, operação, implantação e decisões de arquitetura
tests/      cenários de carga com k6
```

Produção atual: frontend e API na Vercel, PostgreSQL no Supabase. O repositório também oferece uma composição para VPS com Caddy.

## Início rápido

Requisitos: Docker Desktop, Git e portas `3002` e `8000` livres.

```powershell
docker compose up -d --build
docker compose ps
```

- Site: http://localhost:3002
- API: http://localhost:8000
- OpenAPI: http://localhost:8000/docs
- PostgreSQL: acessível apenas dentro da rede Docker

O serviço `db-init` aplica migrations, cadastra os 79 municípios e importa automaticamente os arquivos oficiais
disponíveis em `data/raw` antes de liberar a API. Nenhum worker HTTP cria tabelas. Se os arquivos do SINISA ainda não
estiverem presentes, a inicialização mantém a base disponível e usa o último ano importado do SNIS histórico.

Para alterar portas ou CORS: `Copy-Item .env.development.example .env`.

## Ambientes

| Ambiente | Frontend | API | Banco | Inicialização |
|---|---|---|---|---|
| Desenvolvimento | Docker/Next dev, porta 3002 | Docker/Uvicorn reload, porta 8000 | PostGIS Docker | `db-init` |
| Testes | Next production local | FastAPI | PostGIS descartável | Alembic + fixture E2E |
| Produção atual | Vercel | Vercel Functions | Supabase Transaction Pooler | migration manual protegida |
| VPS futura | Next standalone + Caddy | Uvicorn com 2 workers | PostGIS Docker | `db-init` |

Exemplos: `.env.development.example`, `.env.test.example`, `.env.production.example`, `backend/.env.example` e `frontend/.env.example`.

## Qualidade

```powershell
docker compose run --rm backend sh -c "pip install -r requirements-dev.txt && ruff check . && pytest"
Set-Location frontend
npm ci
npm run lint
npm run typecheck
npm run build
npm run test:e2e
```

A CI repete lint, cobertura, auditorias, migrations, build, containers e testes ponta a ponta. Consulte [CONTRIBUTING.md](CONTRIBUTING.md) antes de abrir um PR.

## Banco e importações

Toda alteração de modelo exige migration:

```powershell
docker compose run --rm db-init
docker compose exec backend alembic check
```

Prestadores, endereços e documentos institucionais ficam no banco e são expostos em `GET /municipios/{codigo_ibge}/institucional`.

Arquivos oficiais locais ficam em `data/raw/` e nunca são versionados:

```powershell
docker compose exec backend python -m app.scripts.importar_sinisa_2023
docker compose exec backend python -m app.scripts.importar_snis_historico
docker compose exec backend python -m app.scripts.atualizar_ibge
```

## Implantação

- Vercel + Supabase: [docs/deploy-vercel-supabase.md](docs/deploy-vercel-supabase.md)
- Operação, cache, pool e carga: [docs/arquitetura-operacional.md](docs/arquitetura-operacional.md)
- VPS: copie `.env.production.example` para `.env` e execute `docker compose -f docker-compose.prod.yml up -d --build`.

Nunca versione senhas, dumps, `.env` reais, dados brutos ou logs.
