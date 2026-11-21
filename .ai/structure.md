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
│   ├── gateway/                    # Production-only: mounts demo + mariland + abacus under path prefixes
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
│   ├── mananettis/                 # Static app, no build (see .ai/mananettis.md)
│   │   ├── index.html, app.js, lib.js  # UI + pure logic (lib.js is what the tests cover)
│   │   ├── plays/                  # <slug>.json scripts + index.json
│   │   ├── functions/api/          # Cloudflare Pages Functions: /api/patches (+ /undo, /redo) on D1
│   │   ├── tools/                  # import_docx.py, consolidate.js, d1-sql.js
│   │   └── tests/                  # node --test (+ tools/test_import_docx.py)
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
