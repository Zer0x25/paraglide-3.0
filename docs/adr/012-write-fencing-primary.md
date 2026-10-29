# ADR 012 — Dispositivo primario local

## Estado
Propuesto el 2026-08-27; no implementado. Describe una alternativa para reducir escrituras simultáneas durante una caída, no el comportamiento actual de la aplicación.

## Contexto
El outbox de ADR 009 permite encolar mutaciones desde más de un navegador. Si varios dispositivos editan la misma entidad sin conexión, al recuperar la red pueden aparecer conflictos `409`, que se resuelven según ADR 004. Se propuso una restricción local para que, durante una caída, un solo navegador actúe como escritor.

## Propuesta
1. Persistir por navegador un `deviceId` estable y una preferencia local `isPrimaryDevice` en `localStorage` o IndexedDB. La preferencia no se envía al servidor ni forma parte del JWT.
2. Permitir que solo un administrador designe o cambie el dispositivo primario. En su primer inicio de sesión, mostrar una elección; en otros dispositivos, mostrar que pueden reasignarlo.
3. Recordar localmente el último `deviceId` designado como primario para comparar la selección al iniciar sesión desde otro navegador.
4. Durante una desconexión detectada por el navegador, bloquear antes de la red y del outbox las mutaciones del dispositivo no primario, con un mensaje claro. En línea, cualquier dispositivo conserva capacidad de escritura.
5. Incorporar la selección y explicación del dispositivo en la configuración administrativa.

## Límites y riesgos
- El estado vive en un navegador, no en una fuente central. Borrar almacenamiento local, usar otro perfil o cambiar de navegador pierde la designación conocida.
- La regla solo se puede hacer cumplir en el cliente; no es un fence de seguridad en el servidor.
- `navigator.onLine` puede indicar conexión aunque la API esté inaccesible. En ese caso, el interceptor actual podría encolar una mutación marcada con `X-Outbox: 1`, por lo que el bloqueo local no garantiza exclusividad absoluta.
- La propuesta reduce una clase de conflictos, pero no reemplaza versionado, idempotencia ni resolución de conflictos.

## Alternativas consideradas
- **Lease/fence en servidor:** más robusto ante varios clientes y falsos positivos de conectividad, pero requiere autoridad central, renovación y cambio de dispositivo en API.
- **Bloquear siempre a dispositivos no primarios:** impediría la operación normal con red y no corresponde al objetivo de la propuesta.
- **Bloqueos por registro:** más granularidad de la necesaria para el problema descrito.

## Referencias
- `apps/web/src/hooks/useOnlineStatus.ts` y `useDomainMutation.ts` serían los puntos de integración del bloqueo.
- `apps/web/src/services/api.ts` y `services/outbox/outbox.service.ts` describen el comportamiento actual de encolado.
- [ADR 004 — concurrencia](004-sincronizacion-multicliente.md).
- [ADR 009 — offline y outbox](009-offline-first-conflictos.md).
- [ADR 013 — sesión única](013-single-session.md).
