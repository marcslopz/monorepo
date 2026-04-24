# Plan: MVP v0 — Abacus (Investment Transaction Tracker)

Rama: `feature/abacus-mvp-v0`

## Pasos

### Fase 0: Infraestructura y configuración
- [x] `infra/postgres/init.sql` — añadir abacus_db y abacus_db_test
- [x] `.env.example` — añadir sección Abacus (DATABASE_URL, CORS_ORIGINS, JWKS_URL, JWT_AUDIENCE, VITE_API_BASE_URL)
- [x] `pyproject.toml` (raíz) — añadir backend/abacus al workspace y ruff per-file-ignores
- [x] `uv.lock` — actualizado con abacus, cachetools, types-cachetools

### Fase 1: Scaffolding del backend
- [x] `backend/abacus/pyproject.toml`
- [x] `backend/abacus/Dockerfile` (dev + prod, puerto 8002)
- [x] `backend/abacus/prestart.sh`
- [x] `backend/abacus/src/abacus/__init__.py`, `py.typed`
- [x] `backend/abacus/src/abacus/config.py` (Settings con validation_alias, auth_enabled)
- [x] `backend/abacus/src/abacus/main.py` (create_app, _ensure_database, lifespan)

### Fase 2: Docker Compose
- [x] `docker-compose.yml` — añadir abacus-backend (8002) y abacus-frontend (5175) con profile [abacus, all]

### Fase 3: Domain layer
- [x] `domain/exceptions.py` — DomainError, NotFoundError, ValidationError, AuthenticationError
- [x] `domain/models/asset.py` — AssetClass enum + Asset model
- [x] `domain/models/transaction.py` — TransactionType enum + Transaction model
- [x] `domain/ports/repositories.py` — AssetRepository, TransactionRepository (Protocol)

### Fase 4: Infrastructure — Persistence
- [x] `infrastructure/persistence/database.py` — Base con MetaData(schema="abacus")
- [x] `infrastructure/persistence/models.py` — AssetModel, TransactionModel (schema abacus, Numeric(20,8))
- [x] `infrastructure/persistence/repositories/sqlalchemy_asset_repository.py`
- [x] `infrastructure/persistence/repositories/sqlalchemy_transaction_repository.py`

### Fase 5: Alembic
- [x] `alembic.ini`, `alembic/env.py`, `alembic/script.py.mako`
  - NOTA: env.py crea el schema `abacus` con `connectable.begin()` antes de que Alembic cree su tabla de versiones
- [x] Migración inicial generada: `alembic/versions/a05bf0094fca_initial_schema.py`
- [x] Migración aplicada localmente: tablas `abacus.assets` y `abacus.transactions` creadas

### Fase 6: Infrastructure — Auth (JWT/JWKS)
- [x] `infrastructure/auth/jwks.py` — JWKSClient con TTLCache
- [x] `infrastructure/auth/dependencies.py` — get_current_user_id con bypass dev (auth_enabled=False)

### Fase 7: Application layer
- [x] `application/services/asset_service.py`
- [x] `application/services/transaction_service.py`

### Fase 8: Presentation layer
- [x] `presentation/schemas/asset_schemas.py` — AssetCreate, AssetOut
- [x] `presentation/schemas/transaction_schemas.py` — TransactionCreate, TransactionOut, PaginatedTransactions
- [x] `presentation/dependencies.py` — SessionDep, CurrentUser, AssetServiceDep, TransactionServiceDep
- [x] `presentation/middleware.py` — CORS + exception handlers
- [x] `presentation/api/health.py`, `assets.py`, `transactions.py`, `router.py`

### Fase 9: Tests del backend
- [x] `tests/conftest.py` — make_asset, make_transaction, async_client con override auth
- [x] `tests/unit/test_asset_service.py`
- [x] `tests/unit/test_transaction_service.py`
- [x] `tests/e2e/test_api.py`
- [x] 11/11 tests pasando, 79% coverage

