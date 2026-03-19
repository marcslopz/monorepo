# Build context: ./backend/demo
# The uv workspace root is mounted at /workspace so shared/ is available.
FROM python:3.12-slim AS base

WORKDIR /app

COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

# ── Development stage ──────────────────────────────────────────────────────────
FROM base AS development

COPY pyproject.toml ./
RUN uv sync --extra dev --no-install-project

COPY . .
RUN uv sync --extra dev

ENV PATH="/app/.venv/bin:$PATH"
ENV PYTHONPATH="/app/src"

EXPOSE 8000

CMD ["uvicorn", "src.app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]

# ── Production stage ───────────────────────────────────────────────────────────
FROM base AS production

COPY pyproject.toml ./
RUN uv sync --no-dev --no-install-project

COPY . .
RUN uv sync --no-dev

ENV PATH="/app/.venv/bin:$PATH"
ENV PYTHONPATH="/app/src"

EXPOSE 8000

CMD ["uvicorn", "src.app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
