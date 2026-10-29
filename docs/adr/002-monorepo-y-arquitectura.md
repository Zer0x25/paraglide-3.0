# ADR 002 — Monorepo y espacios de trabajo

## Estado
Consolidado en [ADR 001 — Arquitectura vigente y stack](001-stack-y-arquitectura.md).

## Decisión conservada
El proyecto usa un monorepo administrado con npm workspaces. Las aplicaciones web, API y MCP se mantienen en `apps/`, mientras que los contratos compartidos viven en `packages/shared/`. La organización permite compartir tipos y herramientas sin acoplar la ejecución de cada aplicación.

Este archivo conserva el identificador para que los enlaces y referencias existentes sigan resolviendo. La descripción vigente de la arquitectura y sus consecuencias está en ADR 001.
