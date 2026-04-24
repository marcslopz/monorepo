# Default app — override with: make <target> APP=demo
APP ?= demo

.PHONY: help build dev stop clean logs shell-backend shell-frontend \
        migrate migrate-create test test-unit test-integration test-e2e test-frontend \
        lint lint-fix lint-frontend typecheck-frontend format typecheck check check-all

help:
	@echo "Usage: make <target> [APP=<app>]"
	@echo ""
	@echo "Current APP: $(APP)"
	@echo ""
	@echo "Infrastructure:"
	@echo "  build              Build containers for APP (also updates deps)"
	@echo "  dev                Start APP services"
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
	@echo "  test               All backend tests for APP"
	@echo "  test-unit          Unit tests for APP"
	@echo "  test-integration   Integration tests for APP"
	@echo "  test-e2e           E2E tests for APP"
	@echo "  test-frontend      Frontend tests for APP"

# Infrastructure
build:
	docker compose build $(APP)-backend $(APP)-frontend

dev:
	cp -n .env.example .env 2>/dev/null || true
	docker compose --profile $(APP) up

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
test:
	docker compose exec $(APP)-backend $(VENV)/pytest tests/ -v

test-unit:
	docker compose exec $(APP)-backend $(VENV)/pytest tests/unit/ -v

test-integration:
	docker compose exec $(APP)-backend $(VENV)/pytest tests/integration/ -v

test-e2e:
	docker compose exec $(APP)-backend $(VENV)/pytest tests/e2e/ -v

test-frontend:
	docker compose exec $(APP)-frontend pnpm test run
