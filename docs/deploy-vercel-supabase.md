# Publicação na Vercel com Supabase

O repositório é publicado como dois projetos Vercel independentes, ambos ligados ao mesmo repositório GitHub.

## 1. API FastAPI

Crie o primeiro projeto e selecione `backend` como **Root Directory**. Não configure Build Command nem Output Directory.

Variáveis para Production e Preview:

```text
DATABASE_URL=postgresql://postgres.REF:SENHA@HOST.pooler.supabase.com:6543/postgres?sslmode=require
DB_POOL_MODE=serverless
CORS_ORIGINS=https://URL-DO-FRONTEND.vercel.app
RATE_LIMIT_PER_MINUTE=120
```

Use a URL **Transaction pooler** do Supabase, porta `6543`. `DATABASE_URL` é secreta e nunca deve ser adicionada ao Git.

Depois do deploy, valide `https://URL-DA-API.vercel.app/health` e confirme que `database` é `ok`.

Antes de publicar uma versão que contenha migrations, execute no diretório `backend`:

```bash
vercel env run -e production -- python -m app.scripts.preparar_banco --seed
```

Migrations e seed nunca são executados pelos workers HTTP. Essa etapa deve terminar antes de promover a nova API.
Em uma VPS, o `db-init` também importa automaticamente os arquivos encontrados em `data/raw`; na Vercel, os arquivos
oficiais devem ser importados explicitamente no ambiente de manutenção com `python -m app.scripts.importar_sinisa_2023`
e, se necessário, `python -m app.scripts.importar_snis_historico`.

## 2. Frontend Next.js

Crie o segundo projeto e selecione `frontend` como **Root Directory**. A Vercel detectará Next.js automaticamente.

Variáveis para Production e Preview:

```text
NEXT_PUBLIC_API_URL=https://URL-DA-API.vercel.app
API_INTERNAL_URL=https://URL-DA-API.vercel.app
NEXT_PUBLIC_SITE_URL=https://URL-DO-FRONTEND.vercel.app
```

Depois do primeiro deploy, substitua `NEXT_PUBLIC_SITE_URL` pela URL definitiva atribuída ao frontend e faça um Redeploy. Se o domínio do frontend mudar, atualize também `CORS_ORIGINS` na API.

## 3. Validação

- `/health` da API retorna `database: ok`;
- `/municipios?limit=100` retorna os 79 municípios;
- a página inicial, a consulta municipal e o ranking carregam dados;
- uma ficha municipal abre sem erro e exibe os indicadores;
- nenhum valor de `DATABASE_URL` aparece no repositório ou nos logs do navegador.
