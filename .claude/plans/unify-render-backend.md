# Plan: Unificar backends en un solo servicio Render

## Contexto

Render cobra por servicio ($7/mes mínimo cada uno). Actualmente tenemos dos backends (demo y mariland) en dos servicios Render separados. Queremos unificarlos en un solo servicio con routing por path (`/demo/*`, `/mariland/*`) para pagar uno solo.

## Problema principal

Ambos backends usan `from app.xxx` como package name (`src/app/`). No se pueden importar en el mismo proceso Python porque colisionan en el namespace. Hay que renombrar los packages antes de crear el gateway.

## Pasos

### Paso 1: Renombrar package `app` → `demo` en backend/demo

- [x] Renombrar directorio `backend/demo/src/app/` → `backend/demo/src/demo/`
- [x] Actualizar `from app.` → `from demo.` en 16 archivos source + 4 test files + `alembic/env.py`
- [x] Actualizar `import app.infrastructure...` → `import demo.infrastructure...` en `alembic/env.py`
- [x] `backend/demo/pyproject.toml`: `packages = ["src/app"]` → `packages = ["src/demo"]`
- [x] `backend/demo/Dockerfile`: `src.app.main:app` → `src.demo.main:app` (dev y prod stages)
- [x] `docker-compose.yml`: command del demo-backend `src.app.main:app` → `src.demo.main:app`
- [x] `.github/workflows/ci-demo.yml`: `uv run mypy -p app` → `uv run mypy -p demo`

### Paso 2: Renombrar package `app` → `mariland` en backend/mariland

- [x] Renombrar directorio `backend/mariland/src/app/` → `backend/mariland/src/mariland/`
- [x] Actualizar `from app.` → `from mariland.` en 18 archivos source + 9 test files + `alembic/env.py`
- [x] Actualizar `import app.infrastructure...` → `import mariland.infrastructure...` en `alembic/env.py`
- [x] `backend/mariland/pyproject.toml`: `packages = ["src/app"]` → `packages = ["src/mariland"]`
- [x] `backend/mariland/Dockerfile`: `src.app.main:app` → `src.mariland.main:app` (dev y prod stages)
- [x] `docker-compose.yml`: command del mariland-backend (revisar `prestart.sh` por refs a `app`) — también actualizado `prestart.sh`
- [x] `.github/workflows/ci-mariland.yml`: `uv run mypy -p app` → `uv run mypy -p mariland`
- [x] `Makefile`: `mypy -p app` → `mypy -p $(APP)` (fix genérico)

### Paso 3: Verificar que cada app sigue funcionando

- [ ] `make test APP=demo` — pasa
- [ ] `make test APP=mariland` — pasa
- [ ] `make lint APP=demo` — pasa
- [ ] `make lint APP=mariland` — pasa
- [ ] `make dev APP=demo` — arranca y responde requests
- [ ] `make dev APP=mariland` — arranca y responde requests

### Paso 4: Crear backend/gateway (solo producción)

- [x] Crear `backend/gateway/src/gateway/main.py`:
  - Root FastAPI app
  - `app.mount("/demo", create_demo_app())`
  - `app.mount("/mariland", create_mariland_app())`
  - Health endpoint en `/health`
- [x] Crear `backend/gateway/Dockerfile`:
  - Build context: raíz del repo
  - Instala deps de demo (con lock), mariland y gateway
  - `PYTHONPATH=/app/demo/src:/app/mariland/src:/app/gateway/src`
  - CMD: migrations ambos DBs + `uvicorn gateway.main:app --port 8000`
- [x] Crear `backend/gateway/pyproject.toml` (deps: fastapi, uvicorn)
- [x] NO añadir al docker-compose (solo para Render)

### Paso 5: Actualizar configuración de producción

- [ ] Frontends (Cloudflare Pages env vars):
  - demo: `VITE_API_BASE_URL` → `https://<gateway>.onrender.com/demo`
  - mariland: `VITE_MARILAND_API_BASE_URL` → `https://<gateway>.onrender.com/mariland`
- [ ] CORS: configurar por env var en Render (ambas apps aceptan sus frontends respectivos)
- [ ] Render: crear servicio gateway, eliminar los dos individuales

### Paso 6: Actualizar documentación

- [x] `.ai/environments.md` — nueva URL de producción del gateway
- [x] `.ai/structure.md` — añadir `backend/gateway/`

## Archivos a modificar

| Área | Archivos | Cambio |
|------|----------|--------|
| demo src | ~16 `.py` en `src/demo/` | `from app.` → `from demo.` |
| demo tests | ~4 `.py` en `tests/` | `from app.` → `from demo.` |
| demo alembic | `alembic/env.py` | `from app.` → `from demo.` |
| mariland src | ~18 `.py` en `src/mariland/` | `from app.` → `from mariland.` |
| mariland tests | ~9 `.py` en `tests/` | `from app.` → `from mariland.` |
| mariland alembic | `alembic/env.py` | `from app.` → `from mariland.` |
| configs | `pyproject.toml` × 2 | packages path |
| docker | `Dockerfile` × 2, `docker-compose.yml` | uvicorn module path |
| CI | `ci-demo.yml`, `ci-mariland.yml` | mypy package name |
| gateway | 3 archivos nuevos | `main.py`, `Dockerfile`, `pyproject.toml` |
| docs | `environments.md`, `structure.md` | URLs y estructura |

## Verificación final

1. `make test APP=demo` y `make test APP=mariland` — pasan
2. `make lint APP=demo` y `make lint APP=mariland` — pasan
3. `make dev APP=demo` y `make dev APP=mariland` — arrancan y responden
4. `docker build -f backend/gateway/Dockerfile .` — construye correctamente
5. CI verde en ambos workflows tras push
