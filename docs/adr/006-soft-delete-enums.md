# ADR 006 — Borrado lógico y enums de PostgreSQL

## Estado
Aceptado e implementado. Última revisión documental: 2026-10-29.

## Contexto
Los registros operativos requieren conservar historial, y los valores de estado deben mantenerse alineados entre PostgreSQL y los esquemas compartidos que validan solicitudes y respuestas.

## Decisión
### Borrado lógico
- Los modelos incluidos en la extensión de Prisma de `apps/api/src/plugins/prisma.ts` se eliminan asignando `deletedAt`; las consultas comunes reciben `deletedAt: null` automáticamente.
- La extensión aplica a `findMany`, `findFirst`, `count`, `aggregate` y `groupBy`. No cubre `findUnique`/`findUniqueOrThrow` ni clientes transaccionales: esas consultas deben añadir el filtro explícito cuando corresponda.
- La inyección ocurre solo si `where.deletedAt === undefined`. Un filtro explícito permite consultar eliminados intencionalmente, por ejemplo para auditoría, restauración o generación de correlativos que no deben repetirse.
- Las cascadas con información que debe conservarse convierten el borrado de hijos en actualizaciones de `deletedAt`; no ejecutan borrado físico.
- Las consultas SQL directas que necesiten filas eliminadas deben expresar esa intención explícitamente.
- Los índices parciales sobre registros activos se mantienen en `apps/api/scripts/indexes-especiales.ts`.

### Enumeraciones
- Los enums nativos de PostgreSQL incluyen `EstadoPago`, `EstadoVuelo`, `MetodoPago`, `TipoEquipo`, `EstadoEquipo`, `EstadoPista`, `CanalMensaje` y `CategoriaPiloto`; sus valores se reflejan en los esquemas Zod de `packages/shared`.
- La migración de enums con datos existentes conserva las filas mediante conversiones explícitas; no se reemplazan columnas con un drop/recreate ciego.

## Consecuencias
- La mayoría de consultas de modelos cubiertos excluye eliminados de forma uniforme.
- Toda operación que necesite incluir eliminados debe declarar su filtro; esto es especialmente importante dentro de transacciones y consultas únicas.
- Un cambio de enum requiere actualizar el esquema de base de datos y el contrato compartido en la misma modificación.

## Referencias
- `apps/api/src/plugins/prisma.ts`.
- `apps/api/prisma/schema.prisma` y `apps/api/scripts/migrar-enums.ts`.
- `apps/api/scripts/indexes-especiales.ts`.
- [ADR 005 — datos y rendimiento](005-rendimiento-datos.md).
- [ADR 015 — esquema y baseline](015-fuente-de-verdad-esquema.md).
