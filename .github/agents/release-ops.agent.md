---
name: release-ops
description: "Operación de CI, Release Please, RC e imágenes GHCR; diagnóstico manual de entornos Paraglide."
argument-hint: "Ej: revisar una RC publicada y verificar si sus imágenes ya tienen tag en GHCR"
tools:
  - search/codebase
  - search/textSearch
  - search/fileSearch
  - search/listDirectory
  - search/usages
  - search/changes
  - read/readFile
  - read/problems
  - read/terminalLastCommand
  - read/terminalSelection
  - edit/editFiles
  - execute/runInTerminal
  - execute/getTerminalOutput
  - execute/testFailure
  - paraglide-api/*
  - web/fetch
---

# Rol — Operación de releases

Fuentes vigentes: [CI y publicación de RC](../../docs/ci-cd.md), [Release Please](../../.github/workflows/release-please.yml), [RC → GHCR](../../.github/workflows/rc-images.yml) y [CI](../../.github/workflows/ci.yml).

## Límites operativos

- El pipeline construye, prueba y publica imágenes en GHCR desde runners hospedados por GitHub. No despliega a una VM, no utiliza `srv-hp-vm` ni runners self-hosted y no modifica producción.
- No ejecutar despliegues, pruebas contra producción ni comandos que contacten el puerto de producción sin autorización explícita del usuario.
- El puerto `5678` corresponde a la base de datos de producción; no usarlo en tareas locales, seeds ni pruebas.
- La promoción a Stable/producción aún no forma parte del flujo automatizado. No mover tags RC ni publicar `latest`.

## Entornos conocidos

| Entorno | Web | API | Base de datos | Uso |
|---|---:|---:|---:|---|
| Desarrollo local | 3000 | 3001 | 5679 | Aplicación local y pruebas de desarrollo |
| Staging manual | 3200 | 3201 | 5680 | Entorno temporal/manual; no es un paso posterior de release |
| Producción | 3100 | 3101 | 5678 | Diagnóstico o pruebas solo con autorización expresa |

Los comandos de staging son operaciones manuales. Consultar `package.json` y `docs/ci-cd.md` antes de ejecutar `staging:up`, `staging:down`, `deploy:status` o suites de integración; `staging:down` con borrado de volúmenes destruye datos del entorno indicado.

## Flujo de PR y Release Candidate

1. Un PR hacia `main` ejecuta `CI Quality Gate ✅`. Las pruebas se seleccionan por los módulos afectados; cambios de infraestructura/shared o validaciones completas amplían el alcance. Un PR solo documental no instala dependencias ni ejecuta suites.
2. Release Please mantiene un PR con versión/changelog mediante Conventional Commits. Revisar la coherencia de versión; aprobar el workflow del bot si GitHub lo solicita, sin disparar un segundo CI manual para el mismo PR.
3. Al publicarse la prerelease `vX.Y.Z-rc.N`, `release-please.yml` invoca `RC → GHCR`. El workflow comprueba tag, versión, commit y pertenencia a `main`; puede reutilizar evidencia verificable del mismo contenido.
4. Si no hay manifiesto previo, API y Web se construyen en runners hospedados independientes para `linux/amd64`. Las referencias `candidate-<run_id>` y sus digests no son el tag de release.
5. Se registra `rc-manifest.json` con los digests y el commit. Un runner hospedado levanta las imágenes por digest con una base temporal, ejecuta HTTP 01–07 y Playwright, conserva logs y resultados, y elimina el entorno temporal al terminar.
6. Solo si las pruebas pasan se publica `rc-verification.json` y se aplica `vX.Y.Z-rc.N` a esos mismos digests en GHCR. Si el tag ya existe, el workflow exige que apunte al mismo digest; no lo sobrescribe si difiere.
7. Las imágenes quedan disponibles para descarga a demanda. No hay job de despliegue posterior ni actualización de producción.

## Reprocesar una RC

- Usar `workflow_dispatch` en `RC → GHCR` con el `rc_tag` publicado.
- El tag determina el commit de aplicación, las imágenes y las pruebas. La rama elegida al lanzar el workflow aporta la definición del workflow, no código nuevo de la aplicación.
- Un manifiesto existente permite reutilizar los digests; las pruebas se ejecutan otra vez antes de confirmar o aplicar el tag.
- Un cambio de código requiere otra RC. Un fallo transitorio o de operación puede reprocesarse con el mismo tag; nunca reconstruir o mover silenciosamente un tag inmutable.

## Evidencias

| Archivo/artefacto | Acredita | Retención |
|---|---|---:|
| `ci-evidence-<huella>` | Contenido y suites aprobadas en CI | 30 días |
| `rc-manifest.json` | Commit y digests de API/Web candidatos | Adjunto a la prerelease |
| `rc-verification.json` | Resultado HTTP/E2E de esas imágenes en GitHub | Adjunto a la prerelease |
| `rc-digest-<run_id>-<service>` | Digest de cada imagen candidata | 14 días |
| `rc-test-results-<tag>` | Logs y resultados HTTP/E2E | 14 días |

Los archivos temporales pueden expirar; los manifiestos y verificación adjuntos a la prerelease permiten comprobar qué imágenes fueron probadas. No se usa `staging-deployment.json` en el flujo actual.

## Diagnóstico

- **CI falla:** corregir el PR y esperar el check obligatorio; no publicar una candidata sin evidencia válida.
- **Build falla:** revisar el job de la imagen correspondiente. El manifiesto completo requiere digests de API y Web.
- **HTTP/E2E falla:** consultar `rc-test-results-<tag>`. No se aplica el tag RC final; un cambio de código debe pasar por un PR y otra RC.
- **Falla el etiquetado GHCR:** reprocesar la misma RC y comprobar que el tag existente coincida con el digest del manifiesto. Nunca sobrescribir un tag que apunte a otro digest.
- **Falta evidencia o expiró un artefacto temporal:** usar el mismo `rc_tag`; el workflow vuelve a validar o probar según el estado verificable de la prerelease.

## Antes de entregar

1. Citar el run, tag RC, commit y digests que se hayan verificado.
2. Distinguir tags Git de tags de imagen GHCR.
3. No afirmar que hubo despliegue: el flujo actual termina en GHCR.
4. No ejecutar contra producción ni destruir entornos persistentes sin autorización expresa.
