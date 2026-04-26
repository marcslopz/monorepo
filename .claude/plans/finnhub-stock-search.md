# Plan — Issue #17: Buscar acciones en Finnhub y crearlas en abacus

## Checkboxes de progreso

### Backend
- [x] `domain/models/stock_search.py` — `StockSearchResult(BaseModel)` con `ticker`, `name`, `asset_class`
- [x] `domain/ports/stock_search.py` — `StockSearchPort(Protocol)`
- [x] `domain/exceptions.py` — añadir `StockSearchUnavailableError`, `ExternalServiceError`
- [x] `domain/ports/repositories.py` — añadir `get_by_ticker` a `AssetRepository`
- [x] `config.py` — añadir `finnhub_api_key`, `finnhub_base_url`
- [x] `infrastructure/external/__init__.py` + `finnhub_client.py` — cliente httpx + TTLCache
- [x] `infrastructure/external/noop_stock_search.py` — `NoopStockSearch` lanza 503
- [x] `infrastructure/persistence/repositories/sqlalchemy_asset_repository.py` — `get_by_ticker`
- [x] `application/services/asset_service.py` — inyectar port, dedupe, `search_stocks`
- [x] `presentation/schemas/asset_schemas.py` — `StockSearchResultOut`
- [x] `presentation/api/assets.py` — `GET /assets/search?q=...`
- [x] `presentation/middleware.py` — handlers 503/502
- [x] `presentation/dependencies.py` — wire `get_stock_search_port`

### Tests backend
- [x] `tests/conftest.py` — `mock_stock_search_port` fixture
- [x] `tests/unit/test_asset_service.py` — tests dedupe + search
- [x] `tests/unit/test_finnhub_client.py` — tests parsing + caché
- [x] `tests/e2e/test_api.py` — `test_search_assets_endpoint`

### Frontend
- [x] `types/models.ts` — `StockSearchResult`
- [x] `api/assets.ts` — `searchAssets(q)`
- [x] `hooks/useStockSearch.ts` — debounce hook
- [x] `components/AssetModal.tsx` — input búsqueda + dropdown
- [x] `components/AssetModal.test.tsx` — tests vitest + RTL

### Config
- [x] `docker-compose.yml` — `ABACUS_FINNHUB_API_KEY` env var
