@echo off
setlocal
title DubCraft Studio - Servidor Local

echo ========================================================
echo   DubCraft Studio - Servidor Local
echo ========================================================
echo.

cd /d "%~dp0"

if not exist "node_modules" (
    echo [1/2] Instalando dependencias (npm install)...
    call npm install
    if errorlevel 1 (
        echo [ERRO] Falha ao instalar dependencias.
        pause
        exit /b 1
    )
)

echo [2/2] Iniciando servidor de desenvolvimento local...
echo Abrindo em http://localhost:3000 ...
echo.

start "" "http://localhost:3000"
call npm run dev
pause
