@echo off
chcp 65001 >nul
title DubCraft Studio - Instalador e Servidor Local
echo ========================================================
echo   🎙️  DubCraft Studio - Instalador e Modo Local
echo ========================================================
echo.

cd /d "%~dp0"

if not exist "node_modules" (
    echo [1/2] Instalando dependências (npm install)...
    call npm install
    if %errorlevel% neq 0 (
        echo.
        echo [ERRO] Falha ao instalar dependências com npm.
        pause
        exit /b %errorlevel%
    )
) else (
    echo [1/2] Dependências já instaladas.
)

echo.
echo [2/2] Iniciando servidor de desenvolvimento local...
echo Abrindo em http://localhost:3000 ...
echo Pressione Ctrl+C na janela para encerrar.
echo.

start "" "http://localhost:3000"
call npm run dev
pause
