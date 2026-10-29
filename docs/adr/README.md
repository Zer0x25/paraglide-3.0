# Decisiones de arquitectura

Este directorio conserva las decisiones que explican la estructura y los invariantes del producto. El código y sus pruebas muestran el comportamiento vigente; los ADR registran el porqué, el alcance y las consecuencias relevantes.

Los identificadores son estables. Cuando una decisión se integra en otra, el archivo anterior permanece como referencia breve para mantener enlaces y citas existentes; la decisión vigente se consulta en el ADR indicado como destino.

## Índice

| ADR | Decisión | Estado | Alcance |
|---|---|---|---|
| [001](001-stack-y-arquitectura.md) | Arquitectura vigente y stack | Aceptado | Workspaces, aplicaciones y contratos compartidos |
| [002](002-monorepo-y-arquitectura.md) | Monorepo y espacios de trabajo | Consolidado en 001 | Mantiene el identificador y la decisión original |
| [003](003-modular-basica-premium.md) | Módulos de producto | Implementado | Configuración de módulos y actualización en caliente |
| [004](004-sincronizacion-multicliente.md) | Concurrencia y eventos entre clientes | Implementado | Versionado, `409`, tickets SSE e invalidación selectiva |
| [005](005-rendimiento-datos.md) | Datos, rendimiento y cliente API | Implementado parcialmente | Colecciones, filtros, límites, cursores y contrato tipado |
| [006](006-soft-delete-enums.md) | Borrado lógico y enums de PostgreSQL | Implementado | Filtros de `deletedAt`, cascadas y enums compartidos |
| [007](007-tiempo-real-sse.md) | Eventos SSE | Consolidado en 004 | Mantiene el identificador de la decisión original |
| [008](008-dinero-decimal.md) | Manejo de dinero con Decimal | Implementado | Precisión de persistencia, cálculo y serialización |
| [009](009-offline-first-conflictos.md) | Lectura offline, outbox y conflictos | Implementado | Caché selectiva, replay idempotente y resolución `409` |
| [010](010-cliente-api-tipado.md) | Cliente API tipado | Consolidado en 005 | Mantiene el identificador de la decisión original |
| [011](011-observabilidad.md) | Observabilidad | Parcial | Métricas actuales, captura de errores y límites de trazas |
| [012](012-write-fencing-primary.md) | Dispositivo primario local | Propuesto, no implementado | Propuesta de escritura offline desde un solo navegador |
| [013](013-single-session.md) | Una sesión vigente por usuario | Implementado | Revocación de JWT mediante `sessionVersion` |
| [014](014-separacion-logica-ui.md) | Separación de dominio y UI | Pauta aceptada | Responsabilidades de web y API |
| [015](015-fuente-de-verdad-esquema.md) | Esquema y baseline | Implementado | `schema.prisma`, baseline e índices especiales |

## Relaciones principales

- ADR 001 describe la estructura de aplicaciones y paquetes.
- ADR 004 define concurrencia y propagación de eventos; ADR 009 se apoya en sus versiones y conflictos.
- ADR 005 establece el contrato de colecciones y el cliente; ADR 009 añade persistencia y outbox.
- ADR 006, 008 y 015 documentan invariantes relacionados con la base de datos y los importes.
- ADR 012 sigue siendo una propuesta separada del comportamiento offline implementado en ADR 009.

## Evolución

No se renumeran decisiones ya publicadas. Si dos ADR comparten alcance, se consolida el contenido vigente en el identificador canónico y se deja en el otro un resumen con enlace. Cada revisión debe verificar referencias contra el código y actualizar el estado para distinguir implementación actual de propuesta.
