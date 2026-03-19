# Structure

```
monorepo/
├── Makefile                        # All dev commands — wraps docker compose (APP=<app>)
├── docker-compose.yml
├── pyproject.toml                  # uv workspace root + ruff/mypy config
├── pnpm-workspace.yaml             # pnpm workspace
├── backend/
│   ├── shared/                     # Shared Python package
│   └── <app>/
│       ├── Dockerfile
│       ├── pyproject.toml          # uv deps + ruff/mypy config (app-level)
│       ├── alembic/                # Migrations
│       └── src/app/
│           ├── config.py           # pydantic-settings
│           ├── main.py             # FastAPI app + lifespan
│           ├── domain/
│           ├── application/
│           ├── infrastructure/
│           └── presentation/
├── frontend/
│   ├── shared/                     # Shared TS package
│   └── <app>/
│       ├── Dockerfile
│       └── src/
│           ├── api/
│           ├── hooks/
│           ├── components/
│           └── types/
└── infra/
    └── postgres/init.sql
```
