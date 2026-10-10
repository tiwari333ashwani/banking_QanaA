<#
.SYNOPSIS
    Direct App Launcher for Daily Q&A Banking Platform
.DESCRIPTION
    Refreshes PATH for Node.js, activates Python venv, launches Next.js dev server,
    and opens the UI in your default browser.
#>

$ErrorActionPreference = "Continue"

Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host " Daily Q&A Banking Platform - Direct Launcher" -ForegroundColor Cyan
Write-Host "=======================================================" -ForegroundColor Cyan

# 1. Refresh PATH from Windows environment to guarantee Node & npm are detected
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

# Fallback: locate Node.js if installed via WinGet or custom directory
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    $WingetNode = Get-ChildItem -Path "$env:LOCALAPPDATA\Microsoft\WinGet\Packages" -Filter "node.exe" -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($WingetNode) {
        $NodeDir = $WingetNode.DirectoryName
        $env:Path = "$NodeDir;$env:Path"
        Write-Host "[INFO] Located Node.js at $NodeDir" -ForegroundColor Gray
    }
}

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Error "Node.js executable could not be found. Please ensure Node.js is installed."
    pause
    exit 1
}

# 2. Check and activate Python virtual environment if present
$ProjectRoot = $PSScriptRoot
if (-not $ProjectRoot) { $ProjectRoot = Get-Location }
Set-Location $ProjectRoot

$VenvActivate = Join-Path $ProjectRoot "venv\Scripts\Activate.ps1"
if (Test-Path $VenvActivate) {
    Write-Host "[INFO] Activating Python virtual environment..." -ForegroundColor Green
    & $VenvActivate
}

# 3. Check node_modules
if (-not (Test-Path (Join-Path $ProjectRoot "node_modules"))) {
    Write-Host "[INFO] node_modules not found. Installing dependencies..." -ForegroundColor Yellow
    npm.cmd install
}

# 4. Open default browser after 3 seconds in a background thread
Start-Job -ScriptBlock {
    Start-Sleep -Seconds 3
    Start-Process "http://localhost:3000"
} | Out-Null

Write-Host ""
Write-Host ">> Server starting on: http://localhost:3000" -ForegroundColor Green
Write-Host ">> Opening browser automatically in 3 seconds..." -ForegroundColor Gray
Write-Host ">> Press [Ctrl + C] in this window to stop the server." -ForegroundColor Yellow
Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host ""

# 5. Launch Next.js dev server
npm.cmd run dev
