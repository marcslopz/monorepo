# Environments

## Local (Docker)
- All commands via `make APP=<app>` — never run uv/pnpm directly on host.
- `make dev` → `docker compose --profile <app> up`
- Ports per app — demo: backend `8000`, frontend `5173` / mariland: backend `8001`, frontend `5174` / abacus: backend `8002`, frontend `5175`
- venv at `/opt/venv` inside container (not a volume)
- Backend mounts: `src/`, `tests/`, `alembic/`, `prestart.sh` — Frontend mounts: `src/`
- Alembic migrations run via `prestart.sh` before uvicorn starts (not in lifespan)
- `prestart.sh` also ensures the DB exists (local postgres only — Neon manages this in production)

## Production

| App      | Service    | Provider          | URL                                      |
|----------|------------|-------------------|------------------------------------------|
| demo     | Frontend   | Cloudflare Pages  | https://monorepo-c00.pages.dev           |
| mariland | Frontend   | Cloudflare Pages  | https://mariland.pages.dev               |
| abacus   | Frontend   | Cloudflare Pages  | https://abacus-6zj.pages.dev             |
| gateway  | Backend    | Render            | https://gateway-8ij4.onrender.com        |
| demo     | Database   | Neon (PostgreSQL) | eu-central-1, AWS                        |
| mariland | Database   | Neon (PostgreSQL) | eu-central-1, AWS                        |
| abacus   | Database   | Neon (PostgreSQL) | eu-central-1, AWS                        |

**Nota**: Los tres backends (demo, mariland, abacus) están unificados en un único servicio Render `gateway`.
- demo backend: `https://gateway-8ij4.onrender.com/demo/api/v1/*`
- mariland backend: `https://gateway-8ij4.onrender.com/mariland/api/*`
- abacus backend: `https://gateway-8ij4.onrender.com/abacus/api/*`
- Dockerfile del gateway: `backend/gateway/Dockerfile` (build context: raíz del repo)
- Frontends: `VITE_API_BASE_URL=https://gateway-8ij4.onrender.com/demo`, `VITE_MARILAND_API_BASE_URL=https://gateway-8ij4.onrender.com/mariland`, `VITE_ABACUS_API_BASE_URL=https://gateway-8ij4.onrender.com/abacus`

**Auth (abacus)**: `ABACUS_JWKS_URL` vacío → auth desactivado (dev bypass con UUID fijo). Cuando se active Neon Auth, añadir `ABACUS_JWKS_URL` y `ABACUS_JWT_AUDIENCE` en Render.

**Notes**:
- Render free tier pauses on inactivity (~30s cold start)
- Neon connection string uses `sslmode=require` — converted to asyncpg `connect_args={"ssl": True}` in `database.py`
- Production Docker CMD chains `alembic upgrade head && uvicorn ...`

## CI (GitHub Actions)
- `.github/workflows/ci-<app>.yml` per app
- Backend: ruff + mypy + pytest (real Postgres via service container)
- Frontend: eslint + vitest
- demo uses `--frozen-lockfile` (lock file committed); mariland uses `--ignore-workspace` only (no lock file)
