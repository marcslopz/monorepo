# Infrastructure Setup Guide

How to provision production infrastructure for each app in the monorepo.
All services live in **Frankfurt / eu-central-1**.

---

## Neon Auth (Google OAuth para nuevas apps)

Neon free tier tiene **una sola instancia de Auth por proyecto**, ligada a la base `demo`.
Todas las apps del monorepo comparten esa instancia (`/demo/auth`). Los usuarios se
almacenan en las tablas de auth de `demo`, pero los JWTs son válidos para cualquier app.

### Añadir auth a una nueva app

**1. Google Cloud Console** — crear nuevo OAuth 2.0 Client ID:
1. APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID
2. Tipo: **Web application**
3. Authorized JavaScript origins: dominio de Cloudflare Pages de la nueva app (y dominio de preview si se va a testear en ramas)
4. Authorized redirect URI: `https://ep-proud-bar-agzyxlwq.neonauth.c-2.eu-central-1.aws.neon.tech/demo/auth/callback/google`
5. Guardar → anotar **Client ID** y **Client Secret**

> El OAuth consent screen ya está configurado — no hace falta tocarlo. Solo hay que añadir el nuevo dominio en "Authorized domains" si es diferente a los existentes.

**2. Neon Console** — en Auth → Google OAuth, **añadir** el nuevo Client ID y Secret
(o reusar los mismos si Google lo permite para múltiples dominios — en ese caso solo actualizar los authorized origins en GCP)

**3. Backend** — usar `PyJWT[cryptography]` + `JWKSClient` de abacus como referencia:
- `JWKS_URL`: `https://ep-proud-bar-agzyxlwq.neonauth.c-2.eu-central-1.aws.neon.tech/demo/auth/.well-known/jwks.json`
- `JWT_AUDIENCE`: `https://ep-proud-bar-agzyxlwq.neonauth.c-2.eu-central-1.aws.neon.tech`
- Algoritmo: **EdDSA** (no RS256)

**4. Frontend** — copiar patrón de `frontend/abacus/src/auth/`:
- `neonAuth.ts` — `createAuthClient(VITE_NEON_AUTH_URL)`
- `AuthContext.tsx` — dual-mode Neon/dev, `getSession()` → `session.token` → localStorage
- `VITE_NEON_AUTH_URL`: `https://ep-proud-bar-agzyxlwq.neonauth.c-2.eu-central-1.aws.neon.tech/demo/auth`

**5. Cloudflare Pages** — añadir `VITE_NEON_AUTH_URL` en **All environments**

> **Nota**: `session.token` del cliente de Neon Auth es directamente el JWT firmado con EdDSA.
> `getJWTToken()` existe en runtime pero da 404 — no usarlo.

---

## Neon (PostgreSQL)

**Project**: `monorepo` (single project, one DB per app)

### Per-app setup (UI)
1. Go to Neon dashboard → project `monorepo`
2. Create a new database named after the app (e.g. `demo`, `mariland`)
3. Copy the connection string — it ends with `?sslmode=require`
4. Convert for asyncpg: replace `postgresql://` → `postgresql+asyncpg://` and add `connect_args={"ssl": True}` (handled in `database.py`)

### Apps
| App      | DB name   | Status    |
|----------|-----------|-----------|
| demo     | `demo`    | ✅ created |
| mariland | `mariland`| ✅ created |
| abacus   | `abacus`  | ✅ created |

---

## Render (Backend)

One **Web Service** per backend app. Config: Docker, Frankfurt, free plan.

### Per-app setup (dashboard)
1. New → Web Service → connect `marcslopz/monorepo`
2. **Root directory**: `backend/<app>` (e.g. `backend/mariland` — NOT just `mariland`)
3. **Runtime**: Docker
4. **Docker context**: `.` ← critical: must be `.` (relative to root dir), NOT `backend`
5. **Dockerfile path**: `./Dockerfile`
6. **Region**: Frankfurt (EU Central)
7. **Instance type**: Free
8. **Branch**: `main` (change temporarily to feature branch to test before merging PR)
9. Set env vars (see below)

