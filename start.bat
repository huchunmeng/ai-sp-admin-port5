@echo off
chcp 65001 >nul 2>&1
title AI-SP Launcher
cd /d "%~dp0"
echo.
echo   AI-SP Launcher
echo   sp-api(5100) + training(5001) + admin(5002)
echo   exam(5003) + app-training(5004) + ops(5005)
echo.
node scripts\launcher.mjs --full
pause
