@echo off
setlocal
title DubCraft Studio - Gerador de Build para GitHub Pages

echo ========================================================
echo   DubCraft Studio - Gerador de Build
echo ========================================================
echo.

cd /d "%~dp0"

if not exist "node_modules" (
    echo [1/3] Instalando dependencias com npm install...
    call npm install
    if errorlevel 1 (
        echo [ERRO] Falha ao instalar dependencias.
        pause
        exit /b 1
    )
)

echo [2/3] Compilando arquivos com Vite build...
call npm run build

if errorlevel 1 (
    echo [ERRO] Ocorreu um erro durante a compilacao do site.
    pause
    exit /b 1
)

echo [3/3] Configurando arquivos para GitHub Pages...
type nul > "dist\.nojekyll"
copy /Y "dist\index.html" "dist\404.html" >nul

if exist "projetos" (
    echo Copiando projetos e audios para dist\projetos...
    xcopy /E /I /Y /Q "projetos" "dist\projetos" >nul
)

echo.
echo ========================================================
echo   SUCESSO! A pasta dist esta 100%% pronta!
echo ========================================================
echo.
pause
