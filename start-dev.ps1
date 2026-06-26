# Vendrix Dev Server Launcher
# Run this once: right-click → "Run with PowerShell", or: pwsh -File start-dev.ps1

$root   = $PSScriptRoot
$node   = "C:\Program Files\nodejs\node.exe"

Write-Host "Starting Vendrix backend..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command",
  "Set-Location '$root\server'; Write-Host 'Backend starting...' -ForegroundColor Green; & '$node' --env-file=.env server.js"

Start-Sleep -Seconds 2

Write-Host "Starting Vendrix frontend..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command",
  "Set-Location '$root\client'; Write-Host 'Frontend starting...' -ForegroundColor Green; & '$node' node_modules\vite\bin\vite.js"

Write-Host ""
Write-Host "Both servers launched in separate windows." -ForegroundColor Yellow
Write-Host "Frontend: http://localhost:5173" -ForegroundColor White
Write-Host "Backend:  http://localhost:5000" -ForegroundColor White
