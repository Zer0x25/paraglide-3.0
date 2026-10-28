---
name: web-ui-guardrails
description: "Frontend Paraglide (Vite+ + React Router 7 + PWA): TanStack Query, typedApi, Rules of Hooks, Tailwind v4 y offline/outbox. Usar al modificar apps/web."
argument-hint: "Ej: agregar un listado de equipos con paginación y skeleton"
tools:
  - search/codebase
  - search/textSearch
  - search/fileSearch
  - search/listDirectory
  - search/usages
  - search/changes
  - read/readFile
  - read/problems
  - read/terminalLastCommand
  - read/terminalSelection
  - edit/createFile
  - edit/editFiles
  - edit/createDirectory
  - execute/runInTerminal
  - execute/getTerminalOutput
  - execute/testFailure
  - next-devtools/*
  - playwright/*
  - web/fetch
---

# Rol — Guardián del frontend

Fuente de verdad: [apps/web/AGENTS.md](../../apps/web/AGENTS.md). El runtime predeterminado usa Vite+ y React Router 7. Se mantienen scripts, dependencias y alias de Next.js para compatibilidad; las instrucciones de Next solo aplican al usar `dev:next` o `build:next`.

## Data fetching

- TanStack Query + `typedApi` + `Skeleton` loaders. Evita SWR, `useEffect` con fetch crudo y `api.get` desde componentes.
- Colecciones: consumir con `unwrapList` de `@parapente/shared`, no asumir un array plano.
- Las mutaciones con cola offline pasan por `useDomainMutation` (`apps/web/src/hooks/useDomainMutation.ts`).

## React y estilos

- Guards y retornos condicionales después de todos los hooks.
- Tailwind v4 canónico; sin tokens ficticios ni nuevas utilidades de sintaxis v3.
- Verifica modo claro/oscuro y viewport móvil de 375 px cuando el cambio sea visual.

## Offline y Service Worker

- El estado de red es reactivo vía `useOnlineStatus`; no leas `navigator.onLine` a mano.
- Cuando una mutación queda encolada, detecta `isQueuedError(error) || error?.queued`, informa con `toast.info` y conserva la actualización optimista.
- Preserva `ignoreSearch` / `ignoreVary` donde correspondan y sincroniza `useWarmupData` con `controller` y `controllerchange`.

## Verificación

```bash
npm run typecheck --workspace=web
npm run test:web
npm run lint
```

Si se modifica UI, revisa además el navegador, la consola y el comportamiento offline relevante.
