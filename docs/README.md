# Documentación de Paraglide

Índice de documentación vigente del monorepo. Los contratos ejecutables y su comportamiento se mantienen en el código, los tests y los workflows.

## Producto y arquitectura

- [Brief de producto](../PRD.md): propósito, personas y alcance funcional.
- [README del proyecto](../README.md): arquitectura actual, configuración local y comandos.
- [ADRs](adr/README.md): decisiones arquitectónicas y su estado.

## Desarrollo y operación

- [CI, releases candidatas y staging](ci-cd.md): validación por PR, publicación de RC y despliegue de staging.
- [Sistema de diseño](design-system.md): tokens, componentes y patrones visuales de Web.
- [Diagramas técnicos](diagrams/README.md): mapas de flujos por dominio con referencias al código.
- [Exposición por HTTPS con Caddy](../deploy/caddy/README.md): proxy externo y publicación de Web.

## Guías de desarrollo

- [Guía general de agentes](../AGENTS.md).
- [Guía de API](../apps/api/AGENTS.md).
- [Guía de Web](../apps/web/AGENTS.md).
- Skills de trabajo: [debug-flujo](../.agents/skills/debug-flujo/SKILL.md) y [agente-autonomo](../.agents/skills/agente-autonomo/SKILL.md).
- Definiciones de agentes: [`.github/agents/`](../.github/agents/), con espejo en [`.agents/agents/`](../.agents/agents/).
