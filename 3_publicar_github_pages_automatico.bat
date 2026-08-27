@echo off
setlocal
title DubCraft Studio - Publicador Isolado para GitHub Pages

echo ========================================================
echo   Publicador para GitHub Pages
echo ========================================================
echo.

cd /d "%~dp0"

echo [1/4] Gerando compilacao com Vite...
call 2_gerar_build_pages.bat

if not exist "%~dp0dist\index.html" (
    echo [ERRO] A pasta dist nao foi gerada corretamente.
    pause
    exit /b 1
)

echo.
echo [2/4] Verificando repositorio de destino...

set CONFIG_FILE=%~dp0github_pages_repo.txt
set REPO_URL=

if exist "%CONFIG_FILE%" (
    set /p REPO_URL=<"%CONFIG_FILE%"
)

if "%REPO_URL%"=="" (
    echo.
    echo Digite a URL do seu repositorio no GitHub:
    echo Exemplo: https://github.com/RafaelGodoyEbert/DubCraft.git
    echo.
    set /p REPO_URL="URL do Repositorio: "
    echo %REPO_URL%>"%CONFIG_FILE%"
) else (
    echo Repositorio configurado: %REPO_URL%
)

echo.
echo [3/4] Preparando Git na pasta dist...
cd /d "%~dp0dist"

if not exist ".git" (
    git init
    git branch -M main
    git remote add origin %REPO_URL%
) else (
    git remote set-url origin %REPO_URL%
)

git add -A
git commit -m "Deploy atualizado para GitHub Pages (%date% %time%)"

echo.
echo [4/4] Enviando para o GitHub Pages...
git push -u origin main --force

if errorlevel 1 (
    echo.
    echo [AVISO] Ocorreu um erro no git push.
) else (
    echo.
    echo ========================================================
    echo   Publicacao concluida com sucesso no GitHub Pages!
    echo ========================================================
)

echo.
pause
