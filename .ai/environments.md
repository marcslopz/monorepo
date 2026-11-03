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
| flixseven| Database   | Neon (PostgreSQL) | eu-central-1, AWS                        |

**Nota**: Los backends (demo, mariland, abacus y flixseven) están unificados en un único servicio Render `gateway`.
- demo backend: `https://gateway-8ij4.onrender.com/demo/api/v1/*`
- mariland backend: `https://gateway-8ij4.onrender.com/mariland/api/*`
- abacus backend: `https://gateway-8ij4.onrender.com/abacus/api/*`
- flixseven backend: `https://gateway-8ij4.onrender.com/flixseven/*` (health: `/flixseven/health`)
- Dockerfile del gateway: `backend/gateway/Dockerfile` (build context: raíz del repo)
- Frontends: `VITE_API_BASE_URL=https://gateway-8ij4.onrender.com/demo`, `VITE_MARILAND_API_BASE_URL=https://gateway-8ij4.onrender.com/mariland`, `VITE_ABACUS_API_BASE_URL=https://gateway-8ij4.onrender.com/abacus`

**Auth (abacus)**: `ABACUS_JWKS_URL` vacío → auth desactivado (dev bypass con UUID fijo). En producción: `ABACUS_JWKS_URL` y `ABACUS_JWT_AUDIENCE` en Render, `VITE_NEON_AUTH_URL` en Cloudflare Pages.

**Notes**:
- Render free tier pauses on inactivity (~30s cold start)
- Neon connection string uses `sslmode=require` — converted to asyncpg `connect_args={"ssl": True}` in `database.py`
- Production Docker CMD chains `alembic upgrade head && uvicorn ...`

**FlixSeven en el gateway** (código en el repo privado `marcslopz/flixseven`, no en este):
- El Dockerfile del gateway descarga FlixSeven en un `RUN` con el build secret `GIT_AUTH_TOKEN` montado
  (Render solo pasa los secret files a `RUN`, no a `ADD`), en la versión `FLIXSEVEN_REF` (por defecto `main`).
  Tras cada merge a `main`, el CI de FlixSeven pone `FLIXSEVEN_REF=<commit>` en el gateway con la API de
  Render y lanza el despliegue: Render pasa sus env vars al build como build args, y el commit nuevo invalida
  la caché de ese paso.
- El gateway corre con `--workers 1`: FlixSeven reparte sus eventos en vivo (SSE) en memoria, dentro de un
  proceso. Con más workers, un móvil no vería los votos de otro.
- Sus migraciones van en el CMD: `python -m flixseven.migrate` (no usa `alembic.ini`).
- FlixSeven trae Python 3.13 y versiones más nuevas de fastapi/sqlalchemy/alembic que el `uv.lock` del
  monorepo: en la imagen del gateway, demo/mariland/abacus corren con ellas sin que sus tests lo cubran
  (decisión consciente: mariland y abacus probablemente se descontinúen).
- Build local: Podman no soporta `RUN --mount=type=secret` igual que Render; usar BuildKit (`moby/buildkit`)
  con `--secret id=GIT_AUTH_TOKEN,src=<token file>` y, opcional, `--opt build-arg:FLIXSEVEN_REF=<commit>`.

## CI (GitHub Actions)
- `.github/workflows/ci-<app>.yml` per app
- Backend: ruff + mypy + pytest (real Postgres via service container)
- Frontend: eslint + vitest
- demo uses `--frozen-lockfile` (lock file committed); mariland uses `--ignore-workspace` only (no lock file)
