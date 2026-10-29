# ADR 008 — Manejo de dinero con Decimal

## Estado
Aceptado e implementado. Última revisión documental: 2026-10-29.

## Contexto
Los importes deben conservar exactitud al persistirse y al realizar operaciones financieras. Los números binarios de JavaScript pueden introducir diferencias de redondeo en sumas y comparaciones.

## Decisión
- PostgreSQL y Prisma usan `Decimal(12,2)` para los campos monetarios definidos en `schema.prisma`.
- La API serializa los importes como `number` para los DTO que consume la web.
- En backend, no se aplican operadores aritméticos o comparaciones de JavaScript directamente sobre una instancia Decimal. Se convierte mediante `toNum()` de `apps/api/src/services/money.util.ts` cuando la operación definida lo permite, o se usan operaciones nativas de Decimal.js.
- La interfaz usa `number` para presentar importes; las reglas de cálculo y comparación permanecen en el backend.
- Las agregaciones financieras se ejecutan en la base de datos cuando el servicio lo permite, sin cargar el conjunto completo en memoria.

## Consecuencias
- La representación persistida conserva dos decimales y un rango definido.
- Toda nueva operación monetaria debe escoger explícitamente entre conversión controlada y aritmética Decimal; no comparar directamente dos instancias Decimal con `>=` o `<=`.
- La serialización a `number` es un límite del contrato de API; los cálculos de autoridad no se delegan al navegador.

## Referencias
- `apps/api/prisma/schema.prisma`.
- `apps/api/src/app.ts` y `apps/api/src/services/money.util.ts`.
- `packages/shared/src` para los DTO monetarios.
- [ADR 005 — datos y rendimiento](005-rendimiento-datos.md).
