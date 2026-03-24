# Improve import-from-URL error handling + progress UI

## Context

El endpoint `POST /pisos/from-url` puede tardar 60-120s y no da feedback de progreso. Si falla (ScrapingBee timeout, bot-block de Idealista, error de Claude), el usuario solo ve un 500 genérico. Los logs tampoco identifican claramente qué paso falló ni con qué URL.

**Root cause del issue #9**: Idealista tiene protección anti-bot ("checking device...") que ScrapingBee no puede bypassear → ScrapingBee devuelve 500 → httpx no lo captura → 500 genérico al frontend. No podemos resolver el bot-block, pero sí informar claramente al usuario.

## Plan

### Paso 1: Excepciones de dominio granulares ✓
**Archivo**: `backend/mariland/src/mariland/domain/exceptions.py`
- Añadir `FetchError(ScrapingError)` — fallo en obtención de URL
- Añadir `ExtractionError(ScrapingError)` — fallo en extracción con Claude

### Paso 2: Error handling en fetchers
**Archivos**: `infrastructure/scraping/scrapingbee_fetcher.py`, `jina_fetcher.py`
- [ ] Capturar `httpx.ReadTimeout`, `httpx.HTTPStatusError`, `httpx.ConnectTimeout` → `FetchError` con mensaje descriptivo (URL, qué pasó)
- [ ] ScrapingBee: subir timeout de 60s a 120s
- [ ] Log explícito del error antes de lanzar la excepción

### Paso 3: Error handling en LlmScraper._extract_fields
**Archivo**: `infrastructure/scraping/llm_scraper.py`
- [ ] Capturar `anthropic.APITimeoutError`, `anthropic.APIStatusError`, `anthropic.APIConnectionError` → `ExtractionError`

### Paso 4: Tests unitarios de error handling (TDD)
**Archivos**: `tests/unit/test_fetchers.py` (nuevo), `tests/unit/test_scraper.py` (ampliar)
- [ ] Tests para ScrapingBeeFetcher: timeout → FetchError, HTTP 500 → FetchError
- [ ] Tests para JinaFetcher: idem
- [ ] Tests para _extract_fields: errores Anthropic → ExtractionError
- [ ] Ejecutar y verificar que pasan

### Paso 5: SSE event types + scrape_piso_stream
**Archivo nuevo**: `presentation/schemas/sse_events.py`
- Definir `ProgressEvent`, `DoneEvent`, `ErrorEvent` (Pydantic models)

**Archivo**: `infrastructure/scraping/llm_scraper.py`
- [ ] Nuevo método `scrape_piso_stream(url)` → `AsyncGenerator[SseEvent, None]`
- [ ] Yield secuencia: progress(fetching) → progress(extracting) → progress(saving) → done(piso)
- [ ] En cada paso, capturar errores y yield ErrorEvent en vez de raise
- [ ] Mantener `scrape_piso()` original (lo usa en tests existentes), refactorizar para que consuma `scrape_piso_stream` internamente

### Paso 6: Endpoint SSE
**Archivo**: `presentation/api/pisos.py`
- [ ] Cambiar `POST /from-url` para devolver `StreamingResponse(media_type="text/event-stream")`
- [ ] El generador itera `scraper.scrape_piso_stream(url)`, serializa cada evento como `data: {json}\n\n`
- [ ] El paso "saving" (`service.create_piso`) se ejecuta dentro del generador al recibir `DoneEvent`
- [ ] Quitar `response_model=PisoOut` y `status_code=201` (ya no aplican a streaming)

### Paso 7: Tests backend SSE
**Archivo**: `tests/unit/test_scraper.py` (ampliar)
- [ ] `test_scrape_piso_stream_emits_progress_and_done`
- [ ] `test_scrape_piso_stream_emits_error_on_fetch_failure`
- [ ] `test_scrape_piso_stream_emits_error_on_extraction_failure`

### Paso 8: Frontend - utilidad SSE
**Archivo nuevo**: `frontend/mariland/src/api/sse.ts`
- [ ] `fetchSSE(url, body, onEvent, signal?)` — usa `fetch` + `ReadableStream` + `TextDecoder` para parsear líneas SSE desde un POST

**Archivo**: `frontend/mariland/src/api/pisos.ts`
- [ ] Reemplazar `importFromUrl` por `importFromUrlStream(url, onEvent)` que usa `fetchSSE`

**Archivo**: `frontend/mariland/src/types/piso.ts`
- [ ] Añadir tipos `SseProgressEvent`, `SseDoneEvent`, `SseErrorEvent`, `SseEvent`

### Paso 9: Frontend - UI de progreso
**Archivo**: `frontend/mariland/src/components/ImportFromUrlModal.tsx`
- [ ] Reemplazar estado `loading: boolean` por `currentStep` + `errorMessage`
- [ ] UI: lista de 3 pasos (Obteniendo página / Analizando con IA / Guardando) con estados: pending (gris), active (spinner), done (check verde), error (rojo + mensaje)
- [ ] Usar `AbortController` para cancelar si el usuario cierra el modal
- [ ] En error, mostrar mensaje descriptivo del backend (ej: "El portal puede estar bloqueando el acceso automático")

### Paso 10: Tests frontend
**Archivo nuevo**: `frontend/mariland/src/test/ImportFromUrlModal.test.tsx`
- [ ] Test: submit muestra pasos de progreso
- [ ] Test: error event muestra mensaje en el paso correcto
- [ ] Test: done event llama `onImported` y `onClose`

## Consideraciones
- **DB session lifetime**: La sesión debe mantenerse viva durante todo el streaming. FastAPI maneja esto correctamente con el dependency injection lifecycle.
- **Gateway proxy**: El gateway monta sub-apps directamente (no nginx buffer), SSE debería funcionar sin cambios.
- **CORS**: No requiere cambios, sigue siendo una respuesta HTTP normal.
- **AbortController**: Si el usuario cierra el modal mid-import, abortar la fetch para no consumir créditos de ScrapingBee innecesariamente (aunque ScrapingBee ya habrá cobrado si la request salió).

## Verificación
1. `make test APP=mariland` — todos los tests pasan
2. `make lint APP=mariland` — sin errores
3. Test manual: importar URL de Fotocasa → ver progreso paso a paso → piso creado
4. Test manual: importar URL de Idealista (que sabemos que falla) → ver error claro en paso "fetching" con mensaje descriptivo
