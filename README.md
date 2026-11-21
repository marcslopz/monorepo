# monorepo

Full-stack monorepo with FastAPI backends (hexagonal architecture) and React+Vite frontends.

> Everything runs inside Docker. No need for Python, Node, or any package manager installed locally.

## Apps

| App | Backend port | Frontend port | Description |
|-----|-------------|---------------|-------------|
| `demo` | 8000 | 5173 | Items CRUD — validates the full stack |
| `mariland` | 8001 | 5174 | Flat (pisos) tracker |
| `abacus` | 8002 | 5175 | Manual investment tracker |
| `mananettis` | — | 5176 | Rehearsal prompter for a theatre class: static HTML + Cloudflare Pages Functions + D1, no backend app ([.ai/mananettis.md](.ai/mananettis.md)) |

In production the backends run together in one Render service, `backend/gateway`, under path prefixes
(`/demo`, `/mariland`, `/abacus`); frontends are on Cloudflare Pages. Details and URLs:
[.ai/environments.md](.ai/environments.md).

## Stack

- **Backend**: FastAPI · async SQLAlchemy · Alembic · Redis · pydantic v2 · uv
- **Frontend**: React 18 · TypeScript · Vite · pnpm
- **Infra**: PostgreSQL · Redis · Docker Compose
- **Quality**: ruff · mypy · pytest · vitest · ESLint

## Quick Start

```bash
# Copy env file
cp .env.example .env

# Build and start (default APP=demo)
make build
make dev

# In a second terminal, run migrations
make migrate
```

- API docs: http://localhost:8000/docs
- Frontend: http://localhost:5173
- Health: http://localhost:8000/health

## Commands

All commands accept `APP=<app>` (default: `demo`):

```bash
make help                        # Show all commands

make build                       # Build containers
make dev                         # Start services
make stop                        # Stop all services
make logs                        # Follow logs

make migrate                     # Run DB migrations
make migrate-create NAME=my_mig  # Create new migration

make lint                        # ruff check
make format                      # ruff format
make typecheck                   # mypy
make check                       # lint + typecheck

make test                        # All backend tests
make test-unit                   # Unit tests
make test-integration            # Integration tests
make test-e2e                    # E2E API tests
make test-frontend               # Frontend vitest

make shell-backend               # Shell in backend container
make shell-frontend              # Shell in frontend container
```

## Repository Structure

```
monorepo/
├── backend/
│   ├── shared/                  # Shared Python utilities (auth, logging, etc.)
│   │   └── src/shared/
│   ├── gateway/                 # Production only: mounts every backend under a path prefix
│   ├── mariland/ · abacus/      # Same layout as demo
│   └── demo/                    # Demo app
│       ├── src/demo/            # Package named after the app
│       │   ├── domain/          # Entities, ports (interfaces), exceptions
│       │   ├── application/     # Use cases / services
│       │   ├── infrastructure/  # DB, cache, auth implementations
│       │   └── presentation/    # FastAPI routes, schemas, middleware
│       ├── tests/
│       │   ├── unit/
│       │   ├── integration/
│       │   └── e2e/
│       └── alembic/
├── frontend/
│   ├── shared/                  # Shared React components and hooks
│   │   └── src/
│   ├── mariland/ · abacus/      # Same layout as demo
│   ├── mananettis/              # Static app, no build (plays/, functions/api/, tools/)
│   └── demo/                    # Demo app
│       └── src/
│           ├── api/             # API client + endpoint functions
│           ├── hooks/           # React hooks
│           ├── components/      # React components
│           └── types/           # TypeScript types
├── infra/
│   └── postgres/init.sql        # DB init (creates all app databases)
├── docker-compose.yml
├── Makefile
├── pyproject.toml               # uv workspace root
└── pnpm-workspace.yaml
```

## Adding a New App

### 1. Backend

```bash
mkdir -p backend/newapp/{src/newapp/{domain/{models,ports},application/services,infrastructure/{persistence/repositories,cache,auth},presentation/{api,schemas}},tests/{unit,integration,e2e},alembic/versions}
# Copy pyproject.toml and Dockerfile from backend/demo and adapt
```

### 2. Frontend

```bash
mkdir -p frontend/newapp/src/{api,types,hooks,components,test}
# Copy package.json, vite.config.ts, tsconfig.json from frontend/demo and adapt
```

### 3. Docker Compose

Add `newapp-backend` and `newapp-frontend` services with profile `newapp`.

### 4. Database

Add to `infra/postgres/init.sql`:
```sql
SELECT 'CREATE DATABASE newapp_db' WHERE NOT EXISTS (...)\gexec
```

### 5. GitHub Actions

Copy `.github/workflows/ci-demo.yml` → `ci-newapp.yml` and update paths.

### 6. Makefile

No changes needed — `APP=newapp` works automatically.

## Architecture

See [ARCHITECTURE.md](ARCHITECTURE.md) for the hexagonal architecture explanation.
