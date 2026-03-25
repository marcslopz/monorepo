# Plan: Monorepo — Full-Stack Hexagonal Architecture

## Context

Monorepo con FastAPI (hexagonal architecture) + React+Vite. Primera app: `demo` con dominio `items`.
Todo corre dentro de Docker. GitHub repo: `marcslopz/monorepo`.

## Apps

- `demo` — Items CRUD (primera app de referencia)
- `mariland` — Por añadir cuando demo esté funcionando en producción

## Implementation Steps

- [x] Step 1: Project scaffolding & monorepo config (pyproject.toml workspace, pnpm-workspace.yaml)
- [x] Step 2: backend/shared — estructura base
- [x] Step 3: backend/demo — Domain layer (Item, ports, exceptions)
- [x] Step 4: backend/demo — Application layer (ItemService)
- [x] Step 5: backend/demo — Infrastructure layer (SQLAlchemy, Redis, JWT)
- [x] Step 6: backend/demo — Presentation layer (FastAPI routes, schemas, middleware)
- [x] Step 7: backend/demo — Alembic migrations
- [x] Step 8: backend/demo — Tests (unit, integration, e2e)
- [x] Step 9: frontend/demo — Core (api client, hooks, components)
- [x] Step 10: Docker Compose con profiles, infra/postgres/init.sql
- [x] Step 11: Makefile con APP=demo support
- [x] Step 12: GitHub Actions CI con path filters
- [x] Step 13: README.md y ARCHITECTURE.md
- [ ] Step 14: Git init, crear repo marcslopz/monorepo, primer commit y push
- [ ] Step 15: Verificar dentro de Docker (build, lint, test, dev)
- [ ] Step 16: Deploy demo a hosting real (Railway / Fly.io / VPS)
