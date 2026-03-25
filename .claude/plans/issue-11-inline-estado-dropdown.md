# Issue #11: Edicion de estado del piso sin modal

## Context

Actualmente, para cambiar el estado de un piso (candidato, contactado, agendado, etc.) hay que abrir el modal completo de edicion. Como el estado se cambia frecuentemente, esto es tedioso. La mejora consiste en hacer el badge de estado clickable directamente en la PisoCard, mostrando un dropdown para cambiar el estado con un solo click.

## Cambios necesarios

Es un cambio **solo de frontend**. El backend ya soporta actualizar solo el campo `estado` via `PUT /pisos/{piso_id}` con `{ estado: "nuevo_valor" }`.

### Archivos a modificar

1. **`frontend/mariland/src/components/PisoCard.tsx`**
   - Reemplazar el `<span>` estatico del estado (linea 80-82) por un nuevo componente `EstadoDropdown`
   - Pasar `piso.id`, `piso.estado` y un callback `onEstadoChange` como props

2. **`frontend/mariland/src/components/EstadoDropdown.tsx`** (nuevo)
   - Componente que muestra el badge actual del estado (mismos colores de `ESTADO_COLORS`)
   - Al hacer click, abre un dropdown con todas las opciones de estado
   - Al seleccionar una opcion, llama al callback `onEstadoChange(id, nuevoEstado)`
   - Cierra el dropdown al seleccionar o al hacer click fuera (click-outside)
   - Muestra estado de loading (spinner o opacidad reducida) mientras se guarda
   - Reutilizar `ESTADO_COLORS` (moverlo o exportarlo)

3. **`frontend/mariland/src/App.tsx`**
   - Pasar un nuevo callback `onEstadoChange` a cada `PisoCard` que llame a `updatePiso(id, { estado })`

### Detalles de implementacion

- **`ESTADO_COLORS`** y **`ESTADOS`**: Extraer las constantes a un archivo compartido o exportarlas desde `PisoCard.tsx` para reutilizar en el dropdown (actualmente `ESTADOS` esta duplicada en `PisoForm.tsx` y `Filters.tsx`)
- **Dropdown**: Usar `position: absolute` con `z-index` alto para que no quede cortado por la card. Usar un `useRef` + event listener para cerrar al click fuera
- **Feedback visual**: El badge actual se marca como "seleccionado" en el dropdown. Mientras se guarda, mostrar opacidad reducida o un spinner pequeno
- **Accesibilidad**: El dropdown debe poder cerrarse con Escape

## Pasos de implementacion

- [x] 1. Crear constantes compartidas `ESTADOS` y `ESTADO_COLORS` (extraer de PisoCard)
- [x] 2. Crear tests para el componente `EstadoDropdown`
- [x] 3. Crear componente `EstadoDropdown`
- [x] 4. Integrar `EstadoDropdown` en `PisoCard` (reemplazar badge estatico)
- [x] 5. Pasar callback `onEstadoChange` desde `App.tsx` a `PisoCard`
- [x] 6. Ejecutar linters y tests
- [x] 7. Verificar manualmente en el navegador

## Verificacion

1. `make lint APP=mariland` — linters pasan
2. `make test APP=mariland` — tests pasan (si hay tests frontend configurados)
3. Verificacion manual: abrir la app, hacer click en el badge de estado de una card, seleccionar otro estado, verificar que se guarda y la card se actualiza
