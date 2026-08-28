@echo off
chcp 65001 >nul
title DubCraft - Upload para Hugging Face CDN

echo =======================================================
echo          DubCraft - Enviar Áudios para Nuvem
echo =======================================================
echo.
python scripts\upload_to_hf.py
echo.
pause
