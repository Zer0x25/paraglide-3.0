# ADR 013 — Una sesión vigente por usuario

## Estado
Aceptado e implementado. Última revisión documental: 2026-10-29.

## Contexto
Los JWT de siete días no se revocan automáticamente al iniciar sesión desde otro dispositivo. Si se conserva únicamente su expiración, varias sesiones del mismo usuario pueden operar en paralelo.

## Decisión
- El modelo `User` mantiene `sessionVersion`.
- Los JWT de usuario tienen una vigencia de siete días; el versionado revoca sesiones anteriores antes de esa expiración.
- Cada inicio de sesión exitoso incrementa la versión del usuario y firma el JWT con el claim `sv` correspondiente.
- El plugin de autenticación valida el claim contra el valor actual en base de datos para cada solicitud autenticada. Si el usuario ya no existe o la versión no coincide, responde `401` con `SESSION_REVOKED`.
- Las credenciales internas de servicio que no representan una sesión de usuario (por ejemplo, el principal técnico sin `User.id`) siguen su ruta de autorización propia y no consultan `sessionVersion`.
- El logout web elimina la cookie local; la revocación de sesiones anteriores ocurre al siguiente login, no al cerrar sesión.
- La web reconoce `SESSION_REVOKED`, informa al usuario y conduce al inicio de sesión.

## Consecuencias
- Un nuevo login invalida los JWT previos del mismo usuario, en todos los roles.
- La verificación requiere consultar el estado de sesión en el servidor; no se usa caché local para esa comparación.
- Dispositivos abiertos pueden perder la sesión al iniciar sesión desde otro. La política es una sesión activa por usuario, no sesiones concurrentes.
- La revocación necesita conectividad y se aplica cuando el API valida la solicitud; no modifica una sesión mientras el cliente está completamente desconectado.

## Alternativas consideradas
- **Denylist de JWT:** requiere almacenamiento y lookup por token.
- **Refresh tokens con access token breve:** añade infraestructura y reduce el tiempo de operación desconectada.
- **Tabla de sesiones por dispositivo:** aporta más metadatos, pero la regla vigente solo requiere invalidar versiones anteriores.

## Referencias
- `apps/api/prisma/schema.prisma` (`User.sessionVersion`).
- `apps/api/src/services/auth.service.ts` y `apps/api/src/plugins/auth.ts`.
- `apps/web/src/services/api.ts` (manejo de `SESSION_REVOKED`).
- [ADR 009 — persistencia y sincronización offline](009-offline-first-conflictos.md).
