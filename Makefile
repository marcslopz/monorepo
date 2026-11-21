# Default app — override with: make <target> APP=demo
APP ?= demo

.PHONY: help build dev stop clean logs shell-backend shell-frontend import \
        migrate migrate-create test test-unit test-integration test-e2e test-frontend \
        lint lint-fix lint-frontend typecheck-frontend format typecheck check check-all

help:
	@echo "Usage: make <target> [APP=<app>]"
	@echo ""
	@echo "Current APP: $(APP)"
	@echo ""
	@echo "Infrastructure:"
	@echo "  build              Build containers for APP (also updates deps)"
	@echo "  dev                Start APP services (mananettis: wrangler pages dev + local D1 on :5176)"
	@echo "  stop               Stop all services"
	@echo "  clean              Stop and remove all volumes (fresh start)"
	@echo "  logs               Follow logs"
	@echo "  shell-backend      Shell into backend container"
	@echo "  shell-frontend     Shell into frontend container"
	@echo ""
	@echo "Database:"
	@echo "  migrate            Run Alembic migrations for APP"
	@echo "  migrate-create     Create migration (NAME=<name>)"
	@echo ""
	@echo "Quality:"
	@echo "  lint               ruff check on backend/APP"
	@echo "  lint-fix           ruff check --fix on backend/APP"
	@echo "  lint-frontend      eslint on frontend/APP"
	@echo "  typecheck-frontend tsc --noEmit on frontend/APP"
	@echo "  format             ruff format on backend/APP"
	@echo "  typecheck          mypy on backend/APP"
	@echo "  check              lint + typecheck (backend)"
	@echo "  check-all          lint + typecheck + lint-frontend"
	@echo ""
	@echo "Tests:"
	@echo "  test               All backend tests for APP (mananettis: node --test + Python unittest in Docker)"
	@echo "  import             mananettis: docx -> plays/<slug>.json draft (FILE=plays/sources/x.docx [SLUG=])"
	@echo "  consolidate        mananettis: shared corrections -> plays/<PLAY>.json + commit message [API=]"
	@echo "  d1-clear           mananettis: mark PLAY's consolidated patches in D1 (from main, after deploy) [DB=]"
	@echo "  rollback           mananettis: bulk undo PLAY SINCE= [AUTHOR=] [DEVICE=]; CONFIRM=1 applies [DB=]"
	@echo "  test-unit          Unit tests for APP"
	@echo "  test-integration   Integration tests for APP"
	@echo "  test-e2e           E2E tests for APP"
	@echo "  test-frontend      Frontend tests for APP"

# Infrastructure
build:
	docker compose build $(APP)-backend $(APP)-frontend

ifeq ($(APP),mananettis)
# Static site + Pages Functions (/api/patches) with a local D1 kept in frontend/mananettis/.wrangler/.
# http://localhost:5176 (the first run downloads wrangler, ~1 min). Full node image: workerd needs CA certificates.
dev:
	docker run --rm -it -p 5176:8788 -u $$(id -u):$$(id -g) -e HOME=/tmp -v $(PWD)/frontend/mananettis:/app -w /app node:22 \
		npx -y wrangler@4 pages dev . --d1 DB=mananettis-local --ip 0.0.0.0 --port 8788
else
dev:
	cp -n .env.example .env 2>/dev/null || true
	docker compose --profile $(APP) up
endif

stop:
	docker compose --profile all down

clean:
	docker compose --profile all down -v

logs:
	docker compose --profile $(APP) logs -f

shell-backend:
	docker compose exec $(APP)-backend bash

shell-frontend:
	docker compose exec $(APP)-frontend sh

# Workspace
lock:
	docker run --rm -v $(PWD):/app -w /app python:3.12-slim sh -c "pip install uv -q && uv lock"

# Database
VENV = /opt/venv/bin

migrate:
	docker compose exec $(APP)-backend $(VENV)/alembic upgrade head

migrate-create:
	docker compose exec $(APP)-backend $(VENV)/alembic revision --autogenerate -m "$(NAME)"

# Quality
lint:
	docker compose exec $(APP)-backend $(VENV)/ruff check src tests

lint-fix:
	docker compose exec $(APP)-backend $(VENV)/ruff check --fix src tests

lint-frontend:
	docker compose exec $(APP)-frontend pnpm lint

typecheck-frontend:
	docker compose exec $(APP)-frontend pnpm tsc --noEmit

format:
	docker compose exec $(APP)-backend $(VENV)/ruff format src tests

typecheck:
	docker compose exec $(APP)-backend $(VENV)/mypy -p $(APP)

check: lint typecheck

check-all: lint typecheck lint-frontend typecheck-frontend

# Tests
# mananettis is a static app with no compose service: its tests run in a throwaway node container.
NODE_IMAGE = node:22-alpine
PYTHON_IMAGE = python:3.12-slim

