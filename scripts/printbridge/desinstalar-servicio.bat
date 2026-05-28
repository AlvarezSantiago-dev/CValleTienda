@echo off
:: Cambiar al directorio donde está este bat (crítico cuando se ejecuta como Admin)
cd /d "%~dp0"

echo ============================================
echo   CValle PrintBridge - Desinstalacion
echo ============================================
echo.

net session >nul 2>&1
if %errorLevel% neq 0 (
    echo ERROR: Ejecuta este archivo como Administrador.
    pause
    exit /b 1
)

echo Deteniendo y eliminando el servicio de Windows...
node src\service.js uninstall

echo.
echo ============================================
echo   PrintBridge desinstalado correctamente.
echo ============================================
pause
