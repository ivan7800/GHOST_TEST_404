@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>&1 || (echo ERROR: Instala Node.js 20 o superior desde https://nodejs.org/ & pause & exit /b 1)
echo Instalando dependencias...
if exist package-lock.json (
  call npm ci
) else (
  echo AVISO: package-lock.json ausente, instalacion no reproducible.
  call npm install
)
if errorlevel 1 (echo ERROR al instalar dependencias & pause & exit /b 1)
echo Instalando Chromium para las pruebas...
call npx playwright install chromium || (echo ERROR al descargar Chromium & pause & exit /b 1)
echo Instalacion completada.
pause
