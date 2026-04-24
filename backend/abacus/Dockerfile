# Build context: ./backend/abacus
FROM python:3.12-slim AS base

WORKDIR /app

COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

ENV UV_PROJECT_ENVIRONMENT=/opt/venv

# ── Development stage ──────────────────────────────────────────────────────────
FROM base AS development

COPY pyproject.toml alembic.ini ./
RUN uv sync --extra dev --no-install-project

ENV PATH="/opt/venv/bin:$PATH"
ENV PYTHONPATH="/app/src"

EXPOSE 8002

CMD ["uvicorn", "src.abacus.main:app", "--host", "0.0.0.0", "--port", "8002", "--reload"]

# ── Production stage ───────────────────────────────────────────────────────────
FROM base AS production

COPY pyproject.toml ./
RUN uv sync --no-dev --no-install-project

COPY . .
RUN uv sync --no-dev

ENV PATH="/opt/venv/bin:$PATH"
ENV PYTHONPATH="/app/src"

EXPOSE 8002

CMD ["sh", "-c", "alembic upgrade head && uvicorn src.abacus.main:app --host 0.0.0.0 --port 8002 --workers 4"]
