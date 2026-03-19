# Environments

## Local (Docker)
- All commands via `make APP=<app>` — never run uv/pnpm directly on host.
- `make dev` → `docker compose --profile <app> up`
- Backend: `http://localhost:8000`, Frontend: `http://localhost:5173`
- venv at `/opt/venv` inside container (not a volume)
- Backend mounts: `src/`, `tests/`, `alembic/` — Frontend mounts: `src/`
- Alembic migrations run automatically on startup (lifespan)

## Production (demo app)
| Service    | Provider         | URL                                    |
|------------|------------------|----------------------------------------|
| Frontend   | Cloudflare Pages | https://monorepo-c00.pages.dev         |
| Backend    | Render           | https://demo-backend-5b1n.onrender.com |
| Database   | Neon (PostgreSQL) | eu-central-1, AWS                     |

**Notes**:
- Render free tier pauses on inactivity (~30s cold start)
- Neon connection string uses `sslmode=require` — converted to asyncpg `connect_args={"ssl": True}` in `database.py`
- `CORS_ORIGINS` in Render must include the Cloudflare Pages URL

## CI (GitHub Actions)
- `.github/workflows/ci-<app>.yml` per app
- Backend: ruff + mypy + pytest (real Postgres via service container)
- Frontend: eslint + vitest
- pnpm install uses `--frozen-lockfile --ignore-workspace` (root pnpm-workspace.yaml causes workspace detection)
