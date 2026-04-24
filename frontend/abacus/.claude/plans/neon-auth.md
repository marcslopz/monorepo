# Plan: Add Auth to Abacus using Neon Auth (Issue #14)

Rama: `feature/issue-14-neon-auth`

## Context

Abacus tiene todo el código de auth preparado para JWT/JWKS (backend) pero con bypass de desarrollo. El frontend tiene un botón de Google OAuth deshabilitado y un "Dev Login" placeholder. Hay que integrar **Neon Auth** (basado en Better Auth) para activar Google OAuth real, tanto en frontend como en producción.

El backend **no necesita cambios de código** significativos — solo env vars y un ajuste menor en la validación del audience. El grueso del trabajo es en el frontend.

## Fase 0: Setup externo (manual, sin código)

- [ ] **Neon Console**: activar Auth en el proyecto Neon → obtener el **Auth Base URL** (ej: `https://ep-xxx.neonauth.us-east-2.aws.neon.build/neondb/auth`)
- [ ] **Google Cloud Console**: crear OAuth 2.0 Client ID
  - Configurar OAuth consent screen (app "Abacus")
  - Authorized redirect URI: la que indique Neon Auth (callback URL)
  - Anotar Client ID y Client Secret
- [ ] **Neon Console**: configurar Google como OAuth provider con las credenciales de Google

## Fase 1: Frontend — integrar Neon Auth SDK

### 1.1 Instalar SDK
- [ ] Añadir `@neondatabase/neon-js` a `frontend/abacus/package.json`

### 1.2 Crear módulo auth client
- [ ] **Nuevo archivo**: `frontend/abacus/src/auth/neonAuth.ts`
  - Exporta `authClient = createAuthClient(import.meta.env.VITE_NEON_AUTH_URL)`
  - Solo se usa cuando `VITE_NEON_AUTH_URL` está definida

### 1.3 Reescribir `AuthContext.tsx`
- [ ] **Archivo**: `frontend/abacus/src/auth/AuthContext.tsx`
  - Dual-mode: si `VITE_NEON_AUTH_URL` existe → usa Neon Auth; si no → dev bypass actual
  - Nueva interfaz: `isAuthenticated`, `token`, `loading`, `signInWithGoogle`, `devLogin`, `logout`
  - On mount: si Neon Auth activo → `authClient.getSession()` → guardar token en localStorage `abacus_token`
  - `signInWithGoogle`: llama `authClient.signIn.social({ provider: 'google', callbackURL: window.location.origin })`
  - `logout`: llama `authClient.signOut()` + limpia localStorage
  - **Clave**: el token JWT se guarda en `localStorage('abacus_token')` → `client.ts` no necesita cambios

### 1.4 Actualizar `LoginScreen.tsx`
- [ ] **Archivo**: `frontend/abacus/src/components/LoginScreen.tsx`
  - Habilitar botón Google: `onClick={signInWithGoogle}`, quitar `disabled` y `opacity-50`
  - Mostrar spinner mientras `loading` es true
  - Eliminar texto "Google OAuth se activará próximamente con Neon Auth"
  - Dev Login solo visible cuando `import.meta.env.DEV && !import.meta.env.VITE_NEON_AUTH_URL`

### 1.5 `client.ts` — 401 retry
- [ ] **Archivo**: `frontend/abacus/src/api/client.ts`
  - Si recibe 401, intentar `authClient.getSession()` para refrescar token, actualizar localStorage y reintentar una vez

## Fase 2: Backend — ajuste menor

### 2.1 Hacer audience condicional en `jwks.py`
- [ ] **Archivo**: `backend/abacus/src/abacus/infrastructure/auth/jwks.py` (línea 30-34)
  - Si `self._audience` está vacío, no pasar `audience` a `jwt.decode()` y añadir `options={"verify_aud": False}`

## Fase 3: Environment variables

### 3.1 `.env.example`
- [ ] Añadir `VITE_NEON_AUTH_URL=` en la sección Abacus

### 3.2 Producción (manual — después de Fase 0)
- [ ] **Cloudflare Pages**: `VITE_NEON_AUTH_URL=<auth-base-url>`
- [ ] **Render**: `ABACUS_JWKS_URL=<auth-base-url>/.well-known/jwks.json`, `ABACUS_JWT_AUDIENCE=<verificar del JWT>`

## Fase 4: Tests

- [ ] Verificar que los 11 tests existentes siguen pasando con `make test APP=abacus`

## Fase 5: Docs

- [ ] Actualizar `.ai/infra.md` — marcar auth como activo, documentar env vars finales
- [ ] Actualizar `.ai/environments.md` — añadir `VITE_NEON_AUTH_URL`

## Notas técnicas

- **Neon Auth** está basado en Better Auth (no Stack Auth — ese es legacy)
- **Audience**: Better Auth puede no incluir claim `aud` → hacerlo condicional en `jwks.py`
- **sub claim**: Better Auth usa UUIDs → `uuid.UUID(payload["sub"])` debería funcionar
- **Dev mode**: cuando `VITE_NEON_AUTH_URL` está vacía → dev bypass activo (sin cambios en flujo local)
- **Token storage**: guardar JWT en `localStorage('abacus_token')` → `client.ts` no necesita cambios
