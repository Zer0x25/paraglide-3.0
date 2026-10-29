# ADR 014 — Separación de lógica de dominio y UI

## Estado
Aceptado el 2026-09-21 como pauta arquitectónica. Aplicación progresiva en los módulos existentes.

## Contexto
Algunas páginas y hooks concentran consultas, formularios, modales, reglas de negocio y marcado visual. Esa combinación dificulta probar reglas por separado y hace más costoso modificar interfaces sin afectar el dominio.

## Decisión
### Web
- Los componentes presentacionales renderizan UI, estilos, accesibilidad y comunican acciones mediante callbacks. La carga/mutación de datos y la coordinación de formularios pertenecen a hooks controladores.
- Los controladores pueden componerse con sub-hooks según responsabilidad: datos y filtros, modales/selección, formularios y validaciones, eventos o integraciones externas.
- Cuando un controlador supera 300 líneas, se divide por responsabilidades; el hook orquestador busca mantenerse por debajo de 150 líneas.
- Las reglas de dominio derivadas —por ejemplo, estados permitidos, inmutabilidad contable o condiciones de eliminación— viven en funciones puras bajo `domain/` o `utils/` y se prueban sin montar React. La cobertura objetivo para sus ramas condicionales es 100%.

### API
- Las rutas Fastify delegan progresivamente la orquestación HTTP a controladores y las reglas/acceso a datos a servicios: `route → controller → service`.

## Consecuencias
- La UI se puede cambiar sin reimplementar las reglas de dominio.
- Las reglas puras admiten pruebas unitarias directas; los controladores conservan la coordinación de datos y estado.
- La división aumenta el número de archivos; se mantiene una organización predecible por módulo (`hooks/`, `components/`, `utils/` o `domain/`).

## Referencias
- `apps/web/src/app/`, `apps/web/src/hooks/` y las carpetas `components/`/`utils/` por módulo.
- `apps/api/src/routes/`, controladores y servicios.
- [ADR 005 — datos y cliente API](005-rendimiento-datos.md).
- [ADR 009 — offline y outbox](009-offline-first-conflictos.md).
