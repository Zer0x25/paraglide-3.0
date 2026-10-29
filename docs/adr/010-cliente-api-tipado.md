# ADR 010 — Cliente API tipado

## Estado
Consolidado en [ADR 005 — Datos, rendimiento y cliente API](005-rendimiento-datos.md).

## Decisión conservada
El contrato TypeScript compartido en `packages/shared` describe las rutas y operaciones consumidas por la web; `apps/web/src/services/api.ts` implementa el adaptador sobre Axios. La implementación actual es mantenida en código, no una factory generada desde OpenAPI ni validación runtime completa. El helper `unwrapList()` sigue disponible para compatibilidad.

Este archivo conserva el identificador de la decisión original y sus referencias. El alcance actual, las limitaciones de tipado y las reglas de consumo están documentados en ADR 005.
