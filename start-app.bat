@echo off
setlocal
cd /d "%~dp0"

echo =======================================================
echo   Starting Daily Q&A Banking Platform...
echo =======================================================

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-app.ps1"

if %ERRORLEVEL% neq 0 (
    echo.
    echo [ERROR] An error occurred while running start-app.ps1.
    pause
)
