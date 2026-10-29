# ADR 001 — Arquitectura vigente y stack

## Estado
Aceptado. Última revisión documental: 2026-10-29.

## Contexto
Paraglide necesita mantener separadas la experiencia web, las reglas de negocio y las integraciones, a la vez que comparte contratos entre sus clientes. El repositorio ya contiene aplicaciones web, API y MCP, además de un paquete común; la documentación debe describir esa estructura real.

## Decisión
- Mantener un monorepo con **npm workspaces**.
- `apps/web` contiene la aplicación web. El flujo principal de desarrollo y compilación usa **Vite, React 19, React Router 7 y Tailwind CSS 4**. Se conservan archivos y comandos compatibles con Next.js para las rutas que aún los requieren; no sustituyen al flujo principal.
- `apps/api` expone la API REST bajo `/api/*` con **Fastify 5, TypeScript, Prisma 6 y PostgreSQL 18.4**. Las reglas de dominio y el acceso a datos se resuelven en la API.
- `apps/mcp` ofrece herramientas para clientes de agentes a través de la API, sin acceso directo a la base de datos.
- `packages/shared` publica DTO, esquemas Zod, enumeraciones y contratos TypeScript consumidos por las aplicaciones. Se compila antes de los paquetes que lo usan.
- La web consulta y modifica datos mediante el cliente de API y TanStack Query; los cambios entre clientes se propagan mediante SSE según ADR 004.

## Dominio y convenciones transversales
- El modelo operativo central incluye `Piloto`, `Pasajero`, `Vuelo` y `Reserva`; pagos parciales o totales se registran en `Pago`. La programación usa bloques de horario, excepciones por fecha y disponibilidad de piloto.
- Los modelos y DTO compartidos se definen en `packages/shared`; no se mantienen copias independientes de esos tipos en cada aplicación.
- Las respuestas y errores de API se traducen a estados de interfaz; los componentes no usan `alert()` del navegador como manejo de errores.
- Los modelos cubiertos por borrado lógico y sus excepciones se rigen por ADR 006. La concurrencia y los montos se rigen por ADR 004 y ADR 008.

## Consecuencias
- Un solo grafo de dependencias facilita compartir tipos y ejecutar validaciones coherentes.
- Una instalación de dependencias administra todos los workspaces; las aplicaciones conservan scripts de desarrollo y compilación propios.
- Cambios de contrato deben mantenerse alineados entre `packages/shared`, `apps/api` y sus consumidores.
- Las modificaciones del flujo web principal se verifican con Vite; los cambios a la compatibilidad Next.js se prueban en el flujo correspondiente.

## Alternativas consideradas
- **Repositorios separados:** descartados porque duplican contratos y elevan el costo de mantener versiones compatibles.
- **pnpm/Turborepo/Nx:** no adoptados para el tamaño actual; npm workspaces cubre instalación y composición. Se puede reevaluar la caché de builds si el costo de compilación lo justifica.
- **GraphQL:** descartado; los recursos y filtros actuales se cubren con la API REST.

## Referencias
- `package.json` y los `package.json` de cada workspace.
- `apps/web/vite.config.ts`, `apps/api/src/app.ts`, `apps/mcp/` y `packages/shared/`.
- [ADR 004 — concurrencia y eventos](004-sincronizacion-multicliente.md).
- [ADR 005 — datos y cliente API](005-rendimiento-datos.md).
- [ADR 006 — borrado lógico y enums](006-soft-delete-enums.md).
- [ADR 008 — dinero decimal](008-dinero-decimal.md).
