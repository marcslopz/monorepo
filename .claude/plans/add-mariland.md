# Plan: Añadir app Mariland al monorepo

Migrar el proyecto `mariland` (tracker de pisos) al monorepo, adaptándolo a la estructura estándar:
- Backend: arquitectura hexagonal (como demo)
- Frontend: TypeScript + Tailwind CSS
- Sin lógica Fly.io en el lifespan (DB siempre disponible en el monorepo)

## Decisiones confirmadas
- [x] Backend hexagonal
- [x] Frontend TypeScript
- [x] Eliminar lifespan Fly.io

---

## Fase 0 — Git

- [x] Checkout `main`, pull, crear rama `feature/add-mariland`

## Fase 1 — Infraestructura

- [x] `infra/postgres/init.sql` — añadir `mariland_db` y `mariland_db_test`
- [x] `docker-compose.yml` — añadir servicios `mariland-backend` (8001) y `mariland-frontend` (5174)
- [x] `.env.example` — añadir variables mariland
- [x] `pnpm-workspace.yaml` — añadir `frontend/mariland`

## Fase 2 — Backend scaffold

- [x] `backend/mariland/pyproject.toml`
- [x] `backend/mariland/Dockerfile`
- [x] `backend/mariland/alembic.ini`
- [x] `backend/mariland/alembic/env.py`
- [x] `backend/mariland/alembic/versions/0001_initial.py` (schema completo colapsado)

## Fase 3 — Backend domain layer

- [x] `src/app/domain/exceptions.py`
- [x] `src/app/domain/models/piso.py`
- [x] `src/app/domain/models/price_history.py`
- [x] `src/app/domain/models/comment.py`
- [x] `src/app/domain/ports/repositories.py`

## Fase 4 — Backend application layer

- [x] `src/app/application/services/piso_service.py`
- [x] `src/app/application/services/price_service.py`
- [x] `src/app/application/services/comment_service.py`

## Fase 5 — Backend infrastructure layer

- [x] `src/app/infrastructure/persistence/database.py`
- [x] `src/app/infrastructure/persistence/models.py`
- [x] `src/app/infrastructure/persistence/repositories/sqlalchemy_piso_repository.py`
- [x] `src/app/infrastructure/persistence/repositories/sqlalchemy_price_repository.py`
- [x] `src/app/infrastructure/persistence/repositories/sqlalchemy_comment_repository.py`

## Fase 6 — Backend presentation layer

- [x] `src/app/presentation/schemas/piso_schemas.py`
- [x] `src/app/presentation/dependencies.py`
- [x] `src/app/presentation/middleware.py`
- [x] `src/app/presentation/api/health.py`
- [x] `src/app/presentation/api/pisos.py`
- [x] `src/app/presentation/api/prices.py`
- [x] `src/app/presentation/api/comments.py`
- [x] `src/app/presentation/api/router.py`
- [x] `src/app/config.py`
- [x] `src/app/main.py`
- [x] `src/app/__init__.py`, `src/__init__.py`, `src/app/py.typed`

## Fase 7 — Backend tests

- [x] `tests/conftest.py`
- [x] `tests/unit/test_piso_service.py`
- [x] `tests/unit/test_price_service.py`
- [x] `tests/unit/test_comment_service.py`
- [x] `tests/integration/test_piso_repository.py`
- [x] `tests/integration/test_price_repository.py`
- [x] `tests/integration/test_comment_repository.py`
- [x] `tests/e2e/test_pisos_api.py`

## Fase 8 — Frontend scaffold

- [x] `frontend/mariland/package.json`
- [x] `frontend/mariland/tsconfig.json`
- [x] `frontend/mariland/eslint.config.js`
- [x] `frontend/mariland/vite.config.ts`
- [x] `frontend/mariland/tailwind.config.js`
- [x] `frontend/mariland/postcss.config.js`
- [x] `frontend/mariland/index.html`
- [x] `frontend/mariland/Dockerfile`

## Fase 9 — Frontend TypeScript

- [x] `src/types/piso.ts`
- [x] `src/api/client.ts`
- [x] `src/api/pisos.ts`
- [x] `src/hooks/usePisos.ts`
- [x] `src/components/PisoCard.tsx`
- [x] `src/components/Stats.tsx`
- [x] `src/components/Filters.tsx`
- [x] `src/components/PisoForm.tsx`
- [x] `src/components/DeleteModal.tsx`
- [x] `src/components/CommentModal.tsx`
- [x] `src/components/PriceModal.tsx`
- [x] `src/components/ExtrasModal.tsx`
- [x] `src/components/Modal.tsx`
- [x] `src/components/ActionMenu.tsx`
- [x] `src/App.tsx`
- [x] `src/main.tsx`
- [x] `src/index.css`

## Fase 10 — Frontend tests

- [x] `src/test/setup.ts`
- [x] `src/test/PisoCard.test.tsx`
- [x] `src/test/Stats.test.tsx`
- [x] `src/test/usePisos.test.ts`

## Fase 11 — Quality gates

- [x] `make check APP=mariland` (ruff + mypy)
- [x] `make test APP=mariland` (todos los tests backend)
- [x] `make test-frontend APP=mariland` (vitest)
- [x] `make lint-frontend APP=mariland` (eslint)

## Fase 12 — Commit, push, PR

- [ ] Verificar usuario git (`marcslopz`)
- [ ] Commit con Co-Authored-By
- [ ] Push `feature/add-mariland`
- [ ] PR con descripción completa
