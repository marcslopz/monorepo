# Plan: Añadir campo `imagen_url` con thumbnail en PisoCard

## Descripción

Añadir un campo `imagen_url` (URL externa) a los pisos. En la card se muestra un banner horizontal en la parte superior. Al clicar la imagen se abre un modal con la imagen en grande.

---

## Fase 0: Rama de trabajo

- [x] Hacer checkout a `main` y pull
- [x] Crear rama: `feature/mariland-imagen-thumbnail`

---

## Fase 1: Tests backend (escribir primero, deben fallar)

**1.1 — Tests unitarios (`tests/unit/test_piso_service.py`)**

- [x] Test `test_create_piso_with_imagen_url`: verifica que `create_piso` propaga `imagen_url` y el piso devuelto tiene el campo correcto
- [x] Test `test_update_piso_imagen_url`: verifica que `update_piso` propaga el campo `imagen_url`

**1.2 — Tests de integración (`tests/integration/test_piso_repository.py`)**

- [x] Test `test_create_piso_with_imagen_url`: crea un piso con `imagen_url` via repo y verifica que se persiste y se recupera correctamente
- [x] Test `test_update_piso_imagen_url`: actualiza un piso existente con un `imagen_url` nuevo y verifica

**1.3 — Tests e2e (`tests/e2e/test_pisos_api.py`)**

- [x] Test `test_create_piso_with_imagen_url`: POST con `imagen_url` en el body, verifica respuesta JSON incluye el campo con el valor correcto
- [x] Test `test_piso_out_contains_imagen_url_null`: verifica que un piso sin imagen devuelve `"imagen_url": null`

**1.4 — Ejecutar tests para confirmar que fallan**

- [x] `make test-unit APP=mariland` → 2 fallan por `imagen_url` inexistente en `Piso`
- [ ] `make test-integration APP=mariland` → pendiente (se verificará tras migración)
- [x] `make test-e2e APP=mariland` → 2 fallan por schema incompleto

---

## Fase 2: Implementación backend

**2.1 — Domain model (`backend/mariland/src/app/domain/models/piso.py`)**

- [x] Añadir `imagen_url: str | None` después de `url`

**2.2 — SQLAlchemy model (`backend/mariland/src/app/infrastructure/persistence/models.py`)**

- [x] Añadir `imagen_url: Mapped[str | None] = mapped_column(String(2048), nullable=True)` después de `url`

**2.3 — Schemas (`backend/mariland/src/app/presentation/schemas/piso_schemas.py`)**

- [x] `PisoCreate`: añadir `imagen_url: str | None = None`
- [x] `PisoUpdate`: añadir `imagen_url: str | None = None`
- [x] `PisoOut`: añadir `imagen_url: str | None`

**2.4 — Migración Alembic**

- [x] Crear `backend/mariland/alembic/versions/0002_add_imagen_url_to_pisos.py` con `op.add_column` / `op.drop_column`
- [ ] Aplicar la migración: `make migrate APP=mariland` (se aplica en arranque del servidor)

**2.5 — Helper `make_piso` en tests**

- [x] Añadir `imagen_url: None` a los defaults del helper `make_piso` en `tests/conftest.py`

**2.6 — Ejecutar tests backend completos**

- [x] `make test-unit APP=mariland` → 18 passed
- [x] `make test-integration APP=mariland` → 11 passed
- [x] `make test-e2e APP=mariland` → 13 passed

---

## Fase 3: Tests frontend (escribir primero, deben fallar)

**3.1 — Actualizar `basePiso` en tests existentes**

- [x] `frontend/mariland/src/test/PisoCard.test.tsx`: añadir `imagen_url: null` al objeto `basePiso`
- [x] `frontend/mariland/src/test/usePisos.test.ts`: añadir `imagen_url: null` al objeto `basePiso`

**3.2 — Nuevos tests en `PisoCard.test.tsx`**

- [x] Test `renders image banner when imagen_url is set`: verifica que se renderiza `<img>` con el `src` correcto
- [x] Test `does not render image banner when imagen_url is null`: verifica que no aparece `<img>`
- [x] Test `clicking image banner opens image modal`: clic en la imagen → aparece el modal (`role="dialog"`)

**3.3 — Tests para `ImagenModal` (nuevo `src/test/ImagenModal.test.tsx`)**

- [x] Test `renders the image in full size`: verifica `<img>` con el `src` correcto
- [x] Test `calls onClose when pressing Escape`
- [x] Test `calls onClose when clicking overlay`

**3.4 — Ejecutar tests para confirmar que fallan**

- [x] `make test-frontend APP=mariland` → fallaron como esperado (2 failed)

---

## Fase 4: Implementación frontend

**4.1 — Tipos TypeScript (`frontend/mariland/src/types/piso.ts`)**

- [x] Añadir `imagen_url: string | null` a `Piso`
- [x] Añadir `imagen_url?: string | null` a `PisoCreate` / `PisoUpdate`

**4.2 — Nuevo componente `ImagenModal.tsx`**

- [x] Crear `frontend/mariland/src/components/ImagenModal.tsx`

**4.3 — Actualizar `PisoCard.tsx`**

- [x] Añadir import de `ImagenModal` y `useState`
- [x] Añadir estado y banner de imagen con `-mx-5 -mt-5`
- [x] Renderizar modal al final del JSX

**4.4 — Actualizar `PisoForm.tsx`**

- [x] Añadir `imagen_url` a `FormState`, inicialización y submit
- [x] Añadir campo de input `type="url"` después del campo "URL del anuncio"

**4.5 — Ejecutar tests frontend**

- [x] `make test-frontend APP=mariland` → 31 passed

---

## Fase 5: Formatters, linters y typecheck

- [x] `make format APP=mariland` → 6 reformatted
- [x] `make lint APP=mariland` → all checks passed
- [x] `make typecheck APP=mariland` → no issues found
- [x] `make lint-frontend APP=mariland` → no warnings

---

## Fase 6: Verificación final

- [ ] `make test APP=mariland` → todos los tests backend
- [ ] `make test-frontend APP=mariland` → todos los tests frontend

---

## Fase 7: Commit y PR

- [ ] Verificar usuario git: `git config user.name` → `marcslopz`
- [ ] Stagear archivos específicos
- [ ] Commit con `Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>`
- [ ] Push: `git push -u origin feature/mariland-imagen-thumbnail`
- [ ] Crear PR con `gh pr create`
