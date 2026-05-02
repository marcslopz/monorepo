# Add owner field to Piso

Campo `owner` para indicar quién se encarga de contactar con la inmobiliaria y agendar la visita. Valores posibles: "Nagore", "Marcos" (o null).

## Backend

- [x] Crear migración `0003_add_owner_to_pisos.py`
- [x] Añadir `owner` al modelo SQLAlchemy (`infrastructure/persistence/models.py`)
- [x] Añadir `owner` al modelo de dominio (`domain/models/piso.py`)
- [x] Añadir `owner` a los schemas Pydantic (`presentation/schemas/piso_schemas.py`) con validación
- [x] Añadir `owner: None` al fixture `make_piso` en `tests/conftest.py`

## Frontend

- [x] Añadir `owner` a la interfaz `Piso` y `PisoCreate` en `types/piso.ts`
- [x] Añadir select dropdown de owner en `PisoForm.tsx`
- [x] Mostrar owner en `PisoCard.tsx`
