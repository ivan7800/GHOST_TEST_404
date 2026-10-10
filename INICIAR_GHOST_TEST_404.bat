@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>&1 || (echo Falta Node.js & pause & exit /b 1)
if not exist "node_modules\playwright" (echo Ejecuta primero INSTALAR_WINDOWS.bat & pause & exit /b 1)
start "" "http://127.0.0.1:4177"
node src\server.js
if errorlevel 1 pause