ifeq ($(APP),mananettis)
test:
	docker run --rm -v $(PWD)/frontend/mananettis:/app:ro -w /app $(NODE_IMAGE) node --test
	docker run --rm -v $(PWD)/frontend/mananettis:/app:ro -w /app/tools -e PYTHONDONTWRITEBYTECODE=1 $(PYTHON_IMAGE) python -m unittest -v

# docx -> plays/<slug>.json draft to review. FILE is relative to frontend/mananettis (e.g. plays/sources/x.docx).
import:
	@test -n "$(FILE)" || { echo "Usage: make import APP=mananettis FILE=plays/sources/<x>.docx [SLUG=<slug>]"; exit 2; }
	docker run --rm -u $$(id -u):$$(id -g) -v $(PWD)/frontend/mananettis:/app -w /app -e PYTHONDONTWRITEBYTECODE=1 $(PYTHON_IMAGE) python -I tools/import_docx.py "$(FILE)" --out plays $(if $(SLUG),--slug $(SLUG))

# --- Shared corrections (D1). See frontend/mananettis/tools/consolidate.js and tools/d1-sql.js.
# consolidate: GET /api/patches (public) -> applies them to plays/$(PLAY).json + prints the commit message.
#   API= to read another deployment (e.g. a preview URL).
# d1-clear / rollback: wrangler against D1 (DB=mananettis by default; DB=mananettis-preview to test).
#   Need CLOUDFLARE_API_TOKEN (Account > D1 > Edit) and CLOUDFLARE_ACCOUNT_ID in the environment.
DB ?= mananettis
MNT_NODE = docker run --rm -u $$(id -u):$$(id -g) -v $(PWD)/frontend/mananettis:/app -w /app $(NODE_IMAGE) node
WRANGLER = docker run --rm -e CLOUDFLARE_API_TOKEN -e CLOUDFLARE_ACCOUNT_ID -e HOME=/tmp -u $$(id -u):$$(id -g) node:22 npx -y wrangler@4

define need_play
	@test -n "$(PLAY)" || { echo "Falta PLAY=<slug> (p. ej. PLAY=la-cita)"; exit 2; }
endef
define need_cloudflare
	@test -n "$$CLOUDFLARE_API_TOKEN" -a -n "$$CLOUDFLARE_ACCOUNT_ID" || { echo "Faltan CLOUDFLARE_API_TOKEN y/o CLOUDFLARE_ACCOUNT_ID en el entorno"; exit 2; }
endef

consolidate:
	$(need_play)
	$(MNT_NODE) tools/consolidate.js $(PLAY) $(if $(API),--api $(API))

# Only once the consolidated JSON is in main and deployed: marks its revisions' patch ids in D1.
d1-clear:
	$(need_play)
	$(need_cloudflare)
	@test "$$(git rev-parse --abbrev-ref HEAD)" = main || { echo "Ejecuta d1-clear desde main (con el JSON consolidado ya mergeado)"; exit 2; }
	@git fetch -q origin main && git diff --quiet origin/main -- frontend/mananettis/plays/$(PLAY).json || { echo "plays/$(PLAY).json difiere de origin/main: mergea y despliega primero"; exit 2; }
	@SQL=$$($(MNT_NODE) tools/d1-sql.js clear $(PLAY) $$(git rev-parse --short HEAD)) && echo "$$SQL" && \
		$(WRANGLER) d1 execute $(DB) --remote --command "$$SQL"

# Bulk undo: make rollback APP=mananettis PLAY=<slug> SINCE=<iso> [AUTHOR=] [DEVICE=] -> lists; add CONFIRM=1 to apply.
rollback:
	$(need_play)
	$(need_cloudflare)
	@test -n "$(SINCE)" || { echo "Falta SINCE=<fecha ISO, UTC> (p. ej. SINCE=2026-11-21T18:00)"; exit 2; }
	@FLAGS="$(if $(AUTHOR),--author '$(AUTHOR)') $(if $(DEVICE),--device $(DEVICE))"; \
		SQL=$$(eval $(MNT_NODE) tools/d1-sql.js rollback $(PLAY) $(SINCE) $$FLAGS --select) && \
		$(WRANGLER) d1 execute $(DB) --remote --command "$$SQL"; \
		if [ "$(CONFIRM)" = 1 ]; then \
			SQL=$$(eval $(MNT_NODE) tools/d1-sql.js rollback $(PLAY) $(SINCE) $$FLAGS --update) && \
			$(WRANGLER) d1 execute $(DB) --remote --command "$$SQL" && echo "Deshechos (reversible: undone=1, undone_by='rollback')."; \
		else echo "Solo listado. Repite con CONFIRM=1 para deshacer estas correcciones."; fi
else
test:
	docker compose exec $(APP)-backend $(VENV)/pytest tests/ -v
endif

test-unit:
	docker compose exec $(APP)-backend $(VENV)/pytest tests/unit/ -v

test-integration:
	docker compose exec $(APP)-backend $(VENV)/pytest tests/integration/ -v

test-e2e:
	docker compose exec $(APP)-backend $(VENV)/pytest tests/e2e/ -v

test-frontend:
	docker compose exec $(APP)-frontend pnpm test run
