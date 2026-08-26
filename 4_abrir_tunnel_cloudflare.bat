@echo off
setlocal EnableDelayedExpansion
title DubCraft Studio - Cloudflare Tunnel

echo ========================================================
echo   DubCraft Studio - Tunnel Cloudflare (Link Publico)
echo ========================================================
echo.

cd /d "%~dp0"

set "CLOUDFLARED_EXE=%~dp0cloudflared.exe"

rem 1. Verifica se cloudflared.exe ja existe
if exist "%CLOUDFLARED_EXE%" (
    echo [1/3] Cloudflared pronto.
    goto CHECAR_SERVIDOR
)

where cloudflared >nul 2>&1
if %errorlevel% equ 0 (
    set "CLOUDFLARED_EXE=cloudflared"
    echo [1/3] Cloudflared encontrado no sistema.
    goto CHECAR_SERVIDOR
)

echo [1/3] Baixando Cloudflared oficial para Windows...
powershell -NoProfile -ExecutionPolicy Bypass -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; (New-Object System.Net.WebClient).DownloadFile('https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe', '%~dp0cloudflared.exe')"

if not exist "%CLOUDFLARED_EXE%" (
    echo [ERRO] Nao foi possivel baixar o cloudflared.exe automaticamente.
    echo Baixe manualmente em: https://github.com/cloudflare/cloudflared/releases
    pause
    exit /b 1
)

:CHECAR_SERVIDOR
rem 2. Verifica se o servidor local na porta 3000 esta rodando. Se nao estiver, inicia automaticamente!
echo [2/3] Verificando servidor local na porta 3000...
powershell -NoProfile -Command "$client = New-Object System.Net.Sockets.TcpClient; try { $client.Connect('127.0.0.1', 3000); exit 0 } catch { exit 1 } finally { $client.Dispose() }" >nul 2>&1

if %errorlevel% neq 0 (
    echo [INFO] Servidor local nao estava rodando. Iniciando automaticamente...
    start "DubCraft Local Server" cmd /c "cd /d ""%~dp0"" && npm run dev"
    echo Aguardando servidor inicializar...
    timeout /t 3 /nobreak >nul
) else (
    echo [OK] Servidor local ativo na porta 3000.
)

:EXECUTAR_TUNNEL
echo.
echo [3/3] Iniciando tunel para http://127.0.0.1:3000 ...
echo.
echo ========================================================
echo  Procure abaixo a linha contendo o link do tunel:
echo  Exemplo: https://xxxx-xxxx.trycloudflare.com
echo ========================================================
echo.

"%CLOUDFLARED_EXE%" tunnel --url http://127.0.0.1:3000

pause
