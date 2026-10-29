# ADR 004 — Concurrencia y eventos entre clientes

## Estado
Aceptado; implementación parcial por endpoint. Última revisión documental: 2026-10-29.

## Contexto
Varios clientes editan los mismos datos desde móvil, tablet y escritorio. La estrategia debe evitar sobrescrituras silenciosas, comunicar cambios confirmados y funcionar con el modelo HTTP de la web.

## Decisión
### Concurrencia optimista
- Las entidades sujetas a edición concurrente exponen una versión o revisión. El cliente envía el valor que leyó; una versión desactualizada debe producir `409 Conflict` y la interfaz debe recargar antes de reintentar.
- Para garantizar que no haya una carrera entre la comparación y la escritura, ambas operaciones deben ocurrir en la misma transacción o en una actualización condicional atómica. `checkVersion()` por sí solo solo compara valores: no crea atomicidad.
- La implementación verificada de `PUT /api/pilotos/:id/disponibilidad` lee el piloto, compara `version`, reemplaza las excepciones y bloques de las fechas enviadas y aumenta la versión en una transacción. Si difiere, no escribe y devuelve `409`.
- El contador de `Piloto` es compartido por todas sus fechas; un cambio en una fecha puede invalidar un borrador de otra. Es un control conservador.
- Para el guardado masivo de disponibilidad, el cliente mantiene un borrador local y envía el estado deseado (`disponible` y bloques), no una operación ambigua de alternar. Hay rutas específicas de disponibilidad que aún operan como toggle; no se consideran equivalentes al endpoint atómico.
- El patrón se usa también en mutaciones de reserva, vuelo, pago y otros recursos versionados, pero la comparación y atomicidad deben comprobarse en cada endpoint. No se infiere cobertura transaccional completa a partir del helper común.

### Eventos en tiempo real
- La sesión solicita un ticket mediante `POST /api/eventos/ticket`, autenticado por el flujo normal. El JWT no se incluye en la URL.
- El ticket aleatorio dura cinco minutos y se consume una sola vez al abrir `GET /api/eventos?ticket=…`. Cada reconexión obtiene uno nuevo.
- El bus SSE actual es un pub/sub en memoria de una instancia. Un reinicio invalida tickets pendientes; conexiones activas se cierran durante el apagado. Una instalación con varias réplicas necesitaría un transporte compartido.
- El plugin emite `datos-cambios` después de respuestas 2xx de mutaciones en rutas mapeadas; excluye rutas públicas, autenticación, eventos, módulos y endpoints de cálculo. Algunas rutas emiten además invalidaciones de entidades relacionadas. La actualización de módulos usa su evento `modulos-cambios` propio.
- `useDatosStream` mapea entidades a prefijos de `queryKey`, agrupa invalidaciones durante 300 ms y, ante una entidad desconocida o un payload ilegible, invalida toda la caché. Las reconexiones usan backoff de 3 a 30 segundos; SSE envía heartbeat cada 30 segundos.

## Consecuencias
- Los conflictos cubiertos por versión se detectan en vez de sobrescribirse silenciosamente.
- La granularidad de versión por piloto puede causar un `409` entre ediciones de fechas distintas.
- La seguridad de una escritura concurrente depende de la implementación concreta de la ruta, no solo del contrato de respuesta.
- SSE reduce polling, pero el bus no distribuye eventos entre procesos.

## Alternativas consideradas
- **Bloqueo pesimista:** descartado como estrategia general por la complejidad de leases y sesiones de edición.
- **Polling periódico:** descartado como canal principal por latencia y carga; tampoco evita conflictos.
- **WebSockets:** SSE basta para este flujo de notificación unidireccional.

## Referencias
- `apps/api/src/services/concurrencia.service.ts` y servicios de dominio con control de versión.
- `apps/api/src/services/pilotos.service.ts` (`saveDisponibilidad`).
- `apps/api/src/plugins/broadcast.plugin.ts`.
- `apps/api/src/services/eventos.service.ts`, `sse-tickets.service.ts` y `routes/eventos.routes.ts`.
- `apps/web/src/hooks/useDomainMutation.ts` y `useDatosStream.ts`.
- [ADR 003 — módulos de producto](003-modular-basica-premium.md).
- [ADR 007 — decisión original de SSE](007-tiempo-real-sse.md).
- [ADR 009 — persistencia y sincronización offline](009-offline-first-conflictos.md).
