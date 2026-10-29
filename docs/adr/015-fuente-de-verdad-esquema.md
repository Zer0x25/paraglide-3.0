# ADR 015 — Fuente de verdad del esquema y baseline

## Estado
Aceptado e implementado. Última revisión documental: 2026-10-29.

## Contexto
El esquema de la aplicación evolucionó mediante `prisma db push`, mientras que la migración inicial antigua solo representaba una parte del modelo. Aplicar esa migración no reproducía la base de datos vigente. Además, los índices parciales, BRIN y GIN requieren SQL que Prisma no expresa directamente.

## Decisión
1. `apps/api/prisma/schema.prisma` es la fuente de verdad del esquema gestionado por Prisma.
2. `apps/api/prisma/migrations/20260930000000_baseline_inicial/` contiene el baseline de 28 tablas generado con `prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script`; reproduce las tablas, enums e índices que Prisma puede representar. El baseline se verificó en una base vacía y la comparación de esquema quedó sin diferencias.
3. `apps/api/scripts/indexes-especiales.ts` crea de forma idempotente los objetos no representados por Prisma: extensión `pg_trgm`, índices parciales, BRIN y GIN. Se ejecuta después de sincronizar el esquema.
4. El flujo operativo documentado sigue usando `prisma db push` y el script de índices donde corresponde. El repositorio no automatiza un despliegue de aplicación a producción. Cualquier futura sincronización de esquema en una base productiva debe detenerse ante cambios destructivos, requerir revisión y contar con un plan de respaldo; no se acepta `--accept-data-loss` como paso desatendido.
5. Para adoptar `prisma migrate deploy` en una base existente que ya contiene este esquema, se registra el baseline como aplicado con `prisma migrate resolve --applied 20260930000000_baseline_inicial`; luego se versionan migraciones nuevas. Si aún no se adoptó ese flujo, el baseline se regenera desde el esquema antes de que cambie el procedimiento.

## Consecuencias
- La migración versionada inicial deja de representar un esquema antiguo e incompleto.
- Un entorno vacío puede reconstruir el modelo Prisma con el baseline y aplicar después los índices especiales.
- Los objetos SQL fuera de `schema.prisma` deben mantenerse en el script idempotente y verificarse aparte.
- `db push` no crea historial incremental: toda modificación de esquema debe incluir la ejecución de los índices especiales que correspondan.

## Alternativas consideradas
- **Conservar la migración antigua:** descartado porque produce un esquema que no corresponde a la aplicación.
- **Cambiar de inmediato todos los entornos a `migrate deploy`:** reservado para una adopción coordinada; exige baselinar cada base existente y cambiar el flujo operativo.
- **Eliminar las migraciones:** descartado porque se perdería una base reproducible y la ruta de adopción futura.

## Referencias
- `apps/api/prisma/schema.prisma`.
- `apps/api/prisma/migrations/20260930000000_baseline_inicial/migration.sql`.
- `apps/api/scripts/indexes-especiales.ts`.
- `README.md` (configuración de base de datos).
- [ADR 006 — borrado lógico y enums](006-soft-delete-enums.md).
