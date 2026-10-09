@echo off
echo Removing DailyQandA_WeeklyReport_Sunday8AM scheduled task...
schtasks /delete /tn "DailyQandA_WeeklyReport_Sunday8AM" /f
if %ERRORLEVEL% equ 0 (
    echo [SUCCESS] Scheduled task removed successfully.
) else (
    echo [NOTICE] Task was not found or already removed.
)
pause
