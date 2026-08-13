# Contribuição

## Fluxo de branches

- `main` é a fonte da produção e deve permanecer protegida.
- Crie branches curtas a partir de `main`: `feature/...`, `fix/...` ou `chore/...`.
- Abra pull request, aguarde CI verde e use squash merge.
- Não faça push direto em `main` nem misture mudanças sem relação no mesmo PR.

## Validação local

```bash
docker compose up -d --build
docker compose exec backend pytest
docker compose exec backend ruff check .
cd frontend
npm ci
npm run lint
npm run typecheck
npm run build
npm run test:e2e
```

Toda mudança de modelo precisa de migration Alembic. Arquivos de dados brutos,
credenciais, dumps, logs e `.env` reais nunca devem ser versionados.
