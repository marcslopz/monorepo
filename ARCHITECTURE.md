# Architecture

## Monorepo Structure

Each app is fully independent — it has its own domain, application layer, infrastructure adapters, and presentation layer. Apps can optionally share code via `backend/shared` and `frontend/shared`.

```
monorepo/
├── backend/
│   ├── shared/     ← Common Python code (no app-specific logic)
│   ├── demo/       ← Independent app
│   └── newapp/     ← Another independent app (future)
└── frontend/
    ├── shared/     ← Common React components/hooks
    ├── demo/
    └── newapp/
```

**Rule**: An app may depend on `shared`. Apps must NOT depend on each other.

---

## Hexagonal Architecture (per app)

The domain is the center. It knows nothing about the outside world.

```
                      ┌─────────────────────────────────┐
                      │            Domain                │
                      │  ┌────────┐   ┌──────────────┐  │
                      │  │ Models │   │ Exceptions   │  │
                      │  └────────┘   └──────────────┘  │
  ┌──────────────┐    │  ┌────────────────────────────┐  │    ┌──────────────────┐
  │ Presentation │───▶│  │       Ports (Protocols)    │  │◀───│  Infrastructure  │
  │  (FastAPI)   │    │  │  ItemRepository, Cache...  │  │    │ (SQLAlchemy, Redis│
  └──────────────┘    │  └────────────────────────────┘  │    └──────────────────┘
         │            └─────────────────────────────────┘
         │                          ▲
         └──────────────────────────┤
                                    │
                           ┌────────────────┐
                           │  Application   │
                           │  (Services)    │
                           └────────────────┘
```

## Layer Responsibilities

### Domain (`src/app/domain/`)
Pure business logic. No framework imports. Never changes because of infrastructure choices.

- **`models/`** — Pydantic domain entities (e.g., `Item`)
- **`ports/`** — Python `Protocol` classes defining interfaces (`ItemRepository`, `CacheService`)
- **`exceptions.py`** — Domain-specific exceptions (`NotFoundError`, `ConflictError`)

### Application (`src/app/application/`)
Use cases. Orchestrates domain objects. Depends only on domain ports.

- **`services/`** — One service per aggregate (e.g., `ItemService`)

### Infrastructure (`src/app/infrastructure/`)
Concrete implementations of ports. Knows about databases, Redis, etc.

- **`persistence/`** — SQLAlchemy models + repository implementations
- **`cache/`** — Redis cache implementation
- **`auth/`** — JWT verification

### Presentation (`src/app/presentation/`)
FastAPI layer. HTTP in/out. Knows about application services.

- **`api/`** — Route handlers
- **`schemas/`** — Pydantic request/response schemas (different from domain models)
- **`dependencies.py`** — FastAPI `Depends` wiring (builds infrastructure objects)
- **`middleware.py`** — CORS, exception handlers

## Dependency Rule

```
Presentation → Application → Domain ← Infrastructure
```

Domain has zero outward dependencies. Everything else depends inward.

## Key Decisions

### Protocols over ABCs
Ports are Python `Protocol` classes (structural subtyping). Adapters don't need to inherit — they just implement the right methods. Easy to swap implementations in tests.

### Async all the way
SQLAlchemy async + asyncpg + redis.asyncio. No sync code in the request path.

### Separate domain models from ORM models
Domain `Item` (Pydantic) ≠ `ItemModel` (SQLAlchemy). The repository translates between them. Domain stays clean.

### Dependency injection via FastAPI Depends
`dependencies.py` is the wiring point. In tests, override `app.dependency_overrides` to inject mocks without touching business logic.

## Testing Strategy

| Layer | Type | Isolation |
|-------|------|-----------|
| `application/services/` | Unit | Mock repository + cache via `AsyncMock` |
| `infrastructure/persistence/` | Integration | Real PostgreSQL (test DB) |
| `presentation/api/` | E2E | Mock service via `dependency_overrides` |
