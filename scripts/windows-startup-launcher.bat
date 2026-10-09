@echo off
:: Windows Startup Helper for Daily Q&A Banking Platform
:: Placed in shell:startup (%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup)
:: Ensures Sunday 8 AM scheduled task is registered and active upon Windows user login.

set SCRIPT_DIR=c:\Users\Admin\Desktop\Projects\ashu\dailyQandA_banking\scripts\

:: 1. Ensure the Sunday 8 AM scheduled task is registered in Windows Task Scheduler
schtasks /query /tn "DailyQandA_WeeklyReport_Sunday8AM" >nul 2>&1
if %ERRORLEVEL% neq 0 (
    schtasks /create /tn "DailyQandA_WeeklyReport_Sunday8AM" /tr "node \"%SCRIPT_DIR%send-weekly-report.js\"" /sc WEEKLY /d SUN /st 08:00 /f >nul 2>&1
)

:: 2. Check if today is Sunday and whether it is 8:00 AM or later
for /f %%a in ('powershell -NoProfile -Command "(Get-Date).DayOfWeek"') do set CURRENT_DOW=%%a
for /f %%b in ('powershell -NoProfile -Command "(Get-Date).Hour"') do set CURRENT_HOUR=%%b

:: Optional catch-up: if computer was powered off at exactly 8:00 AM on Sunday, send weekly report now
if /i "%CURRENT_DOW%"=="Sunday" (
    if %CURRENT_HOUR% geq 8 (
        node "%SCRIPT_DIR%send-weekly-report.js" >nul 2>&1
    )
)
