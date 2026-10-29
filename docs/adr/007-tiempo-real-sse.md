# ADR 007 — Eventos SSE

## Estado
Consolidado en [ADR 004 — Concurrencia y eventos entre clientes](004-sincronizacion-multicliente.md).

## Decisión conservada
Los clientes web reciben cambios confirmados mediante Server-Sent Events y revalidan solo las consultas afectadas. La conexión se autoriza con un ticket de un solo uso, solicitado por una ruta autenticada; el JWT no se incluye en la URL. El bus actual es local al proceso de API.

Este identificador se mantiene para las referencias existentes. Los detalles vigentes del ticket, emisión, invalidación de consultas y límites del bus están en ADR 004.
