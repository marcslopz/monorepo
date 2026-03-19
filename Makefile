# Default app — override with: make <target> APP=demo
APP ?= demo

.PHONY: help build dev stop logs shell-backend shell-frontend \
        migrate migrate-create test test-unit test-integration test-e2e test-frontend \
        lint format typecheck check

help:
	@echo "Usage: make <target> [APP=<app>]"
	@echo ""
	@echo "Current APP: $(APP)"
	@echo ""
	@echo "Infrastructure:"
	@echo "  build              Build containers for APP"
	@echo "  dev                Start APP services"
	@echo "  stop               Stop all services"
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
	@echo "  format             ruff format on backend/APP"
	@echo "  typecheck          mypy on backend/APP"
	@echo "  check              lint + typecheck"
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
	docker compose down

logs:
	docker compose --profile $(APP) logs -f

shell-backend:
	docker compose exec $(APP)-backend bash

shell-frontend:
	docker compose exec $(APP)-frontend sh

# Database
VENV = /app/.venv/bin

migrate:
	docker compose exec $(APP)-backend $(VENV)/alembic upgrade head

migrate-create:
	docker compose exec $(APP)-backend $(VENV)/alembic revision --autogenerate -m "$(NAME)"

# Quality
lint:
	docker compose exec $(APP)-backend $(VENV)/ruff check src tests

format:
	docker compose exec $(APP)-backend $(VENV)/ruff format src tests

typecheck:
	docker compose exec $(APP)-backend $(VENV)/mypy src

check: lint typecheck

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
