# Environments

## Local (Docker)
- All commands via `make APP=<app>` — never run uv/pnpm directly on host.
- `make dev` → `docker compose --profile <app> up`
- Ports per app — demo: backend `8000`, frontend `5173` / mariland: backend `8001`, frontend `5174`
- venv at `/opt/venv` inside container (not a volume)
- Backend mounts: `src/`, `tests/`, `alembic/`, `prestart.sh` — Frontend mounts: `src/`
- Alembic migrations run via `prestart.sh` before uvicorn starts (not in lifespan)
- `prestart.sh` also ensures the DB exists (local postgres only — Neon manages this in production)

## Production

| App      | Service    | Provider          | URL                                      |
|----------|------------|-------------------|------------------------------------------|
| demo     | Frontend   | Cloudflare Pages  | https://monorepo-c00.pages.dev           |
| demo     | Backend    | Render            | https://demo-backend-5b1n.onrender.com   |
| demo     | Database   | Neon (PostgreSQL) | eu-central-1, AWS                        |
| mariland | Frontend   | Cloudflare Pages  | https://mariland.pages.dev               |
| mariland | Backend    | Render            | https://mariland-backend.onrender.com    |
| mariland | Database   | Neon (PostgreSQL) | eu-central-1, AWS                        |

**Notes**:
- Render free tier pauses on inactivity (~30s cold start)
- Neon connection string uses `sslmode=require` — converted to asyncpg `connect_args={"ssl": True}` in `database.py`
- Production Docker CMD chains `alembic upgrade head && uvicorn ...`

## CI (GitHub Actions)
- `.github/workflows/ci-<app>.yml` per app
- Backend: ruff + mypy + pytest (real Postgres via service container)
- Frontend: eslint + vitest
- demo uses `--frozen-lockfile` (lock file committed); mariland uses `--ignore-workspace` only (no lock file)
