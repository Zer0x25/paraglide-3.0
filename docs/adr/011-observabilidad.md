# ADR 011 — Observabilidad

## Estado
Implementación parcial. Última revisión documental: 2026-10-29.

## Contexto
La API necesita métricas de latencia y recursos, captura de excepciones y contexto suficiente para investigar solicitudes. La decisión original proponía observabilidad correlacionada entre web, API, SSE y outbox; la documentación debe distinguir esa dirección de lo que el código emite actualmente.

## Decisión y estado actual
- El objetivo aceptado es instrumentar solicitudes y operaciones API con trazas OTel, propagar `traceparent` desde web, observar duración/códigos HTTP (incluido `409`) y medir actividad SSE/tamaño del outbox mediante Prometheus. Sentry recoge errores de API con contexto de solicitud; los errores esperados de validación y conflicto deben distinguirse de fallos 5xx. Un collector externo es una opción de despliegue, no un requisito de ejecución.
- La configuración Sentry para el cliente Next-compatible se conserva; su uso desde el flujo web principal Vite debe verificarse en ese flujo antes de atribuirle captura en producción.
- Fastify asigna un identificador de solicitud y devuelve `x-request-id`. La web agrega un encabezado `traceparent`; el plugin de observabilidad refleja el encabezado recibido en la respuesta. Esto da correlación básica, pero no acredita exportación de trazas distribuidas a un collector.
- El plugin Prometheus recoge métricas de Node y observa duración HTTP por método, ruta normalizada y código de respuesta.
- `GET /metrics` queda restringido al rol `ADMIN` cuando está disponible el hook de autorización.
- Sentry está integrado en la API para captura de errores configurada por entorno.
- `sse_broadcast_total` y `outbox_queue_size` están registrados y expuestos en el plugin; su valor operativo requiere que los productores llamen a `inc()`/`set()`. No se encontraron esas actualizaciones en los flujos actuales, por lo que no deben tratarse como métricas ya pobladas.
- El SDK de OpenTelemetry disponible en la API opera con exportación a consola solo bajo la configuración explícita correspondiente; no hay exportador OTLP configurado como parte del flujo actual.

## Consecuencias
- La métrica HTTP y las métricas de proceso son observables en Prometheus con acceso administrativo.
- Las métricas de SSE/outbox y el envío centralizado de trazas requieren completar la instrumentación antes de usarse como indicadores operativos.
- Sentry y métricas responden a objetivos distintos: errores capturados no sustituyen métricas ni trazas.

## Alternativas consideradas
- **Solo logs estructurados:** insuficientes para observar distribuciones de latencia y tendencias agregadas.
- **Collector obligatorio:** no se incorpora hasta que exista un destino y una configuración de exportación operativa.

## Referencias
- `apps/api/src/plugins/observability.plugin.ts` y `apps/api/src/app.ts`.
- `apps/web/src/services/api.ts`.
- Configuración Sentry y OpenTelemetry de `apps/api`.
- [ADR 004 — concurrencia y eventos](004-sincronizacion-multicliente.md).
- [ADR 009 — offline y outbox](009-offline-first-conflictos.md).
