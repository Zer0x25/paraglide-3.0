# ADR 009 — Lectura offline, outbox y conflictos

## Estado
Aceptado e implementado en el código actual. La disponibilidad de cada entorno se valida por separado; esta decisión no sustituye una prueba de ejecución en el dispositivo y despliegue concretos.

## Contexto
La operación puede continuar con conectividad intermitente. La aplicación necesita conservar una parte de los datos consultados, permitir que ciertas mutaciones se encolen y reconciliar reintentos con el control de concurrencia de ADR 004.

## Decisión
### Lectura y navegación
- TanStack Query persiste en IndexedDB a través de `resolveStorage()` y `createAsyncStoragePersister()`. `QueryProvider` conserva los datos por hasta siete días; excluye las claves `auth` y persiste vuelos solo para la consulta de calendario.
- `useWarmupData` prepara el horizonte operativo de ±15 días y las rutas `/`, `/pilotos`, `/reservas`, `/calendario` y `/configuracion` para navegar sin red tras el calentamiento inicial.
- El Service Worker de Vite precachea los recursos de la web, usa `index.html` como fallback de navegación, aplica `NetworkFirst` con timeout de tres segundos a `/api/*` y `NetworkOnly` a `/api/eventos`. La configuración compatible con Next conserva reglas de caché propias para páginas HTML/RSC.

### Escrituras y replay
- Solo se encolan las solicitudes marcadas explícitamente con `X-Outbox: 1`. Un error de red en esas solicitudes guarda método, URL, payload y metadatos en IndexedDB; otras solicitudes no se agregan automáticamente a la cola.
- Cada operación marcada recibe un `X-Client-Id` UUID que se conserva en el replay. La API puede devolver una respuesta 2xx previamente guardada para el mismo UUID, método, URL y usuario, con retención de siete días y tope de 256 KB. El guardado es asíncrono y no serializa dos replays simultáneos; es una protección de reintentos, no una exclusión mutua.
- El outbox conserva orden FIFO y usa `replayIfIdle` para evitar replays concurrentes. Se intenta replay al reconectar, al abrir SSE y mediante la acción manual disponible en la interfaz.
- Si el replay encuentra un conflicto de versión (`409`), la operación pasa al almacén local de conflictos para revisión/reintento con datos frescos; no se sobrescribe el cambio que ya existe en el servidor.
- `useDomainMutation` y las actualizaciones optimistas reflejan una mutación encolada sin presentarla como fallo definitivo. Las mutaciones que fallan de otra forma siguen el manejo de error y rollback normal.

## Límites
- El soporte offline es selectivo: depende de caché previamente persistida, precarga y de que la operación utilice el cliente outbox.
- La cola no ofrece fusión CRDT ni elimina conflictos de dominio; versión y `409` siguen siendo la reconciliación.
- Las reglas de caché del Service Worker deben describirse por flujo de compilación: Vite cachea rutas `/api/*` con `NetworkFirst`; no es correcto afirmar que el Service Worker excluye toda la API.
- El primario local descrito en ADR 012 es una propuesta separada y no forma parte del mecanismo implementado aquí.

## Alternativas consideradas
- **Sin persistencia ni cola:** descartado porque perder conectividad vaciaría la experiencia de operación.
- **Sincronización local-first con CRDT:** descartada para reservas, pagos y otras entidades cuyo conflicto debe resolverse explícitamente.

## Referencias
- `apps/web/src/components/QueryProvider.tsx` y `apps/web/src/services/storage/idbStorage.ts`.
- `apps/web/src/services/api.ts`, `apiOutbox.ts` y `services/outbox/outbox.service.ts`.
- `apps/web/src/hooks/useDomainMutation.ts`, `useWarmupData.ts` y `components/OutboxBadge.tsx`.
- `apps/web/vite.config.ts` y `apps/web/next.config.ts`.
- `apps/api/src/plugins/idempotencia.plugin.ts`.
- [ADR 004 — concurrencia y eventos](004-sincronizacion-multicliente.md).
- [ADR 012 — propuesta de dispositivo primario](012-write-fencing-primary.md).
