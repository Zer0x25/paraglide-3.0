<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

> **Runtime principal:** los scripts `dev` y `build` de este workspace usan Vite+ con React Router 7. El bloque generado de Next.js anterior aplica solo al uso heredado de `dev:next` / `build:next`; no tratar App Router como la ruta predeterminada.

# AGENTS.md — apps/web

Vite+ + React 19 + React Router 7 + Tailwind v4 + PWA + TanStack Query. Se mantienen alias y dependencias Next para compatibilidad heredada.

## Guardrails de Frontend

| Dominio | Regla | Evitar |
| :--- | :--- | :--- |
| **Data fetching** | TanStack Query (`@tanstack/react-query`) + `typedApiOutbox` + `Skeleton` loaders | SWR o llamadas en `useEffect`; estados iniciales `null` que muestren ceros transitorios |
| **Concurrencia** | Manejar `version` con `isConflictError` y `409`; reutilizar la versión devuelta por la API | Mutaciones ciegas o reutilizar versiones locales obsoletas |
| **Tests E2E** | Mockear la API con el catch-all de [`tests/helpers/api-mocks.ts`](tests/helpers/api-mocks.ts) (`mockAppShellApi`) | JWT falso con llamadas `/api/` reales; un 401 puede redirigir el navegador a `/login` |
| **Mutaciones Outbox** | Detectar `isQueuedError(error) || error?.queued`, informar con `toast.info` y mantener actualización optimista | Tratar una mutación encolada como error fatal o revertirla como fallo de red |
| **Service Worker** | Mantener `useWarmupData` sincronizado con `controller` y `controllerchange` | Confiar solo en `navigator.serviceWorker.ready` |
| **Workbox** | Preservar las reglas actuales de caché, incluido `ignoreSearch` / `ignoreVary` donde corresponda | Cambiar estrategias de caché offline sin revisar tests y comportamiento de PWA |
| **Fechas** | Normalizar con `dateKeyLocal` / `getDateKey` | `new Date().toISOString().slice(0, 10)` para fechas civiles locales |
| **Tailwind v4** | Usar clases canónicas (`border-slate-200 dark:border-slate-700`, `bg-linear-to-*`) | Tokens ficticios o utilidades v3 nuevas |
| **Rutas públicas** | Usar `tokenPublico` / `shortId` y registrar la ruta en `publicPaths` | IDs numéricos correlativos o bloquear rutas públicas por error |

Los guards y retornos condicionales deben ir después de todos los hooks de React.

## Referencias y checks

- [Sistema de diseño](../../docs/design-system.md).
- [ADR 009 — offline y conflictos](../../docs/adr/009-offline-first-conflictos.md).
- [ADR 005 — datos, rendimiento y cliente API](../../docs/adr/005-rendimiento-datos.md).
- `npm run test:web`, `npm run typecheck --workspace=web` y `npm run lint`.
- Si se modifica UI, revisar claro/oscuro, viewport móvil de 375 px y consola del navegador.
