# syntax=docker/dockerfile:1
# Build context: repo root (monorepo/)
# docker build -f backend/gateway/Dockerfile --secret id=GIT_AUTH_TOKEN,src=<token file> .
FROM python:3.13-slim AS base

WORKDIR /app

COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

ENV UV_PROJECT_ENVIRONMENT=/opt/venv

# ── Production stage ────────────────────────────────────────────────────────
FROM base AS production

# Copy workspace root + all app pyproject.toml files + lock file
COPY pyproject.toml uv.lock ./
COPY backend/shared/pyproject.toml ./backend/shared/
COPY backend/demo/pyproject.toml ./backend/demo/
COPY backend/mariland/pyproject.toml ./backend/mariland/
COPY backend/abacus/pyproject.toml ./backend/abacus/
COPY backend/gateway/pyproject.toml ./backend/gateway/

# Install all gateway deps (transitively includes demo + mariland deps)
RUN uv sync --package gateway --no-dev --no-install-project

# Copy source code and alembic configs
COPY backend/demo/src ./backend/demo/src
COPY backend/demo/alembic ./backend/demo/alembic
COPY backend/demo/alembic.ini ./backend/demo/alembic.ini
COPY backend/mariland/src ./backend/mariland/src
COPY backend/mariland/alembic ./backend/mariland/alembic
COPY backend/mariland/alembic.ini ./backend/mariland/alembic.ini
COPY backend/abacus/src ./backend/abacus/src
COPY backend/abacus/alembic ./backend/abacus/alembic
COPY backend/abacus/alembic.ini ./backend/abacus/alembic.ini
COPY backend/gateway/src ./backend/gateway/src

# FlixSeven lives in its own private repo (marcslopz/flixseven): the latest main, fetched with
# the GIT_AUTH_TOKEN build secret (Render: a secret file of that name, a read-only token).
# ADD re-fetches only when main moves to another commit.
ADD https://github.com/marcslopz/flixseven.git#main /src/flixseven
RUN uv pip install --python /opt/venv /src/flixseven/backend

ENV PATH="/opt/venv/bin:$PATH"
ENV PYTHONPATH="/app/backend/demo/src:/app/backend/mariland/src:/app/backend/abacus/src:/app/backend/gateway/src"

EXPOSE 8000

# One worker: FlixSeven hands its live events to the phones in memory, within one process.
CMD ["sh", "-c", \
    "cd /app/backend/demo && alembic upgrade head && \
     cd /app/backend/mariland && alembic upgrade head && \
     cd /app/backend/abacus && alembic upgrade head && \
     python -m flixseven.migrate && \
     uvicorn gateway.main:app --host 0.0.0.0 --port 8000 --workers 1"]
