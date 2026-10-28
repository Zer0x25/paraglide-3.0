# Guía para agentes y colaboradores — Paraglide

Paraglide es un monorepo de reservas y operaciones para una escuela de parapente.

## Arquitectura actual

- `apps/web`: aplicación React 19 y PWA. El flujo predeterminado usa Vite+ (`vp dev` / `vp build`), React Router 7 y `vite-plugin-pwa`.
- `apps/api`: API Fastify 5, Prisma y PostgreSQL.
- `apps/mcp`: servidor MCP que consume la API con rol de servicio `RECEPCION`.
- `packages/shared`: contratos, DTOs, esquemas Zod y utilidades compartidas.

La web conserva dependencias, alias y scripts de compatibilidad con Next.js. No asumir que Next/App Router es el runtime principal ni retirar esa compatibilidad sin revisar sus usos.

## Entorno y seguridad de datos

- Las variables locales se cargan desde `.env` en la raíz o desde el workspace correspondiente. No versionar `.env`, credenciales ni configuración local de agentes.
- Puertos DB: desarrollo `5679`, staging `5680`, producción `5678`.
- **No ejecutar pruebas, resets ni scripts destructivos contra `5678`**. Las pruebas de integración locales deben apuntar a la DB de desarrollo en `5679`.
- No ejecutar suites `test:prod*`, cambios de despliegue ni `staging:down:volumes` sin autorización explícita.
- Emitir eventos SSE y notificaciones solo después de que la transacción de base de datos haya confirmado.

## Gobernanza y autorización de agentes

- El usuario conserva la autoridad final sobre alcance, prioridades, arquitectura y decisiones de producto. Los agentes pueden analizar y proponer; no convierten inferencias, silencio ni decisiones pendientes en aprobaciones.
- La autorización es explícita, específica para la acción y válida solo para la tarea actual. No se hereda de sesiones, tareas ni aprobaciones anteriores.
- No hacer `commit`, `push`, `merge`, crear tags o releases, desplegar, ni cambiar settings, reglas o secretos de GitHub sin una solicitud explícita del usuario para esa acción en la tarea actual. Modificar archivos o pedir una revisión no autoriza publicar.
- Integrar cambios a `main` mediante PR; no hacer push directo a `main`. Antes de publicar, comprobar rama, diff, checks y protección vigente; no modificar la configuración remota salvo solicitud expresa.
- Conservar cambios ajenos a la tarea. Antes de editar, revisar el estado del árbol; antes de cerrar, revisar el diff y reportar verificaciones y límites pendientes. No descartar trabajo del usuario para dejar el árbol limpio.
- Los hooks son defensa en profundidad, no sustituyen permisos ni aislamiento. Verificar que el runtime los cargó y confió antes de depender de ellos. La prohibición de conectarse, escribir, migrar, resetear o seedear la DB de producción en `:5678` es absoluta y prevalece aunque un hook permita el comando.

## Invariantes del dominio

- Dinero: conservar `Decimal(12,2)` en persistencia y normalizar mediante `toNum()` donde corresponda; no aplicar aritmética JS directamente sobre objetos `Decimal`.
- Concurrencia: respetar `version` en mutaciones concurrentes y responder `409 Conflict` ante conflictos.
- Borrado lógico: respetar `deletedAt: null` y las extensiones Prisma; no omitirlas con SQL crudo.
- Fechas operativas: usar `dateKeyLocal` / `getDateKey` y la zona local del proyecto; no derivar fechas civiles con `toISOString().slice(0, 10)`.
- Listados de API: mantener el sobre `{ data, pagination }`; en Web usar `unwrapList` de `@parapente/shared`.
- Rutas públicas: usar identificadores no secuenciales (`tokenPublico` / `shortId`) y registrarlas en `publicPaths`.
- Web: usar TanStack Query y el cliente tipado; respetar Rules of Hooks, el manejo de outbox y las reglas actuales de Workbox.

## Comandos útiles

- `npm run dev`: Web y API locales.
- `npm run check:quick`: build de shared, typecheck y tests unitarios de los workspaces.
- `npm run check`: tests y build completos.
- `npm run test:api:integration`: integración contra la DB de desarrollo; confirma el destino antes de ejecutarla.
- `npm run build:shared`: después de cambiar `packages/shared`.
- `npx prisma generate`: después de cambiar `apps/api/prisma/schema.prisma`.
- `npm run format`: formateo incremental de archivos de código que Git detecta como cambiados; Markdown queda fuera.

## Referencias

- Reglas específicas: [`apps/api/AGENTS.md`](apps/api/AGENTS.md) y [`apps/web/AGENTS.md`](apps/web/AGENTS.md).
- Decisiones técnicas: [`docs/adr/README.md`](docs/adr/README.md).
- CI, RC y staging: [`docs/ci-cd.md`](docs/ci-cd.md).
- Diseño Web: [`docs/design-system.md`](docs/design-system.md).
- Skills disponibles: [debug-flujo](.agents/skills/debug-flujo/SKILL.md) y [agente-autonomo](.agents/skills/agente-autonomo/SKILL.md).