### Fase 10: Gateway integration
- [x] `backend/gateway/pyproject.toml` — añadir abacus como dependency
- [x] `backend/gateway/src/gateway/main.py` — montar `/abacus`
- [x] `backend/gateway/Dockerfile` — COPY abacus src/alembic/alembic.ini, PYTHONPATH, CMD migrations

### Fase 11: Frontend scaffolding
- [x] `frontend/abacus/package.json` (@monorepo/abacus, stack mariland + vite-plugin-pwa)
- [x] `frontend/abacus/Dockerfile` (puerto 5175)
- [x] `frontend/abacus/vite.config.ts` (PWA manifest, proxy /api → abacus-backend:8002)
- [x] `frontend/abacus/tailwind.config.js`, `postcss.config.js`, `tsconfig.json`, `eslint.config.js`
- [x] `frontend/abacus/index.html` (lang=es)
- [x] `frontend/abacus/public/icon-192.png`, `icon-512.png` (placeholders)
- [x] `pnpm-workspace.yaml` — añadir frontend/abacus

### Fase 12: Frontend API client y types
- [x] `src/types/models.ts` — Asset, Transaction, PaginatedTransactions, AssetCreate, TransactionCreate
- [x] `src/api/client.ts` — fetch wrapper con Bearer token
- [x] `src/api/assets.ts`, `src/api/transactions.ts`

### Fase 13: Frontend Auth
- [x] `src/auth/AuthContext.tsx` — AuthProvider, useAuth, devLogin, logout
- [x] `src/components/LoginScreen.tsx` — placeholder Google OAuth + botón Dev Login

### Fase 14: Frontend UI
- [x] `src/utils/format.ts` — formatDate (es-ES/Europe/Madrid), formatCurrency, formatQuantity
- [x] `src/hooks/useAssets.ts`, `src/hooks/useTransactions.ts`
- [x] `src/components/AssetModal.tsx`
- [x] `src/components/TransactionForm.tsx`
- [x] `src/components/TransactionList.tsx`
- [x] `src/components/Dashboard.tsx`
- [x] `src/App.tsx` (auth gate: LoginScreen | Dashboard)
- [x] `src/main.tsx`, `src/index.css`

### Fase 15: Deploy
- [ ] Neon DB: crear schema `abacus` en la DB de producción
- [ ] Render gateway: añadir env vars ABACUS_DATABASE_URL, ABACUS_CORS_ORIGINS, ABACUS_JWKS_URL, ABACUS_JWT_AUDIENCE
- [ ] Cloudflare Pages: nuevo proyecto `abacus` con build `cd frontend/abacus && pnpm install && pnpm build`, output `frontend/abacus/dist`, env VITE_ABACUS_API_BASE_URL=https://gateway-8ij4.onrender.com/abacus

### Fase 16: Documentación
- [ ] `.ai/structure.md` — añadir abacus
- [ ] `.ai/environments.md` — puertos 8002/5175, URLs prod, nota Neon Auth
- [ ] `.ai/infra.md` — Neon schema, Cloudflare Pages, Render env vars

## Notas técnicas importantes
- **Alembic + schema**: `env.py` usa `connectable.begin()` antes de Alembic para crear `CREATE SCHEMA IF NOT EXISTS abacus`, porque Alembic necesita el schema para crear su tabla `alembic_version`. Sin esto, el primer `alembic upgrade head` falla silenciosamente o con error.
- **Decimal en Pydantic v2**: los campos Numeric de SQLAlchemy se serializan como strings en JSON (`"10.00000000"`). El frontend los recibe como strings — usar `Number()` al operar con ellos.
- **Auth pendiente**: `ABACUS_JWKS_URL` vacío → bypass dev (UUID fijo). Cuando se active Neon Auth, solo hay que poner las env vars en Render.
- **Smoke test local verificado**: crear asset + crear transacción + listar → OK
