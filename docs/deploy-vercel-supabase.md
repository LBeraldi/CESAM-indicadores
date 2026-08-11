# Publicação na Vercel com Supabase

O repositório é publicado como dois projetos Vercel independentes, ambos ligados ao mesmo repositório GitHub.

## 1. API FastAPI

Crie o primeiro projeto e selecione `backend` como **Root Directory**. Não configure Build Command nem Output Directory.

Variáveis para Production e Preview:

```text
DATABASE_URL=postgresql://postgres.REF:SENHA@HOST.pooler.supabase.com:6543/postgres?sslmode=require
DB_POOL_MODE=serverless
AUTO_INIT_DB=false
CORS_ORIGINS=https://URL-DO-FRONTEND.vercel.app
CORS_ORIGIN_REGEX=https://.*\.vercel\.app
```

Use a URL **Transaction pooler** do Supabase, porta `6543`. `DATABASE_URL` é secreta e nunca deve ser adicionada ao Git.

Depois do deploy, valide `https://URL-DA-API.vercel.app/health` e confirme que `database` é `ok`.

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
