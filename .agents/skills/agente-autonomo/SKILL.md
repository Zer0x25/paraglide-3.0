---
name: agente-autonomo
description: "Use when implementing, debugging or validating changes in Paraglide. Keep work lightweight and grounded in code and tests."
---

# Guía práctica de trabajo — Paraglide

Esta guía promueve cambios pequeños y verificables, adaptados a la petición y al estado real del repositorio. Las reglas estables de seguridad, autorización e invariantes viven en `AGENTS.md` y en los `AGENTS.md` del workspace; esta skill no las duplica ni las reemplaza.

## Forma de trabajo

1. Antes de editar, revisa `git status`, el código que determina el comportamiento y los tests relacionados. Conserva cambios ajenos y limita el alcance a la petición.
2. Para cambios de comportamiento, ajusta o añade pruebas junto con la implementación. Planifica y documenta al nivel necesario para aclarar el alcance, las decisiones y cómo se verificará el cambio, sin duplicar lo que ya expresan el código, los tests o los ADRs.
3. Valida en proporción al cambio con los comandos documentados en `AGENTS.md` y en la guía del workspace. Para un bug, carga `debug-flujo` en lugar de repetir aquí su procedimiento.
4. Revisa el diff y comunica qué cambió, qué pruebas se ejecutaron y qué queda pendiente o incierto.

## Límites

- `AGENTS.md` es la fuente para protección de datos, permisos, invariantes de dominio y comandos seguros. Si una acción puede afectar producción o es destructiva, detente y aplica esas reglas; una skill no las puede rebajar.
- No hagas commit, push, merge, tag, release, despliegue ni cambios remotos sin autorización explícita para esa acción en la tarea actual.
- Conserva conocimiento operativo duradero solo cuando aporte contexto adicional; deja que el código, los tests y los ADRs sean la referencia del comportamiento vigente.
