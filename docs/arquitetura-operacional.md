# Arquitetura operacional

## Leituras públicas

As rotas públicas são somente leitura. População e área territorial são atualizadas fora do ciclo HTTP com:

```bash
python -m app.scripts.atualizar_ibge
```

O ranking composto usa `GET /ranking/saneamento?ano=2023`, que seleciona em uma única consulta o registro oficial preferido de cada indicador e município.

## Cache e limite de requisições

Respostas públicas bem-sucedidas recebem cache de uma hora na CDN e tolerância de conteúdo antigo por um dia durante revalidação. O limite em memória (`RATE_LIMIT_PER_MINUTE`, padrão 120) é uma proteção de baixo custo por instância. Em produção com tráfego maior, a proteção global deve ficar no firewall da plataforma.

## Banco, pool e migrations

- Vercel usa `NullPool`; cada invocação devolve a conexão ao pooler externo.
- Supabase deve usar Transaction Pooler com `sslmode=require`.
- Em modo serverless, URLs antigas do Supavisor na porta 5432 são normalizadas internamente para a porta transacional 6543.
- Toda alteração de schema deve gerar uma migration Alembic.
- Antes de publicar o backend, execute `python -m app.scripts.migrar` contra o banco de produção. O comando também adota com segurança bancos legados criados antes do Alembic.
- Quando a credencial for somente gravação na plataforma, `RUN_DB_MIGRATIONS=true` pode ser usada em um único deploy. O processo utiliza advisory lock; remova a variável e republique após o health confirmar sucesso.
- A CI executa todas as migrations em um PostgreSQL/PostGIS descartável e usa `alembic check` para detectar mudanças de modelo sem migration.

## SSE

SSE não faz parte da arquitetura atual. Os dados são importados em lote e as páginas trabalham com cache; manter conexões abertas aumentaria custo e complexidade sem entregar atualização útil ao usuário. A decisão deve ser revista apenas se existirem importações longas com progresso ao vivo ou dados operacionais contínuos.

## Teste de carga

Instale k6 e rode inicialmente contra ambiente de preview:

```bash
k6 run -e API_URL=https://api-preview.exemplo -e SITE_URL=https://site-preview.exemplo tests/load/k6-smoke.js
```

O cenário cresce até 25 usuários virtuais e exige menos de 1% de falhas. O limite local sem CDN é p95 abaixo de dois segundos. Em preview ou produção, execute com `-e P95_MS=1000` para validar a meta de um segundo sobre respostas cacheadas.
