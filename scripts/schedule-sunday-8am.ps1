<#
.SYNOPSIS
    Schedules the Weekly Performance Report to run every Sunday at 8:00 AM via Windows Task Scheduler.
.DESCRIPTION
    Creates or updates the scheduled task "DailyQandA_WeeklyReport_Sunday8AM" to execute
    node scripts/send-weekly-report.js every Sunday at 08:00 AM.
#>

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$TargetScript = Join-Path $ScriptDir "send-weekly-report.js"
$TaskName = "DailyQandA_WeeklyReport_Sunday8AM"

Write-Host "===================================================================" -ForegroundColor Cyan
Write-Host " Daily Q&A Banking Platform - Sunday 8:00 AM Weekly Report Scheduler" -ForegroundColor Cyan
Write-Host "===================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "[INFO] Target script: $TargetScript" -ForegroundColor Gray
Write-Host "[INFO] Schedule: Weekly on Sunday at 08:00 AM" -ForegroundColor Gray
Write-Host "[INFO] Cron Equivalent: 0 8 * * 0" -ForegroundColor Gray
Write-Host ""

if (-not (Test-Path $TargetScript)) {
    Write-Error "Target script '$TargetScript' does not exist."
    exit 1
}

$NodeCmd = Get-Command node -ErrorAction SilentlyContinue
if ($NodeCmd -and $NodeCmd.Source -and (Test-Path $NodeCmd.Source)) {
    $NodePath = $NodeCmd.Source
} elseif (Test-Path "C:\Program Files\nodejs\node.exe") {
    $NodePath = "C:\Program Files\nodejs\node.exe"
} else {
    $WingetNode = Get-ChildItem -Path "$env:LOCALAPPDATA\Microsoft\WinGet\Packages" -Filter "node.exe" -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty FullName
    if ($WingetNode -and (Test-Path $WingetNode)) {
        $NodePath = $WingetNode
    } else {
        $NodePath = "node.exe"
    }
}
Write-Host "[INFO] Node.js executable: $NodePath" -ForegroundColor Gray

$Action = New-ScheduledTaskAction -Execute $NodePath -Argument "`"$TargetScript`"" -WorkingDirectory $ScriptDir
$Trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Sunday -At 8:00AM
$Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable

try {
    # Check if task already exists and unregister it cleanly
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue | Out-Null
    Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Settings $Settings -Description "Daily Q&A Banking Platform - Sunday 8:00 AM Weekly Report Dispatcher" | Out-Null
    Write-Host "[SUCCESS] Task '$TaskName' successfully registered!" -ForegroundColor Green
    Write-Host ""
    Get-ScheduledTask -TaskName $TaskName | Select-Object TaskName, State, @{Name="NextRunTime";Expression={(Get-ScheduledTaskInfo -TaskName $TaskName).NextRunTime}} | Format-Table -AutoSize
} catch {
    Write-Warning "PowerShell ScheduledTask cmdlet encountered: $_"
    Write-Host "[FALLBACK] Attempting registration via schtasks.exe..." -ForegroundColor Yellow
    $cmd = "schtasks /create /tn `"$TaskName`" /tr `"node \`"$TargetScript\`"`" /sc WEEKLY /d SUN /st 08:00 /f"
    Invoke-Expression $cmd
}