> **Common mistakes**:
> - Root directory set to just `mariland` instead of `backend/mariland` → "Root directory does not exist"
> - Docker context set to `backend` instead of `.` → `lstat .../backend/mariland/backend: no such file`

### Env vars per app

**demo**
| Var | Value |
|-----|-------|
| `DATABASE_URL` | Neon connection string (asyncpg) |
| `CORS_ORIGINS` | Cloudflare Pages URL |
| `ENVIRONMENT` | `production` |
| `JWT_SECRET` | random secret |
| `JWT_ALGORITHM` | `HS256` |
| `JWT_EXPIRE_MINUTES` | `60` |

**mariland** (no auth — no JWT vars needed)
| Var | Value |
|-----|-------|
| `DATABASE_URL` | Neon connection string (asyncpg) |
| `CORS_ORIGINS` | Cloudflare Pages URL |
| `ENVIRONMENT` | `production` |

**abacus** (auth via Neon Auth JWT/JWKS)
| Var | Value |
|-----|-------|
| `ABACUS_DATABASE_URL` | Neon connection string (asyncpg) |
| `ABACUS_CORS_ORIGINS` | `https://abacus-6zj.pages.dev` |
| `ABACUS_JWKS_URL` | `<neon-auth-base-url>/.well-known/jwks.json` |
| `ABACUS_JWT_AUDIENCE` | verificar del primer JWT real en jwt.io (puede estar vacío si Neon no incluye `aud`) |

> **Nota abacus**: el gateway monta abacus en `/abacus`. El schema de PostgreSQL (`abacus`) lo crea Alembic automáticamente en el primer deploy via `CREATE SCHEMA IF NOT EXISTS abacus` en `alembic/env.py`.

### Apps
| App      | Render service URL | Status |
|----------|--------------------|--------|
| demo     | https://demo-backend-5b1n.onrender.com | ✅ live |
| mariland | https://mariland-backend.onrender.com  | ✅ live |
| abacus   | https://gateway-8ij4.onrender.com/abacus | ✅ live (via gateway) |

> **Note**: Render free tier pauses on inactivity (~30s cold start on first request).

---

## Cloudflare Pages (Frontend)

One **Pages project** per frontend app. Connected to the GitHub repo.

### Per-app setup (dashboard)
1. Pages → Create project → Connect to Git → `marcslopz/monorepo`
2. **Build command** (see per-app below)
3. **Build output directory** (see per-app below)
4. **Root directory**: *(leave empty)*
5. Add env vars

### Build config per app

**demo**
```
Build command:   cd frontend/demo && pnpm install --frozen-lockfile --ignore-workspace && pnpm build
Build output:    frontend/demo/dist
```
> Uses `--frozen-lockfile` because `frontend/demo/pnpm-lock.yaml` is committed.

**mariland**
```
Build command:   cd frontend/mariland && pnpm install --ignore-workspace && pnpm build
Build output:    frontend/mariland/dist
```
> No `--frozen-lockfile` — mariland does not commit a lock file.

**abacus**
```
Build command:   cd frontend/abacus && pnpm install --ignore-workspace && pnpm build
Build output:    frontend/abacus/dist
```

### Env vars per app
| App      | Var | Value |
|----------|-----|-------|
| demo     | `VITE_API_BASE_URL` | `https://gateway-8ij4.onrender.com/demo` |
| mariland | `VITE_MARILAND_API_BASE_URL` | `https://gateway-8ij4.onrender.com/mariland` |
| abacus   | `VITE_ABACUS_API_BASE_URL` | `https://gateway-8ij4.onrender.com/abacus` |
| abacus   | `VITE_NEON_AUTH_URL` | `<neon-auth-base-url>` |

### Apps
| App      | Cloudflare Pages URL | Status |
|----------|----------------------|--------|
| demo     | https://monorepo-c00.pages.dev | ✅ live |
| mariland | https://mariland.pages.dev | ✅ live |
| abacus   | https://abacus-6zj.pages.dev | ✅ live |
