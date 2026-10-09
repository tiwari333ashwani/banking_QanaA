@echo off
setlocal enabledelayedexpansion

echo ===================================================================
echo   Daily Q&A Banking Platform - Sunday 8:00 AM Weekly Report Scheduler
echo ===================================================================
echo.

set SCRIPT_DIR=%~dp0
set TARGET_SCRIPT=%SCRIPT_DIR%send-weekly-report.js

if not exist "%TARGET_SCRIPT%" (
    echo [ERROR] Target script "%TARGET_SCRIPT%" not found!
    exit /b 1
)

echo [INFO] Target script: %TARGET_SCRIPT%
echo [INFO] Schedule: Every Sunday at 08:00 AM (Weekly Report Only)
echo [INFO] Cron Equivalent: 0 8 * * 0
echo.

:: Register in Windows Task Scheduler
schtasks /create /tn "DailyQandA_WeeklyReport_Sunday8AM" /tr "node \"%TARGET_SCRIPT%\"" /sc WEEKLY /d SUN /st 08:00 /f

if %ERRORLEVEL% equ 0 (
    echo.
    echo ===================================================================
    echo [SUCCESS] Task "DailyQandA_WeeklyReport_Sunday8AM" registered successfully!
    echo ===================================================================
    echo.
    echo Task Details:
    schtasks /query /tn "DailyQandA_WeeklyReport_Sunday8AM" /fo LIST
) else (
    echo.
    echo [ERROR] Failed to register Windows scheduled task.
    echo Please make sure you have standard permissions or run as Administrator if required.
)

pause
