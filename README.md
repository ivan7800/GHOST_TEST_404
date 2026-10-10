## RC7 — Comprobaciones de recorrido (2026-10-10)

- El Release Gate bloquea recorridos que intentan realizar peticiones fuera del origen autorizado.
- La política `requirements.journey:true` exige al menos una aserción explícita correcta (`expectText`, `expectVisible`, `expectValue`, `expectCount`) y bloquea pasos fallidos incluso si un informe declara `PASS`.
- La validación del navegador y el lockfile siguen pendientes; por tanto esta versión no es STABLE.

---

# Release candidate 2 (1.0.0-rc.2) — alcance de la validación

- 17 pruebas automatizadas superadas: unidad, servidor y contratos estáticos de interfaz.
- **NO** hay certificación end-to-end con Playwright: no se pudo instalar la dependencia en el entorno de ejecución (DNS bloqueado).
- Chromium se pudo lanzar, pero la política del entorno bloqueó las páginas `127.0.0.1` y `file://`. Por tanto no se han podido probar clics reales.
- Este paquete no contiene `node_modules` ni `package-lock.json`. El instalador utiliza `npm install` y requiere acceso a npm; una compilación totalmente reproducible sigue pendiente de generar y versionar el lockfile en un entorno con conexión.
- En Windows, ejecutar `INSTALAR_WINDOWS.bat`, `INICIAR_GHOST_TEST_404.bat`, `npm test` y `npm run test:ci`; comprobar los temas, el historial, la exportación y las capturas con datos desechables antes de publicar STABLE.

---

# GHOST TEST 404 · v1.0.0-rc.1 · Fase 7 — QA y endurecimiento

**Estado: candidata a release; NO versión estable certificada.**

# GHOST TEST 404 · v0.6.0 · Fase 6 — GitHub & ReleaseForge

# GHOST TEST 404 · v0.4.0 · Fase 4 — Visual Lab

Proyecto local para Windows. Requiere Node.js 20+, `npm install` y `npx playwright install chromium`. Usa los BAT incluidos. Abre http://127.0.0.1:4177.

## Visual Lab
1. Abre una aplicación de **pruebas local** desde Ghost Test.
2. Marca **Activar Visual Lab** y selecciona escritorio, tablet y/o móvil.
3. Escoge **Solo capturar**, **Guardar nueva referencia** o **Comparar con referencia**.
4. Para regresiones: guarda las referencias y, tras los cambios de código, compara con las mismas URLs y tamaños.
5. El informe muestra porcentaje de píxeles diferentes y capturas; las diferencias se guardan en `.ghost-visual/runs`. Referencias en `.ghost-visual/baselines`.

**IMPORTANTE:** guardar referencia reemplaza el archivo anterior. El umbral por defecto es 0.01 (1% de píxeles con algún canal RGBA que difiere más de 16/255). Capturas del viewport visible, no página completa. No se normalizan fechas, contenidos aleatorios o peticiones asíncronas; pueden causar falsos positivos. La comparación de capturas no certifica accesibilidad ni calidad de UX.

## Seguridad y alcance
- Solo URLs localhost/127.0.0.1; el servidor se enlaza a 127.0.0.1.
- No ejecutes pruebas sobre datos reales; el contenido de los sitios locales puede producir efectos secundarios.
- Las capturas pueden contener datos confidenciales y permanecen en disco. No compartas `.ghost-visual` ni la publiques en GitHub.
- En esta fase se utiliza Chromium, no una granja real de navegadores ni dispositivos físicos.
- El modo comparación sin referencia produce NO_BASELINE; no crea implícitamente una referencia.
- Para resultado global PASS no debe haber error visual, de red, ni de las comprobaciones anteriores.
- Queda pendiente una validación end-to-end en Chromium en un entorno con dependencias instaladas.

`npm test` ejecuta las pruebas locales de validación/API.

## Fase 5 — Premium Experience (v0.5.0)
- Skins Mint, Violet y Amber. La selección se guarda en localStorage.
- Métricas resumidas y galería de resultados.
- Historial persistente de un máximo de 40 ejecuciones correctas del motor, almacenadas en `data/history.json` (local, sin nube).
- Consulta de informes anteriores y borrado voluntario desde el panel.
- El historial puede contener URLs y detalles de errores: evita introducir información confidencial en aplicaciones auditadas. La carpeta `data/` se excluye de Git.
- Esta fase no certifica Chromium en Windows; instala dependencias y navegador antes de probar un recorrido real.

## Fase 6: informes y Quality Gate
- La interfaz permite descargar el informe de cada sesión (JSON y HTML) desde **EXPORTAR**.
- Endpoint local: `/api/report/<UUID>.json` y `.html`. Las descargas incluyen la decisión del gate.
- `src/release.js` aplica un gate conservador (errores de red/JS/HTTP, enlaces rotos, clics fallidos, regresiones visuales, resultado general y journey). `ALLOW` solo significa que las verificaciones ejecutadas pasaron.
- `npm run test:ci` levanta una **app local de ejemplo**, ejecuta Chromium con Playwright, guarda `reports/ghost-report.json` y `.html` y devuelve código distinto de 0 si el gate bloquea.
- `.github/workflows/ghost-test.yml` automatiza la ejecución en GitHub Actions. No despliega a GitHub Pages ni prueba aplicaciones remotas. El workflow instala las dependencias en cada ejecución; para CI reproducible conviene generar y confirmar un `package-lock.json` desde una máquina con acceso al registro npm.
- Para integrar con ReleaseForge: consumir el JSON y bloquear el release cuando `gate.decision` sea `BLOCK`; la integración entre aplicaciones todavía requiere adaptar el contrato del receptor.
- No guardes secretos, contraseñas ni datos reales en páginas de prueba o artefactos públicos de CI.

