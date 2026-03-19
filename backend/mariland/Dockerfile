# Build context: ./backend/mariland
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

EXPOSE 8001

CMD ["uvicorn", "src.app.main:app", "--host", "0.0.0.0", "--port", "8001", "--reload"]

# ── Production stage ───────────────────────────────────────────────────────────
FROM base AS production

COPY pyproject.toml ./
RUN uv sync --no-dev --no-install-project

COPY . .
RUN uv sync --no-dev

ENV PATH="/opt/venv/bin:$PATH"
ENV PYTHONPATH="/app/src"

EXPOSE 8001

CMD ["uvicorn", "src.app.main:app", "--host", "0.0.0.0", "--port", "8001", "--workers", "4"]
