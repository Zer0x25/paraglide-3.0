# ADR 005 — Datos, rendimiento y cliente API

## Estado
Aceptado e implementado parcialmente en los alcances descritos. Última revisión documental: 2026-10-29.

## Contexto
Los listados sin límites ni filtros trasladan históricos completos, elevan memoria y latencia, y dificultan mantener alineados API y clientes. Las consultas deben acotarse donde se ejecutan y exponer una respuesta estable para la web y MCP.

## Decisión
### Contrato de colecciones
- Toda respuesta de colección usa este envelope; los endpoints singleton y las mutaciones conservan sus contratos propios:

  ```json
  { "data": [], "pagination": { "page": 1, "pageSize": 100, "total": 0, "totalPages": 0, "hasMore": false, "nextPage": null, "nextCursor": null } }
  ```

- Los parámetros comunes son `page` (1-based, predeterminado 1), `pageSize` (predeterminado 100, máximo 500) y `sort` opcional con whitelist por recurso.
- El envelope conserva `nextPage` para páginas por offset y `nextCursor` (nulo cuando no hay más resultados). En auditoría, la primera página offset ya entrega el cursor del último registro para continuar desde la siguiente página con keyset estable ante escrituras concurrentes.
- Los filtros, rangos de fecha, orden y límites se aplican en la API/SQL. Los listados usan `listar()` o un equivalente especializado y toda llamada Prisma `findMany` queda acotada con `take`.
- Las vistas temporales, especialmente calendario, consultan el rango visible y piden solo la proyección que necesitan.
- La auditoría usa paginación keyset por `id` descendente. La primera respuesta también entrega `nextCursor`; el cursor se usa en las siguientes páginas. Actualmente el servicio también calcula `total`, por lo que el keyset evita recorrer páginas mediante offset, pero no elimina el costo del conteo.
- Las vistas públicas identifican recursos con `tokenPublico` o `shortId`, no con identificadores secuenciales.

### Filtros por recurso

| Recurso | Filtros y límites de consulta |
|---|---|
| `vuelos` | `desde`, `hasta` sobre `fechaHora`, `estado` y `campos=vista-calendario`; la grilla consulta su rango visible. |
| `reservas` | búsqueda `q` sobre nombre/RUT del titular, email, teléfono, número de reserva y nombre/RUT de pasajeros; `estado` de pago y `desde`/`hasta` sobre `fechaReserva`. |
| `pilotos` | `q` sobre nombre, email o teléfono y filtro `activo`. |
| `pasajeros` | `q` sobre nombre. |
| `equipos` | `tipo` y `estado`. |
| `gastos` | `desde` y `hasta`. |
| `auditoria` | entidad, acción, búsqueda y `cursor` keyset por `id` descendente. |

### Acceso desde la web
- TanStack Query es la capa de caché, consulta, mutación e invalidación selectiva; las `queryKey` son estables y describen los filtros de la consulta.
- Se usa `useInfiniteQuery` para reservas y auditoría, invalidación por prefijo de `queryKey` para eventos SSE y el ciclo de mutación/rollback optimista de TanStack Query. Los listados nuevos no hacen fetch crudo en `useEffect` con estado local.
- La auditoría y las reservas cargan páginas bajo demanda; el feed de auditoría usa virtualización. Las demás colecciones siguen como consultas acotadas de hasta 500 filas.
- La consulta de calendario se limita al mes visible y usa `campos=vista-calendario`; reservas aplica rangos de fechas, estado de pago y búsqueda con debounce en el servidor. Filtros de cliente quedan para atributos derivados de datos anidados que no se puedan resolver en SQL.
- Las agregaciones de dashboard y analíticas se calculan en el servidor mediante `groupBy`, `aggregate` o SQL cuando corresponde.
- Los hooks de datos consumen el cliente común en `apps/web/src/services/api.ts`. El contrato TypeScript compartido está en `packages/shared/src/api.routes.ts`; es una definición estática mantenida en código, no un cliente generado desde OpenAPI ni validación runtime automática de toda respuesta.
- `unwrapList()` se conserva para compatibilidad con respuestas antiguas y pruebas; los consumidores nuevos trabajan con el envelope.
- Los filtros ejecutables en SQL pertenecen al servidor. El cliente puede filtrar una lista acotada solo cuando el criterio depende de datos ya cargados y no tiene una traducción útil al servidor.

## Alcance actual
- Vuelos se acota por fecha y puede pedir la proyección del calendario.
- Reservas, pilotos, pasajeros, equipos y gastos tienen límites y filtros de API según el recurso.
- Auditoría ofrece búsqueda, filtros y cursor keyset.
- Reservas y auditoría usan carga progresiva; otras colecciones permanecen como consultas acotadas de hasta 500 filas.
- El contrato TypeScript compartido aún contiene campos `any` y algunas rutas usan adaptadores propios; los tipos mejoran la detección durante compilación, pero no equivalen a validación runtime completa.

## Consecuencias
- El crecimiento de los datos no obliga a cargar el histórico completo en cada pantalla.
- API, web y MCP comparten el envelope de colecciones.
- Cualquier nuevo listado debe definir sus límites, filtros y orden permitidos en el servidor y mantener sincronizado su contrato.

## Índices y evolución de escala
- Las consultas usan índices compuestos por fecha/estado, fecha/categoría, estado de pago/fecha de reserva y actividad/prioridad, además de índices parciales para filas activas.
- `indexes-especiales.ts` mantiene BRIN para `Vuelo.fechaHora` y GIN `pg_trgm` para búsquedas textuales; las agregaciones permanecen en la base de datos.
- PostgreSQL en contenedor conserva los ajustes de memoria y autovacuum definidos para el entorno; el pool Prisma usa `connection_limit=10`.
- El particionado por rango de `Vuelo` se reserva para cuando el volumen supere aproximadamente 100 000 filas.

## Alternativas consideradas
- **GraphQL:** descartado; REST con filtros cubre las consultas actuales con menos infraestructura.
- **Cursor en todos los listados:** reservado para conjuntos que crecen sin límite; los recursos acotados usan `page/pageSize`.
- **Filtrado global en navegador:** descartado para históricos o conjuntos grandes por costo y resultados incompletos.
- **SWR:** TanStack Query aporta paginación infinita, invalidación por prefijo y ciclo de mutaciones/rollback que usa la aplicación.
- **Envelope solo cuando hay parámetros:** descartado; una única forma de respuesta reduce bifurcaciones entre clientes.

## Referencias
- `apps/api/src/services/pagination.util.ts` y `apps/api/src/services/auditoria.service.ts`.
- `packages/shared/src/api.routes.ts` y esquemas de filtros/envelopes.
- `apps/web/src/services/api.ts`, hooks de consulta y `useDatosStream`.
- `apps/api/scripts/indexes-especiales.ts`.
- [ADR 009 — persistencia y sincronización offline](009-offline-first-conflictos.md).
