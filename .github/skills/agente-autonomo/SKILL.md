---
name: agente-autonomo
description: "Use when implementing, debugging or validating changes in Paraglide. Keep data safety and current project guardrails; choose checks proportional to the change."
---

# Guía práctica de trabajo — Paraglide

## Antes de editar

- Revisa `git status`, el código que define el comportamiento actual y los tests relacionados.
- Confirma el alcance de la tarea; no crees documentación de fase, estado de sesión o especificaciones duplicadas del código.
- Para cambios de comportamiento, añade o ajusta tests junto con la implementación.

## Seguridad e invariantes

- Desarrollo usa PostgreSQL `:5679`, staging `:5680` y producción `:5678`. No apuntes pruebas ni comandos destructivos a `:5678`.
- No ejecutes `test:prod*`, despliegues ni `staging:down:volumes` sin autorización explícita.
- Respeta el soft delete (`deletedAt: null`), la concurrencia (`version` / HTTP 409), el manejo monetario (`Decimal` / `toNum()`) y la normalización local de fechas.
- Emite SSE y notificaciones después del commit de la transacción.

## Autorización de acciones

- El trabajo local y sus validaciones no autorizan cambios externos. Commit, push, merge, tag, release, deploy, cambios a settings/secretos de GitHub y operaciones destructivas requieren una solicitud explícita del usuario para la tarea actual.
- La autorización es puntual; no se hereda a la siguiente tarea. `main` se integra por PR y no se publica directamente.
- No dependas de hooks hasta verificar runtime, contrato de entrada/salida y tests de bloqueo y permiso. La prohibición de producción `:5678` aplica siempre.
- No reveles secretos en la entrega; representa valores confidenciales como `[REDACTED]`.

## Validación proporcional

- Si cambias `packages/shared`, ejecuta `npm run build:shared`.
- Si cambias `apps/api/prisma/schema.prisma`, regenera el cliente Prisma.
- Para un cambio localizado, ejecuta los tests del workspace afectado.
- Para cambios transversales o una entrega amplia, ejecuta `npm run check:quick`; `npm run check` añade el build completo.
- Para cambios solo documentales, valida enlaces, `git diff --check` y que no queden referencias a rutas retiradas.
- Formatea código cambiado con `npm run format`; Markdown queda fuera del formateo incremental del proyecto.

## Entrega

Resume qué cambió, qué verificaste y cualquier riesgo o paso que dependa del usuario. No agregues bitácoras de sesión; conserva solo conocimiento operativo duradero y no duplicado en `.agents/memories/`.
