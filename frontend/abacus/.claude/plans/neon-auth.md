# Plan: Add Auth to Abacus using Neon Auth (Issue #14)

Rama: `feature/issue-14-neon-auth`

## Context

Abacus tiene todo el código de auth preparado para JWT/JWKS (backend) pero con bypass de desarrollo. El frontend tiene un botón de Google OAuth deshabilitado y un "Dev Login" placeholder. Hay que integrar **Neon Auth** (basado en Better Auth) para activar Google OAuth real, tanto en frontend como en producción.

El backend **no necesita cambios de código** significativos — solo env vars y un ajuste menor en la validación del audience. El grueso del trabajo es en el frontend.

## Fase 0: Setup externo (manual, sin código)

- [x] **Neon Console**: activar Auth en el proyecto Neon → obtener el **Auth Base URL**
- [x] **Google Cloud Console**: crear OAuth 2.0 Client ID
  - Configurar OAuth consent screen (app "Abacus")
  - Authorized redirect URI: la que indique Neon Auth (callback URL)
  - Anotar Client ID y Client Secret
- [x] **Neon Console**: configurar Google como OAuth provider con las credenciales de Google

## Fase 1: Frontend — integrar Neon Auth SDK

### 1.1 Instalar SDK
- [x] Añadir `@neondatabase/neon-js` a `frontend/abacus/package.json`

### 1.2 Crear módulo auth client
- [x] **Nuevo archivo**: `frontend/abacus/src/auth/neonAuth.ts`
  - Exporta `authClient = createAuthClient(VITE_NEON_AUTH_URL)` con tipo manual `NeonAuthClient`
  - Solo activo cuando `VITE_NEON_AUTH_URL` está definida

### 1.3 Reescribir `AuthContext.tsx`
- [x] **Archivo**: `frontend/abacus/src/auth/AuthContext.tsx`
  - Dual-mode: `NeonAuthProvider` (prod) vs `DevAuthProvider` (local)
  - On mount: `authClient.getSession()` → `getJWTToken()` → `localStorage('abacus_token')`
  - `signInWithGoogle`: `authClient.signIn.social({ provider: 'google', callbackURL: origin })`
  - `logout`: `authClient.signOut()` + limpia localStorage

### 1.4 Actualizar `LoginScreen.tsx`
- [x] **Archivo**: `frontend/abacus/src/components/LoginScreen.tsx`
  - Botón Google habilitado, spinner mientras `loading`, sin texto "próximamente"
  - Dev Login solo visible cuando `DEV && !IS_NEON`

### 1.5 `client.ts` — 401 retry
- [x] **Archivo**: `frontend/abacus/src/api/client.ts`
  - Si recibe 401 + authClient activo → `getJWTToken()` → actualiza localStorage → reintenta

## Fase 2: Backend — ajuste menor

### 2.1 Hacer audience condicional en `jwks.py`
- [x] **Archivo**: `backend/abacus/src/abacus/infrastructure/auth/jwks.py`
  - `audience` condicional: si vacío → `options={"verify_aud": False}`

## Fase 3: Environment variables

### 3.1 `.env.example`
- [x] Añadir `VITE_NEON_AUTH_URL=` en la sección Abacus

### 3.2 Producción (manual)
- [x] **Cloudflare Pages**: `VITE_NEON_AUTH_URL=https://ep-proud-bar-agzyxlwq.neonauth.c-2.eu-central-1.aws.neon.tech/demo/auth`
- [x] **Render**: `ABACUS_JWKS_URL=.../demo/auth/.well-known/jwks.json`, `ABACUS_JWT_AUDIENCE=https://ep-proud-bar-agzyxlwq.neonauth.c-2.eu-central-1.aws.neon.tech`

## Fase 4: Tests

- [x] 11/11 tests backend pasando con `make test APP=abacus`

## Fase 5: Docs

- [x] Actualizar `.ai/infra.md` — marcar auth como activo, documentar env vars finales
- [x] Actualizar `.ai/environments.md` — añadir `VITE_NEON_AUTH_URL`

## Notas técnicas

- **Neon Auth** está basado en Better Auth (no Stack Auth — ese es legacy)
- **`getJWTToken`**: existe en runtime pero no en los tipos beta → tipo manual `NeonAuthClient` con cast `unknown`
- **BetterAuthReactAdapter descartado**: sus tipos ocultan `getJWTToken` y `signIn`; se usa cliente vanilla
- **Audience**: `ABACUS_JWT_AUDIENCE` vacío → `verify_aud: False` en `jwks.py`; rellenar tras verificar JWT real
- **Dev mode**: `VITE_NEON_AUTH_URL` vacía → dev bypass activo, sin cambios en flujo local
