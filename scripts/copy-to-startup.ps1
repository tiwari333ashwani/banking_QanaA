<#
.SYNOPSIS
    Copies the Weekly Report startup runner into the Windows Startup folder (shell:startup).
.DESCRIPTION
    Places DailyQandA_Startup_WeeklyScheduler.bat into $env:APPDATA\Microsoft\Windows\Start Menu\Programs\Startup.
#>

$StartupDir = [System.IO.Path]::Combine($env:APPDATA, "Microsoft\Windows\Start Menu\Programs\Startup")
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$SourceBat = Join-Path $ScriptDir "windows-startup-launcher.bat"
$DestBat = Join-Path $StartupDir "DailyQandA_Startup_WeeklyScheduler.bat"

Write-Host "===================================================================" -ForegroundColor Cyan
Write-Host " Daily Q&A Banking Platform - Copy to Windows Startup Setup" -ForegroundColor Cyan
Write-Host "===================================================================" -ForegroundColor Cyan
Write-Host ""

if (-not (Test-Path $StartupDir)) {
    Write-Error "Windows Startup folder not found at $StartupDir"
    exit 1
}

if (-not (Test-Path $SourceBat)) {
    Write-Error "Source file '$SourceBat' not found."
    exit 1
}

Write-Host "[INFO] Windows Startup Folder: $StartupDir" -ForegroundColor Gray
Write-Host "[INFO] Installing configured launcher to '$DestBat'..." -ForegroundColor Gray

$Content = Get-Content $SourceBat -Raw
$NormalizedScriptDir = $ScriptDir.TrimEnd('\') + '\'
$UpdatedContent = $Content -replace 'set SCRIPT_DIR=.*', "set SCRIPT_DIR=$NormalizedScriptDir"
Set-Content -Path $DestBat -Value $UpdatedContent -Force


if (Test-Path $DestBat) {
    Write-Host ""
    Write-Host "===================================================================" -ForegroundColor Green
    Write-Host "[SUCCESS] Successfully copied to Windows Startup!" -ForegroundColor Green
    Write-Host "Destination: $DestBat" -ForegroundColor Green
    Write-Host "===================================================================" -ForegroundColor Green
} else {
    Write-Error "Failed to copy file to Windows Startup directory."
}
