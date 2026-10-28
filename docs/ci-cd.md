# CI por PR y publicación de imágenes Release Candidate

## Dónde se ejecuta cada paso

| Paso | Máquina | Resultado |
| :-- | :-- | :-- |
| CI del PR | GitHub (`ubuntu-latest`) | Tipos/lint/unitarios por módulos, o comprobación ligera de evidencia/documentación |
| Build API y Web | Dos runners hospedados por GitHub en paralelo | Imágenes candidatas en GHCR y manifiesto por digest |
| HTTP 01–07 y Playwright E2E | GitHub (`ubuntu-24.04`) | Prueba de imágenes por digest con DB temporal; se elimina al terminar |
| Etiquetado de release | Runner hospedado por GitHub | Aplica `vX.Y.Z-rc.N` a los digests solo después de que pasen las pruebas |

El pipeline no despliega en una VM ni depende de un runner self-hosted. La
prerelease conserva los manifiestos y la evidencia; las imágenes quedan en GHCR
con el tag RC para descargarlas cuando se necesiten. No se publica `latest` ni
se modifica producción.

## Trabajo diario

1. Crear una rama corta desde `main` y abrir un PR.
2. Esperar `CI Quality Gate ✅`: tipos del monorepo y pruebas de los módulos
   afectados; lint si cambia Web. Shared, dependencias o infraestructura validan
   todas las aplicaciones. Documentación no instala dependencias.
3. Actualizar la rama si `main` avanzó y fusionar con un título Conventional
   Commits (`fix(api): ...`, `feat(web): ...`). No se construyen imágenes aquí.

CI corre por `pull_request`, sin una segunda ejecución por push. Los nuevos
commits cancelan las validaciones anteriores del mismo PR. Un fallo de detección,
tipos, lint o pruebas falla el propio check, y una cancelación no lo aprueba.
El nombre `CI Quality Gate ✅` se conserva aunque reutilice evidencia: consultar
el resumen y los pasos ejecutados para distinguir comprobaciones de suites.
Un PR exclusivamente documental mantiene el check sin instalar dependencias ni
construir imágenes ni ejecutar HTTP/E2E.

Al aprobar las suites, CI conserva durante 30 días un artefacto con la huella
del contenido probado y las suites ejecutadas. Esa huella incluye código,
dependencias (también integridades del lockfile), scripts, workflows y modos de
archivo. Omite documentación y solo normaliza los campos de versión que cambia
Release Please. Un cambio de dependencias o de definición de CI invalida la
evidencia anterior.

Un commit posterior que solo cambia documentación sobre un PR ya aprobado
reutiliza la evidencia del mismo contenido. En un PR normal no se ignoran
cambios de versión para esta comparación: esa excepción exige la validación de
metadatos del PR de release o una comprobación manual explícita.

## Publicar una RC

Release Please crea o actualiza un PR con versión y changelog. Su configuración
está en modo prerelease: `versioning: prerelease`, `prerelease-type: rc.1` y
`prerelease: true`. La siguiente versión parte de la última publicada; no se
modifica a mano `.release-please-manifest.json` para simular una publicación.

1. Revisar el PR de release. Su check obligatorio comprueba la coherencia de
   versiones en paquetes, lockfile y manifest, y limita la vía ligera a los
   archivos de release esperados. Reutiliza CI únicamente si encuentra evidencia
   exitosa de ese mismo contenido; verifica el origen del artefacto y recalcula
   la huella desde el commit probado. Si cambia código o dependencias, no hay
   evidencia vigente o no se puede verificar, ejecuta las suites completas.
   Aprobar el workflow del bot si GitHub lo solicita; no se lanza un segundo CI
   por `workflow_dispatch`.
2. Release Please publica `vX.Y.Z-rc.N` como prerelease e invoca explícitamente
   `RC → GHCR`. Esto funciona con `GITHUB_TOKEN`, cuyos eventos automáticos
   pueden requerir autorización para ejecutar el workflow del PR del bot. No
   se necesita un PAT adicional.
