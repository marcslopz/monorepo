# Structure

```
monorepo/
├── Makefile                        # All dev commands — wraps docker compose (APP=<app>)
├── docker-compose.yml
├── pyproject.toml                  # uv workspace root + ruff/mypy config
├── pnpm-workspace.yaml             # pnpm workspace
├── .ai/                            # Project context for Claude Code
├── .github/workflows/              # ci-<app>.yml per app
├── backend/
│   ├── demo/                       # Demo app (items CRUD + JWT auth + Redis cache)
│   ├── mariland/                   # Mariland app (pisos tracker)
│   ├── gateway/                    # Production-only: mounts demo + mariland under /demo and /mariland
│   │   ├── Dockerfile              # Build context: repo root; installs both apps
│   │   ├── pyproject.toml
│   │   └── src/gateway/main.py
│   └── <app>/
│       ├── Dockerfile              # dev + production stages
│       ├── prestart.sh             # ensure DB + alembic upgrade head (dev only, volume-mounted)
│       ├── pyproject.toml          # uv deps + ruff/mypy config (app-level)
│       ├── alembic/                # Migrations
│       └── src/<app>/             # Package named after the app (demo or mariland)
│           ├── config.py           # pydantic-settings
│           ├── main.py             # FastAPI app + lifespan
│           ├── domain/
│           ├── application/
│           ├── infrastructure/
│           └── presentation/
├── frontend/
│   ├── demo/                       # Demo frontend (React + TS + Tailwind)
│   ├── mariland/                   # Mariland frontend (React + TS + Tailwind)
│   └── <app>/
│       ├── Dockerfile
│       └── src/
│           ├── api/
│           ├── hooks/
│           ├── components/
│           └── types/
└── infra/
    └── postgres/init.sql           # Creates all app DBs on first postgres init
```
