# Aplicación Web de Paraglide

## Runtime actual

La ruta predeterminada de desarrollo y build usa **Vite+** (`vp dev` / `vp build`), React 19, React Router 7, Tailwind CSS v4 y `vite-plugin-pwa`. La configuración de Vite está en `vite.config.ts` y el build estático se genera en `dist/`.

Los scripts `dev:next` y `build:next`, las dependencias de Next y los alias `next/link` / `next/navigation` se conservan como compatibilidad heredada. No describen el runtime principal ni deben eliminarse sin revisar sus consumidores.

## Desarrollo y verificación

Desde la raíz del monorepo:

```bash
npm run dev:web
npm run test:web
npm run typecheck --workspace=web
npm run lint
```

`npm run dev` inicia Web y API en paralelo. La Web usa `:3000`; la API local usa `:3001`.

## API y publicación

En desarrollo, Vite proxyfica `/api` a `INTERNAL_API_URL`, cuyo valor predeterminado es `http://127.0.0.1:3001`. En el contenedor, `server.mjs` sirve `dist/`, aplica fallback SPA a `index.html` y proxyfica `/api/*` al servicio API; el destino predeterminado es `http://api:3001`.

La configuración conserva `NEXT_PUBLIC_API_URL` para módulos de compatibilidad. No poner secretos en variables `NEXT_PUBLIC_*`: son valores que pueden terminar en el bundle del navegador.

Para construir y ejecutar el servidor estático del workspace:

```bash
npm run build:web
npm run start --workspace=web
```

La configuración de desarrollo local, base de datos y flujo de RC está en el [README principal](../../README.md) y en [CI/CD](../../docs/ci-cd.md). Los guardrails de UI están en [AGENTS.md](AGENTS.md); los tokens visuales, en [docs/design-system.md](../../docs/design-system.md).
