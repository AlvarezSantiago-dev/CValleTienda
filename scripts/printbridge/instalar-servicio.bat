@echo off
:: Cambiar al directorio donde está este bat (crítico cuando se ejecuta como Admin)
cd /d "%~dp0"

echo ============================================
echo   CValle PrintBridge - Instalacion
echo ============================================
echo.
echo Este proceso requiere permisos de Administrador.
echo.

:: Verificar si se ejecuta como admin
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo ERROR: Ejecuta este archivo como Administrador.
    echo Clic derecho ^> "Ejecutar como administrador"
    pause
    exit /b 1
)

:: Instalar dependencias si no existen
if not exist "node_modules" (
    echo Instalando dependencias...
    call npm install --omit=dev
    if %errorLevel% neq 0 (
        echo ERROR: No se pudieron instalar las dependencias.
        echo Asegurate de tener Node.js instalado: https://nodejs.org
        pause
        exit /b 1
    )
)

echo.
echo Registrando servicio de Windows...
node src\service.js install

if %errorLevel% neq 0 (
    echo.
    echo ERROR: No se pudo instalar el servicio.
    pause
    exit /b 1
)

echo.
echo Abriendo panel de configuracion...
timeout /t 3 /nobreak >nul
start http://localhost:9100

echo.
echo ============================================
echo   PrintBridge instalado correctamente!
echo   Configuralo en: http://localhost:9100
echo ============================================
pause
