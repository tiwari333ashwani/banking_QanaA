@echo off
setlocal enabledelayedexpansion

echo ===================================================================
echo   Daily Q&A Banking Platform - Copy to Windows Startup Setup
echo ===================================================================
echo.

set STARTUP_DIR=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup
set SCRIPT_DIR=%~dp0
set SOURCE_BAT=%SCRIPT_DIR%windows-startup-launcher.bat
set DEST_BAT=%STARTUP_DIR%\DailyQandA_Startup_WeeklyScheduler.bat

if not exist "%STARTUP_DIR%" (
    echo [ERROR] Windows Startup directory not found at:
    echo "%STARTUP_DIR%"
    exit /b 1
)

if not exist "%SOURCE_BAT%" (
    echo [ERROR] Source file "%SOURCE_BAT%" not found!
    exit /b 1
)

echo [INFO] Windows Startup folder detected at:
echo        %STARTUP_DIR%
echo.
echo [INFO] Copying launcher to Windows Startup...
copy /Y "%SOURCE_BAT%" "%DEST_BAT%" >nul

if %ERRORLEVEL% equ 0 (
    echo.
    echo ===================================================================
    echo [SUCCESS] Successfully copied to Windows Startup!
    echo ===================================================================
    echo File created: "%DEST_BAT%"
    echo.
    echo Next time Windows starts up or you log in, the weekly scheduler
    echo will automatically be verified and kept active.
) else (
    echo [ERROR] Failed to copy launcher to Windows Startup directory.
)

echo.
pause
