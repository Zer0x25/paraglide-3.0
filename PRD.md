# Paraglide — Brief de producto

## Propósito

Paraglide ayuda a escuelas de parapente a coordinar reservas, pasajeros, pilotos, vuelos y operación en pista. El producto debe servir tanto al personal de recepción como a los pilotos y pasajeros, incluso cuando la conectividad es irregular.

## Personas usuarias

- **Pasajero:** consulta y gestiona su reserva desde el móvil, paga o confirma información y firma el deslinde.
- **Piloto:** consulta sus turnos y registra el avance de vuelos desde la pista.
- **Recepción / operador:** administra reservas, cobros, asignaciones y calendario diario.
- **Administrador:** configura la operación, administra personal y revisa resultados del negocio.

## Alcance funcional

El núcleo del producto incluye reservas y pasajeros, calendario y asignación de pilotos, operación de vuelos, autenticación, auditoría y analíticas. Las capacidades ampliadas incluyen gestión de equipos, reportes, meteorología, pantallas operativas y plantillas de comunicación.

Los recorridos principales son: crear y confirmar una reserva; asignar pasajeros a un bloque y piloto; registrar el vuelo y sus cambios de estado; gestionar pagos y cancelaciones; completar el deslinde; consultar la operación del día.

## Necesidades del producto

- Mantener la información de reservas, pagos y vuelos coherente ante cambios concurrentes.
- Permitir que la operación de pista continúe con conectividad limitada y sincronice cambios al recuperar conexión.
- Proteger los datos personales y financieros y dejar trazabilidad de operaciones relevantes.
- Mostrar al personal información operativa actualizada sin exigir recargas manuales.
- Ofrecer una experiencia móvil accesible, en español y usable en exteriores.
- Separar el núcleo operativo de las funciones ampliadas que pueden habilitarse según las necesidades de cada escuela.

## Límites

Este documento describe objetivos y alcance de producto; no es una especificación de implementación ni un checklist de proceso. Los contratos y el comportamiento vigentes se verifican en el código, los tests y los [ADRs](docs/adr/README.md). La arquitectura y el uso local se resumen en el [README](README.md).
