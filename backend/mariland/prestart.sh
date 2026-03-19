#!/bin/sh
set -e

echo "Ensuring database exists..."
uv run python -c "import asyncio; from app.main import _ensure_database; asyncio.run(_ensure_database())"

echo "Running migrations..."
uv run alembic upgrade head

echo "Starting server..."
exec uv run uvicorn src.app.main:app --host 0.0.0.0 --port 8001 --reload