## Fase 7 — Auditoría y límites verificados
- Las pruebas HTTP bloquean un encabezado `Host` inesperado y las solicitudes POST de más de 16 KiB retornan 413.
- Las peticiones del navegador durante la inspección principal se restringen al mismo origen que la URL autorizada; las del Journey y Visual Lab ya tenían límites equivalentes.
- El servidor solo escucha en `127.0.0.1`; las operaciones de modificación de historial y ejecución requieren un origen local coincidente.
- Las pruebas unitarias y de servidor se ejecutan con `npm test`. El flujo E2E está definido en `npm run test:ci`, pero necesita instalar Playwright y Chromium.
- **No se ha certificado Windows real ni el motor de Playwright en esta entrega**; tampoco se ha ejecutado GitHub Actions desde este entorno.
- No se han comprobado manualmente todos los botones con un navegador real. El panel y las interacciones requieren validación E2E antes de asignar etiqueta STABLE.
- Los clics sobre aplicaciones ajenas pueden causar efectos secundarios incluso con el filtro; prueba solamente datos desechables.

## Pasos de aceptación en Windows
1. Ejecuta `INSTALAR_WINDOWS.bat` y `INICIAR_GHOST_TEST_404.bat`.
2. Abre `http://127.0.0.1:4177`, cambia los tres temas y actualiza la página para comprobar persistencia.
3. Ejecuta `npm test` y `npm run test:ci` desde la carpeta del proyecto; comprueba que generan los informes.
4. Ejecuta un Journey sobre una app de pruebas que guarde datos y verifica su persistencia tras `reload`.
5. Genera baseline y compara capturas en escritorio, tablet y móvil; verifica diferencias.
6. Descarga HTML/JSON, recupera sesión del historial y prueba borrado.
7. Comprueba la pestaña **Actions** en GitHub tras subirlo; debe superar el workflow en Ubuntu.


## RC3 — Prueba funcional de persistencia en CI

`npm run test:ci` ahora ejecuta un escenario de siete pasos contra una aplicación de prueba desechable: verifica el formulario, rellena un campo, pulsa Guardar, comprueba el texto, recarga y vuelve a comprobar la persistencia en `localStorage`. Requiere Playwright y Chromium instalados. No se ha ejecutado aquí por indisponibilidad de dependencias npm; no debe considerarse una prueba de navegador superada hasta ejecutarse en Windows o GitHub Actions.


## RC4 — CI más estricto
La puerta de CI exige que el recorrido de persistencia exista y termine en PASS; los informes HTML y JSON reflejan esa misma decisión. El recorrido debe registrar siete pasos. `npm test` cubre la política, pero la integración real con Chromium sigue pendiente en este entorno. No se incluye `package-lock.json`: la generación requiere acceso al registro npm y no debe simularse.


## Auditoría RC5 — límites de certificación

- Los enlaces locales se comprueban con `HEAD`, sin redirecciones; HTTP 404/410 se señalan como rotos y los HTTP 405 quedan como `UNVERIFIED`. Algunos servidores pueden responder diferente a HEAD y GET.
- `Release Gate` admite `requirements: {journey:true,verifiedLinks:true,visual:true}` para bloquear cobertura insuficiente; la CI exige `journey:true`.
- **Pendiente:** generar `package-lock.json` desde un entorno con acceso a npm, subirlo al repositorio y cambiar el workflow a `npm ci`. Hasta entonces las instalaciones no son completamente reproducibles.
- **Pendiente:** ejecutar la prueba Playwright con Chromium, controles de UI y Actions en Windows/GitHub. No etiquetar `STABLE` sin evidencias de estos pasos.

## RC6 — Quality Gate y pruebas del panel (2026-10-10)

- El Release Gate bloquea cobertura de controles truncada, clics inconclusos / bloqueados y journeys con estado diferente de PASS.
- Cuando se exige `verifiedLinks`, todos los enlaces enumerados deben tener estado `VERIFIED`; un enlace omitido no equivale a uno comprobado.
- `npm run test:browser` ejecuta una prueba Playwright sobre **el panel real**, verificando carga/health, cambios de skin y persistencia, validación del formulario, cancelación de borrado de historial, ausencia de errores JS y visibilidad en tres anchuras.
- GitHub Actions invoca esta prueba de navegador después del test de integración sobre la fixture.
- Los tests unitarios / servidor se ejecutaron aquí: 23/23 correctos. **No se ha ejecutado** el test de navegador en este entorno porque Playwright no está instalado y el registro npm no es accesible.
- La instalación reproducible sigue pendiente: no se incluye un package-lock.json generado y verificado por npm. `npm install` deberá ejecutarse en un ordenador con acceso al registro; versionar después el lockfile y sustituir por `npm ci` tanto en CI como en Windows.
- Esta versión es una **release candidate RC6**, no una versión STABLE ni una certificación 9,5/10.
