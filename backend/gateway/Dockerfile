# Build context: repo root (monorepo/)
# docker build -f backend/gateway/Dockerfile .
FROM python:3.12-slim AS base

WORKDIR /app

COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

ENV UV_PROJECT_ENVIRONMENT=/opt/venv

# ── Production stage ────────────────────────────────────────────────────────
FROM base AS production

# Install demo deps (has lock file)
COPY backend/demo/pyproject.toml backend/demo/uv.lock /app/demo/
RUN cd /app/demo && uv sync --no-dev --no-install-project --frozen

# Install mariland deps (no lock file)
COPY backend/mariland/pyproject.toml /app/mariland/
RUN cd /app/mariland && uv sync --no-dev --no-install-project

# Install gateway deps
COPY backend/gateway/pyproject.toml /app/gateway/
RUN cd /app/gateway && uv sync --no-dev --no-install-project

# Copy source code and alembic configs
COPY backend/demo/src /app/demo/src
COPY backend/demo/alembic /app/demo/alembic
COPY backend/demo/alembic.ini /app/demo/alembic.ini
COPY backend/mariland/src /app/mariland/src
COPY backend/mariland/alembic /app/mariland/alembic
COPY backend/mariland/alembic.ini /app/mariland/alembic.ini
COPY backend/gateway/src /app/gateway/src

ENV PATH="/opt/venv/bin:$PATH"
ENV PYTHONPATH="/app/demo/src:/app/mariland/src:/app/gateway/src"

EXPOSE 8000

CMD ["sh", "-c", \
    "cd /app/demo && alembic upgrade head && \
     cd /app/mariland && alembic upgrade head && \
     uvicorn gateway.main:app --host 0.0.0.0 --port 8000 --workers 4"]
