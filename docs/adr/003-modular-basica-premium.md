# ADR 003 — Módulos de producto

## Estado
Aceptado e implementado. Última revisión documental: 2026-10-29.

## Contexto
Las instalaciones pueden habilitar distintas áreas del producto. El estado debe poder consultarse desde la web y cambiar durante la ejecución, con autorización administrativa en las operaciones de configuración.

## Decisión
- El núcleo disponible incluye Inicio/Dashboard, Pilotos, Reservas y Pasajeros, Calendario, Analíticas y Auditoría (esta última restringida a ADMIN). La configuración de bloques horarios está integrada al calendario.
- Los identificadores premium actuales son `equipos`, `reportes`, `meteorologia`, `pantalla` y `plantillas`. `/dev` es una herramienta exclusiva de desarrollo, no un módulo comercial.
- El registro web contiene ruta, etiqueta, icono, sección, permisos de administración y metadatos de presentación; el servidor mantiene la lista válida de IDs.
- La lista de identificadores válidos se define en `apps/api/src/services/modules.service.ts` y se refleja en el registro web `apps/web/src/modules/registry.ts`.
- La configuración vigente se lee desde `apps/api/modules.config.json`; `modules.service.ts` valida los identificadores, actualiza el estado en memoria y persiste los cambios en ese archivo.
- `GET /api/modules` entrega el estado a la aplicación. `GET` y `PUT /api/admin/modules` permiten consultar y actualizar la configuración con permisos de administración.
- El cliente usa `useEnabledModules` para suscribirse al estado y `withModule` para proteger la vista correspondiente. Los cambios se notifican con el evento SSE `modulos-cambios`, sin recompilar la web.

## Consecuencias
- El archivo de configuración y los identificadores de la API son la referencia para habilitar módulos.
- El proceso de la API debe poder escribir el archivo de configuración en el entorno donde se administran cambios.
- El estado del módulo controla disponibilidad de interfaz; no reemplaza la autorización que debe comprobar la API en cada operación protegida.
- Una configuración comercial distinta puede desplegarse inicialmente editando el JSON; el endpoint administrativo cambia el estado en caliente y lo persiste. La web embebe todos los módulos como estado provisional, mientras que una API que no logra leer su configuración inicia con lista vacía.

## Alternativas consideradas
- Configurar módulos exclusivamente durante la compilación: descartado porque exigiría publicar una nueva web para cada cambio.
- Mantener listas independientes en web y API: descartado porque permite divergencias entre identificadores.

## Referencias
- `apps/api/modules.config.json`.
- `apps/api/src/services/modules.service.ts` y `apps/api/src/routes/modules.routes.ts`.
- `apps/web/src/modules/registry.ts`, `apps/web/src/modules/runtime.ts` y `apps/web/src/components/withModule.tsx`.
- [ADR 004 — concurrencia y eventos](004-sincronizacion-multicliente.md).
