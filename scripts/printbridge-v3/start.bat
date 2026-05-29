@echo off
cd /d "%~dp0"
title CValle PrintBridge v3
echo Iniciando CValle PrintBridge v3...
echo Abre http://localhost:9100 para configurar.
echo Deja esta ventana abierta (o minimizala).
echo.
node server.js
pause
