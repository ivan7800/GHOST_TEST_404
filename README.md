# GHOST TEST 404

[![Ghost Test QA](https://github.com/ivan7800/GHOST_TEST_404/actions/workflows/ghost-test.yml/badge.svg)](https://github.com/ivan7800/GHOST_TEST_404/actions/workflows/ghost-test.yml)

Laboratorio local de QA para aplicaciones web: comprueba controles, errores de navegador y red, recorridos funcionales, capturas visuales e informes con una puerta de calidad.

> **Estado:** RC7, candidata a release. La etiqueta STABLE requiere que la nueva ejecución de GitHub Actions termine correctamente y que se valide la instalación en Windows. El repositorio todavía no incluye un `package-lock.json`, por lo que la instalación no es totalmente reproducible.

## Qué incluye

- Auditoría de aplicaciones de prueba en `localhost` o `127.0.0.1`.
- Diagnóstico con Chromium de controles, errores JavaScript, fallos HTTP/red y enlaces.
- Escenarios funcionales configurables en JSON, con aserciones y pasos como rellenar, hacer clic y recargar.
- Visual Lab con capturas de escritorio, tablet y móvil; guardado y comparación de referencias.
- Historial local, informes JSON/HTML y Release Gate con decisión `ALLOW` o `BLOCK`.
- Interfaz en español con tres temas visuales.
- Suite automatizada y GitHub Actions para pruebas unitarias, recorrido funcional de fixture y prueba de humo del panel.

## Requisitos

- Node.js 20 o superior y npm.
- Windows para los lanzadores `.bat`. En otros sistemas, usa los comandos npm de abajo.
- Chromium para las pruebas de navegador y para ejecutar diagnósticos desde el panel.

## Instalación y uso en Windows

1. Descarga o clona este repositorio.
2. Ejecuta `INSTALAR_WINDOWS.bat`. Instala las dependencias npm y Chromium.
3. Ejecuta `INICIAR_GHOST_TEST_404.bat`.
4. Abre [http://127.0.0.1:4177](http://127.0.0.1:4177).

También puedes ejecutarlo desde una terminal:

```bash
npm install
npx playwright install chromium
npm start
```

## Ejecutar las pruebas

```bash
npm test
npm run test:ci
npm run test:browser
```

- `npm test`: pruebas unitarias, de servidor y contratos de interfaz.
- `npm run test:ci`: ejecuta un recorrido funcional contra una aplicación de fixture local y genera informes.
- `npm run test:browser`: abre el panel real con Chromium y comprueba salud, temas, validación, historial, consola y varios tamaños de pantalla.

La CI también ejecuta estos tres comandos en Ubuntu. Consulta la pestaña **Actions** para ver el resultado de cada commit.

## Uso seguro

- El motor limita los destinos a `localhost` y `127.0.0.1`; no está pensado para probar sitios públicos o de producción.
- Usa aplicaciones y cuentas con datos desechables. Los recorridos y clics pueden modificar datos.
- Guardar una baseline visual sustituye la referencia anterior. La comparación puede señalar diferencias por contenido dinámico, fechas o carga asíncrona.
- Las capturas, el historial y los informes pueden contener URLs, datos o errores de la aplicación probada. Revísalos antes de compartirlos.
- La carpeta `.ghost-visual/`, los datos locales, informes, dependencias y resultados de pruebas se excluyen de Git mediante `.gitignore`.
- `ALLOW` significa que las comprobaciones configuradas pasaron; no certifica accesibilidad, seguridad completa ni calidad de UX.

## Límites conocidos

- No hay `package-lock.json`; hasta que se genere y se confirme, npm puede resolver versiones distintas entre instalaciones. La CI instala dependencias con `npm install`.
- La prueba visual compara capturas de Chromium y no sustituye pruebas en dispositivos físicos ni en otros navegadores.
- Un resultado satisfactorio de CI comprueba el código en Ubuntu; la instalación y el uso en Windows deben validarse en Windows.

## Licencia

Aún no se ha declarado una licencia. Todos los derechos quedan reservados por defecto; solicita autorización antes de reutilizar o distribuir este código.

## Estructura

- `public/`: interfaz web.
- `src/`: servidor local, auditoría, recorridos, pruebas visuales, historial e informes.
- `tests/`: pruebas unitarias y de contratos.
- `scripts/`: ejecución de la fixture CI y smoke test del panel.
- `.github/workflows/ghost-test.yml`: pipeline de GitHub Actions.

