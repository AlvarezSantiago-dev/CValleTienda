@echo off
chcp 65001 >nul
title CValle PrintBridge v3 — Instalador

echo.
echo  ╔══════════════════════════════════════════╗
echo  ║   CValle PrintBridge v3 — Instalador    ║
echo  ╚══════════════════════════════════════════╝
echo.

:: ── 1. Verificar si Node.js está instalado ────────────────────────────────
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo  [!] Node.js no encontrado.
    echo  [!] Instala Node.js primero desde: https://nodejs.org
    echo  [!] O coloca el instalador node-v22.x.x-x64.msi en esta misma carpeta.
    echo.
    :: Si hay un .msi junto al .bat, ejecutarlo automáticamente
    for %%f in ("%~dp0node-*.msi") do (
        echo  Encontre instalador: %%f
        echo  Instalando Node.js...
        msiexec /i "%%f" /qb ADDLOCAL=ALL
        goto :check_node_again
    )
    pause
    exit /b 1
)

:check_node_again
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo  [ERROR] Node.js aun no esta disponible. Reinicia el instalador despues de instalar Node.js.
    pause
    exit /b 1
)

for /f "tokens=*" %%v in ('node -v') do set NODE_VER=%%v
echo  [OK] Node.js %NODE_VER% encontrado.
echo.

:: ── 2. Instalar dependencias npm ──────────────────────────────────────────
echo  Instalando dependencias (puede tardar un minuto)...
cd /d "%~dp0"
call npm install --omit=dev
if %ERRORLEVEL% NEQ 0 (
    echo  [ERROR] npm install fallo. Verificar conexion a internet.
    pause
    exit /b 1
)
echo  [OK] Dependencias instaladas.
echo.

:: ── 3. Crear acceso directo en el Escritorio ──────────────────────────────
set DESKTOP=%USERPROFILE%\Desktop
set SHORTCUT=%DESKTOP%\CValle PrintBridge.lnk
set WORKDIR=%~dp0

> "%TEMP%\pb3_shortcut.ps1" echo $ws = New-Object -ComObject WScript.Shell
>> "%TEMP%\pb3_shortcut.ps1" echo $s = $ws.CreateShortcut('%SHORTCUT%')
>> "%TEMP%\pb3_shortcut.ps1" echo $s.TargetPath = '%WORKDIR%start.bat'
>> "%TEMP%\pb3_shortcut.ps1" echo $s.WorkingDirectory = '%WORKDIR%'
>> "%TEMP%\pb3_shortcut.ps1" echo $s.IconLocation = 'shell32.dll,16'
>> "%TEMP%\pb3_shortcut.ps1" echo $s.Description = 'CValle PrintBridge v3'
>> "%TEMP%\pb3_shortcut.ps1" echo $s.Save()
powershell -NoProfile -ExecutionPolicy Bypass -File "%TEMP%\pb3_shortcut.ps1"
del "%TEMP%\pb3_shortcut.ps1" >nul 2>&1

echo  [OK] Acceso directo creado en el Escritorio.
echo.

:: ── 4. Configurar inicio automático con Windows ───────────────────────────
set STARTUP=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup
copy /Y "%~dp0start.bat" "%STARTUP%\CValle PrintBridge.bat" >nul

echo  [OK] Configurado para iniciar con Windows.
echo.

echo  ═══════════════════════════════════════════
echo   Instalacion completada!
echo.
echo   Para usar:
echo   1. Abre "CValle PrintBridge" desde el Escritorio
echo   2. Configura las impresoras en http://localhost:9100
echo   3. Listo — se inicia automaticamente con Windows
echo  ═══════════════════════════════════════════
echo.
pause
