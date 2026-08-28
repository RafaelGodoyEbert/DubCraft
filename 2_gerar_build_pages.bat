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

echo [3/3] Configurando arquivos para GitHub Pages (.nojekyll, 404.html)...
type nul > "dist\.nojekyll"
copy /Y "dist\index.html" "dist\404.html" >nul

echo.
echo ========================================================
echo   SUCESSO! Build compilada com sucesso para o Pages!
echo   Os audios sao transmitidos via Hugging Face CDN.
echo ========================================================
echo.
pause
