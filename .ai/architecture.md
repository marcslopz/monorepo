# Hexagonal Architecture (backend)

```
Presentation  →  Application  →  Domain  ←  Infrastructure
```

## Layers

**Domain** (`domain/`): Pure Python, no framework deps.
- `models/` — Entities (Pydantic)
- `ports/` — Protocols: `Repository`, `CacheService`
- `exceptions.py` — Domain exceptions

**Application** (`application/services/`): Use cases. Depends only on Domain ports.

**Infrastructure** (`infrastructure/`): Implements ports.
- `persistence/` — SQLAlchemy models + repository implementation
- `cache/` — `NoopCacheService` (default) and `RedisCacheService` (optional)
- `auth/` — JWT verification

**Presentation** (`presentation/`): FastAPI layer.
- `api/` — Routers
- `schemas/` — Pydantic request/response models
- `dependencies.py` — FastAPI Depends wiring
- `middleware.py` — CORS, error handlers

## Wiring example (demo)
```
Router → Depends → Service(Repository, CacheService)
                         ↑                  ↑
               SQLAlchemyRepository    NoopCacheService
```
