@echo off
chcp 65001 >nul
title DubCraft Studio - Gerador de Build para GitHub Pages
echo ========================================================
echo   📦  Gerando Build do Site para GitHub Pages
echo ========================================================
echo.

cd /d "%~dp0"

if not exist "node_modules" (
    echo [1/3] Instalando dependências (npm install)...
    call npm install
    if %errorlevel% neq 0 (
        echo [ERRO] Falha ao instalar dependências.
        pause
        exit /b %errorlevel%
    )
)

echo [2/3] Compilando arquivos de produção com Vite...
call npm run build

if %errorlevel% neq 0 (
    echo.
    echo [ERRO] Ocorreu um erro durante a compilação do site.
    pause
    exit /b %errorlevel%
)

echo [3/3] Configurando arquivos essenciais para GitHub Pages...
rem Cria .nojekyll para evitar que o GitHub Pages ignore arquivos com underline ou módulos
type nul > "dist\.nojekyll"

rem Copia index.html para 404.html para suportar navegação SPA sem erro 404 ao recarregar a página
copy /Y "dist\index.html" "dist\404.html" >nul

rem Copia a pasta projetos para dist para que os áudios e imagens fiquem disponíveis no GitHub Pages
if exist "projetos" (
    echo Copiando áudios e dados dos projetos para dist\projetos...
    xcopy /E /I /Y /Q "projetos" "dist\projetos" >nul
)

echo.
echo ========================================================
echo  ✅ SUCESSO! A pasta "dist" está 100%% pronta para o GitHub Pages!
echo.
echo  Local dos arquivos gerados:
echo  %~dp0dist
echo ========================================================
echo.
echo Abrindo a pasta dist no Windows Explorer...
explorer "%~dp0dist"

echo.
pause