3. Se comprueba que la prerelease está publicada, que el tag pertenece a `main`
   y que coincide con la versión del commit. Si su contenido ya tiene evidencia
   de CI verificable, no repite tipos, lint y unitarios. Sin esa evidencia,
   valida la candidata completa antes de construir imágenes.
4. Se construyen API y Web en paralelo, en runners independientes, para
   `linux/amd64`, con cachés separadas y sin emulación QEMU. Cada imagen se sube
   con un tag candidato `candidate-<run_id>` y su digest se conserva en un
   artefacto durante 14 días. Solo cuando ambos builds terminan bien se publica
   `rc-manifest.json` con los dos digests y el commit. Este manifiesto permite
   reintentar sin reconstruir; todavía no asigna el tag de release a las imágenes.
5. Un runner `ubuntu-24.04` de GitHub descarga las imágenes por digest y levanta
   API, Web y una DB temporal con credenciales propias. Verifica el commit y
   ejecuta las suites HTTP 01–07 más Playwright. El entorno y su DB se eliminan
   al terminar, también cuando hay fallos. Logs y capturas se conservan.
6. Solo si todo pasa se publica `rc-verification.json` y un job hospedado aplica
   a esos mismos digests el tag `vX.Y.Z-rc.N` en GHCR. Si el tag ya existe, el
   job verifica que apunte al mismo digest y se niega a sobrescribirlo si difiere.
   Un fallo de pruebas no publica el tag de release.
7. Descarga API y Web a demanda desde GHCR usando el tag de la prerelease; no hay
   un job posterior de despliegue, staging permanente ni runner de VM.

Una RC fallida no recibe su tag de imagen final. Si requiere cambiar código,
hacer otro PR y publicar otra RC. Para reintentar una RC existente, ejecutar
`RC → GHCR` desde Actions con su `rc_tag`; reutiliza los digests del manifiesto,
vuelve a probar las imágenes y solo entonces confirma o aplica el tag RC.
Publicar manualmente una prerelease también activa el flujo, con las mismas
comprobaciones. No editar ni mover tags RC ya publicados.

Los reintentos manuales aparecen como `Reprocesar RC vX.Y.Z-rc.N`.
El tag indicado elige el código de aplicación, las imágenes y las pruebas;
la rama seleccionada en el formulario solo elige la definición del workflow.
Reintentar una RC publicada no valida código nuevo de un PR. El resumen de
resolución indica siempre el tag, el commit candidato y el evento que lo lanzó.

La concurrencia serializa cada ciclo de RC para evitar pruebas y promociones de
tags simultáneas sobre una misma candidata. GitHub conserva una ejecución
pendiente; una solicitud nueva puede reemplazar otra que todavía no comenzó.

El ciclo habitual es: **PR de código (suites por módulos) → PR de release
(metadatos y evidencia) → RC (build, pruebas HTTP/E2E en GitHub y tag final en
GHCR)**. Las pruebas de imágenes se ejecutan una vez por intento de RC y no
repiten las pruebas unitarias del PR. Un reintento con imágenes ya registradas
omite CI/build, pero vuelve a probarlas en GitHub antes de publicar el tag final.

El dispatch manual de CI sigue disponible para diagnósticos: por defecto ejecuta
las suites completas. La opción explícita `reuse` permite comprobar la evidencia
del contenido seleccionado; si no puede verificarla, ejecuta CI completo.

## Evidencias y recuperación de fallos

| Evidencia | Qué acredita | Dónde se guarda |
| :-- | :-- | :-- |
| `ci-evidence-<huella>` | Contenido y suites aprobadas en un PR | Artefacto de CI durante 30 días |
| `rc-manifest.json` | Tag, commit y digests inmutables de API/Web | Prerelease |
| `rc-verification.json` | HTTP/E2E aprobados en un runner hospedado por GitHub | Prerelease |
| `rc-digest-<run_id>-<service>` | Digest de cada imagen candidata | Artefacto del workflow durante 14 días |
| `rc-test-results-<tag>` | Logs y resultados HTTP/E2E | Artefacto del workflow durante 14 días |

