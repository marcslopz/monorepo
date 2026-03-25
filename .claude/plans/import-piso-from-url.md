# Feature: Importar piso desde URL de portal inmobiliario

## Contexto

Actualmente los pisos en mariland se crean manualmente rellenando todos los campos. Se quiere poder pegar un enlace de un portal (empezando por Fotocasa, luego Idealista, Habitaclia) y que el backend extraiga automáticamente la información del piso.

**Enfoque elegido**: Jina Reader (`r.jina.ai`) para convertir la página en markdown + Claude Haiku 4.5 con structured output para extraer los campos del piso. Coste estimado: <0.5 céntimos/piso.

## Pasos de implementación

### Configuración API Anthropic

- [x] **Paso 1**: Crear API key en console.anthropic.com
  - Ir a https://console.anthropic.com → API Keys → Create Key
  - Guardar la key de forma segura

- [x] **Paso 2**: Configurar API key en el proyecto
  - Añadir `ANTHROPIC_API_KEY=sk-ant-...` al `.env` del monorepo root (ya está gitignored)
  - Añadir `ANTHROPIC_API_KEY` al `.env.example` como placeholder
  - Pasar `ANTHROPIC_API_KEY` al servicio `mariland-backend` en `docker-compose.yml` (via `environment:`)
  - Añadir `anthropic_api_key: str` a `backend/mariland/src/app/config.py` (Settings)

### Backend — Dependencias

- [x] **Paso 3**: Añadir dependencias al backend
  - Añadir `anthropic` y `httpx` a `backend/mariland/pyproject.toml` (dependencies)
  - Rebuild: `make build APP=mariland`

### Backend — Domain layer

- [x] **Paso 4**: Crear port de scraping
  - Nuevo fichero: `backend/mariland/src/app/domain/ports/scraper.py`
  - Protocolo `UrlScraperPort` con método: `async def scrape_piso(self, url: str) -> dict[str, Any]`
  - Devuelve un dict compatible con los campos de `PisoCreate`

### Backend — Infrastructure layer

- [x] **Paso 5**: Implementar adapter Jina + Anthropic
  - Nuevo fichero: `backend/mariland/src/app/infrastructure/scraping/jina_anthropic_scraper.py`
  - Clase `JinaAnthropicScraper` que implementa `UrlScraperPort`
  - Paso 1 interno: `httpx.AsyncClient.get(f"https://r.jina.ai/{url}")` → markdown limpio
  - Paso 2 interno: Llamar a Claude Haiku 4.5 con el markdown como contexto y un prompt que pida extraer los campos del piso en JSON
  - Usar `tool_use` para forzar el schema de respuesta
  - Mapear la respuesta a un dict con los campos de `PisoCreate`
  - Setear `estado: "candidato"` siempre
  - Guardar el URL original en el campo `url`

### Backend — Presentation layer

- [x] **Paso 6**: Crear schema de request y nuevo endpoint
  - Añadir `PisoFromUrlRequest(BaseModel)` con campo `url: str` en `piso_schemas.py`
  - Nuevo endpoint `POST /pisos/from-url` en `pisos.py` (antes de `/{piso_id}`)
  - Añadir `ScraperDep` y `get_scraper()` en `dependencies.py`

### Backend — Tests

- [x] **Paso 7**: Tests unitarios (46/46 passing, 93% coverage)
  - `tests/unit/test_scraper.py` — 4 tests del scraper con mocks

### Frontend

- [x] **Paso 8**: Añadir UI de importación desde URL
  - `pisosApi.importFromUrl` en `api/pisos.ts`
  - Componente `ImportFromUrlModal` con campo URL, loading spinner y manejo de errores
  - Botón "Importar URL" en header de `App.tsx`
  - `prependPiso` añadido al hook `usePisos`

### Producción

- [x] **Paso 9**: Configurar variable en producción
  - Añadir `ANTHROPIC_API_KEY` como env var en Render (mariland-backend)

## Ficheros a modificar/crear

| Acción | Fichero |
|--------|---------|
| Modificar | `.env` (root) |
| Modificar | `.env.example` (root) |
| Modificar | `docker-compose.yml` |
| Modificar | `backend/mariland/pyproject.toml` |
| Modificar | `backend/mariland/src/app/config.py` |
| Crear | `backend/mariland/src/app/domain/ports/scraper.py` |
| Crear | `backend/mariland/src/app/infrastructure/scraping/__init__.py` |
| Crear | `backend/mariland/src/app/infrastructure/scraping/jina_anthropic_scraper.py` |
| Modificar | `backend/mariland/src/app/presentation/schemas/piso_schemas.py` |
| Modificar | `backend/mariland/src/app/presentation/api/pisos.py` |
| Modificar | `backend/mariland/src/app/presentation/dependencies.py` |
| Crear | `backend/mariland/tests/unit/test_scraper.py` |
| Modificar | `backend/mariland/tests/unit/test_piso_service.py` (o nuevo test) |
| Modificar | `frontend/mariland/src/api/pisos.ts` |
| Modificar | `frontend/mariland/src/types/piso.ts` (si hace falta) |
| Crear/Modificar | `frontend/mariland/src/components/ImportFromUrlModal.tsx` (o integrar en PisoForm) |

## Verificación

1. `make build APP=mariland` — reconstruir imagen con nuevas deps
2. `make test APP=mariland` — todos los tests pasan
3. `make lint APP=mariland && make format APP=mariland && make typecheck APP=mariland` — sin errores
4. `make dev APP=mariland` → pegar URL de Fotocasa en la UI → verificar que se crea el piso con campos correctos
5. Probar con URL de Idealista para verificar que el enfoque LLM generaliza sin cambios de código
