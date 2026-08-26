@echo off
chcp 65001 >nul
title DubCraft Studio - Publicador Isolado para GitHub Pages
echo ========================================================
echo   🚀  Publicador Isolado para GitHub Pages
echo ========================================================
echo.
echo Este script publica APENAS a pasta "dist" em um repositório
echo separado no GitHub, SEM interferir no Git do projeto principal.
echo.

cd /d "%~dp0"

rem 1. Gerar o build atualizado
echo [1/4] Gerando compilação otimizada...
call 2_gerar_build_pages.bat

if not exist "%~dp0dist\index.html" (
    echo [ERRO] A pasta dist não foi gerada corretamente.
    pause
    exit /b 1
)

echo.
echo [2/4] Verificando repositório de destino do GitHub Pages...

set CONFIG_FILE=%~dp0github_pages_repo.txt
set REPO_URL=

if exist "%CONFIG_FILE%" (
    set /p REPO_URL=<"%CONFIG_FILE%"
)

if "%REPO_URL%"=="" (
    echo.
    echo Digite ou cole a URL do seu repositório SEPARADO no GitHub
    echo Exemplo: https://github.com/SEU_USUARIO/dublagem-comunidade.git
    echo.
    set /p REPO_URL="URL do Repositório: "
    echo %REPO_URL%>"%CONFIG_FILE%"
) else (
    echo Repositório configurado: %REPO_URL%
    echo (Para alterar, edite ou apague o arquivo github_pages_repo.txt)
    echo.
)

if "%REPO_URL%"=="" (
    echo [ERRO] Nenhuma URL informada. Abortando.
    pause
    exit /b 1
)

echo.
echo [3/4] Preparando Git isolado na pasta dist...
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
echo [4/4] Enviando arquivos para o GitHub...
git push -u origin main --force

if %errorlevel% equ 0 (
    echo.
    echo ========================================================
    echo  🎉 Publicação concluída com sucesso!
    echo.
    echo  Seu site estará online em instantes no GitHub Pages!
    echo  (Certifique-se de que nas configurações do repositório
    echo   em 'Settings' ^> 'Pages', a fonte esteja configurada
    echo   para 'Deploy from a branch' com a branch 'main' e pasta '/')
    echo ========================================================
) else (
    echo.
    echo [AVISO] Ocorreu um erro no git push.
    echo Verifique suas permissões de acesso ao repositório no GitHub.
)

echo.
pause