Los artefactos temporales de digests y pruebas duran 14 días. Los manifiestos y
la verificación adjuntos a la prerelease permanecen. El tag final de cada imagen
se publica únicamente después de la prueba; los tags candidatos no sustituyen
ese tag de release. `staging-verification.json`, presente en RC anteriores,
pertenece al flujo histórico que probaba directamente en la VM.

- **Fallo de CI:** corregir el PR; no publicar una candidata sin validación.
- **Fallo de un build:** usar `Re-run failed jobs`; conserva el digest del otro
  build dentro del mismo run mientras exista su artefacto. No se publica el
  manifiesto completo ni se asigna el tag de release a una sola imagen.
- **Fallo de HTTP/E2E:** revisar logs/capturas en `rc-test-results-<tag>`. No se
  publica el tag de release. Un cambio de código exige un PR y una RC nuevos.
- **Fallo al aplicar el tag GHCR:** el job comprueba el tag y no sobrescribe un
  tag existente que apunte a otro digest. Reprocesar la RC usa el manifiesto,
  vuelve a probar los digests y vuelve a verificar el tag.
- **Artefacto expirado o ausente:** reintentar el workflow completo con el mismo
  `rc_tag`. El manifiesto publicado evita reconstruir imágenes, pero las pruebas
  se vuelven a ejecutar en GitHub antes de aplicar o confirmar el tag de release.

## Descargar imágenes de GHCR

Las imágenes usan el mismo tag que la prerelease:

```bash
docker pull ghcr.io/zer0x25/paraglide-3.0-api:vX.Y.Z-rc.N
docker pull ghcr.io/zer0x25/paraglide-3.0-web:vX.Y.Z-rc.N
```

Reemplazar `vX.Y.Z-rc.N` por el tag publicado. Se requiere permiso de lectura
para los paquetes GHCR; el pipeline no cambia su visibilidad. El asset
`rc-manifest.json` de la prerelease incluye los digests para descargar o validar
exactamente las mismas imágenes que pasaron HTTP/E2E. El pipeline no modifica `latest`.

## Protección de main

En GitHub, configurar una regla para `main` con:

- PR obligatorio; cero aprobaciones requeridas para permitir trabajo individual.
- Check requerido **`CI Quality Gate ✅`**, con rama actualizada antes del merge.
- Resolución de conversaciones pendientes.
- Aplicación de la regla también a administradores, sin bypass habitual.
- Force-push y borrado de la rama deshabilitados.

Los YAML no activan esta protección: requiere permisos administrativos de la
integración o configuración en Settings → Branches / Rulesets. Sin la regla, el
workflow valida PRs pero GitHub todavía permite pushes directos a `main`.

## Stable: siguiente etapa

Este flujo termina con una RC probada en GitHub y sus imágenes etiquetadas en
GHCR. No publica Stable, no despliega en una VM y no modifica producción.

La promoción futura deberá comprobar `rc-verification.json` y los digests de
`rc-manifest.json`, sin construir imágenes nuevas. También habrá que definir
aprobación, metadatos de versión final, backups, cambios de esquema y
recuperación. No se presupone que revertir una imagen revierta la base de datos.

## Pendientes operativos

- Definir y aprobar la promoción a Stable/producción usando los digests ya
  validados, con procedimiento explícito de esquema, backup y recuperación.
- Definir backup automatizado de PostgreSQL en Docker (`pg_dump`), retención y
  una prueba de restauración.
- Configurar alertas de salud y disponibilidad en Caddy hacia el canal de
  monitoreo elegido.

Estos puntos son trabajo futuro, no pasos que el flujo de RC ejecute hoy.
