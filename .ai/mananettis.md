# mananettis

Apuntador de ensayos para la clase de teatro (≤10 personas): lee en voz alta (Web Speech) las réplicas
ajenas y pita y pausa en las tuyas. Producción: https://mananettis.pages.dev (Cloudflare Pages).
HTML + JS sin build; sin backend propio (solo una Pages Function).

## Cómo está montado
- **Guiones** = `plays/<slug>.json` (`lines` con id estable `l0001…`, `characters`, `cast`
  actor→personajes, `revisions`) + `plays/index.json` (lista; `hidden: true` → solo con `?all=1`).
  Nuevos desde docx: `make import APP=mananettis FILE=plays/sources/<x>.docx` (los docx no se commitean).
- **Correcciones de los actores** = parches (`edit | delete | reassign | insert`) aplicados encima del
  JSON (`applyPatches` en `lib.js`). Se comparten vía `functions/api/patches*.js` (GET, POST, `/undo`,
  `/redo`) sobre **D1** (binding `DB` en el panel de Pages: D1 `mananettis` en producción,
  `mananettis-preview` en previews). localStorage = caché y bandeja de salida sin conexión.
- **Histórico**: en D1 nada se borra; deshacer/rehacer/consolidar solo marcan filas (quién, cuándo,
  dispositivo). Tras consolidar, el histórico del guion es git; `revisions` del JSON lista los ids de
  parche que ya contiene (la app los ignora si el servidor aún los sirve).

## Consolidar las correcciones de una obra
1. `make consolidate APP=mananettis PLAY=<slug>` (en una rama; lee la API pública, sin token).
   Reescribe `plays/<slug>.json` e imprime el mensaje de commit (una línea por corrección).
   Ojo: `make` imprime también la línea `docker run …`; quitarla del mensaje.
2. Revisar el diff → commit con ese mensaje → PR → merge.
3. Esperar a que producción sirva el JSON nuevo (`curl -s https://mananettis.pages.dev/plays/<slug>.json
   | grep revisions`, ~1–2 min).
4. Desde `main` actualizado: `make d1-clear APP=mananettis PLAY=<slug>` → marca como consolidados solo
   los ids de `revisions` (una corrección llegada entre 1 y 4 se conserva). Se niega si no estás en
   `main` o el JSON difiere de `origin/main`.

Reaplicar parches sobre el JSON ya consolidado es inocuo, así que no hay ventana de riesgo.

## Deshacer en bloque (troles, errores)
`make rollback APP=mananettis PLAY=<slug> SINCE=<fecha ISO, UTC> [AUTHOR=<actor>] [DEVICE=<id>]` lista lo
que deshará; repetir con `CONFIRM=1` para aplicarlo. Reversible: se rehace desde la lista de
Correcciones de la app. Tras consolidar, volver atrás = `git revert` del commit de consolidación.

## Credenciales (solo `d1-clear` y `rollback`)
`frontend/mananettis/.env` (ignorado; plantilla `.env.example`) o exportadas en el shell (ganan):
`CLOUDFLARE_API_TOKEN` (token con *Account → D1 → Edit*) y `CLOUDFLARE_ACCOUNT_ID`.
`DB=mananettis-preview` para probar contra la D1 de previews.

## Desarrollo
`make dev APP=mananettis` (wrangler + D1 local en :5176) · `make test APP=mananettis` (JS + importador).
