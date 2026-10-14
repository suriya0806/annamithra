# SAMAYA - Startup script for Backend (.NET API) and Frontend (Vite React)
$ErrorActionPreference = "Stop"

$workspaceRoot = Split-Path -Parent $PSScriptRoot
$backendDir = Join-Path $workspaceRoot "backend\Samaya.API"
$frontendDir = Join-Path $workspaceRoot "frontend"
$publishDir = "C:\Users\DELL\AppData\Local\SamayaBuild"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " Starting SAMAYA Application" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# 1. Check MySQL
Write-Host "[1/3] Checking MySQL Service..." -ForegroundColor Yellow
$mysql = Get-Service -Name *mysql* -ErrorAction SilentlyContinue
if ($mysql -and $mysql.Status -eq "Running") {
    Write-Host " MySQL is running." -ForegroundColor Green
} else {
    Write-Host " Warning: MySQL service is not detected as running. Ensure MySQL is started." -ForegroundColor Red
}

# 2. Build and publish backend outside Downloads folder to satisfy Windows Smart App Control
Write-Host "[2/3] Building and starting Backend API (http://localhost:5042)..." -ForegroundColor Yellow
dotnet publish "$backendDir\Samaya.API.csproj" -c Debug -o $publishDir --nologo -v quiet

Start-Process -FilePath "dotnet" `
    -ArgumentList "`"$publishDir\Samaya.Server.dll`"" `
    -WorkingDirectory $publishDir `
    -Environment @{
        "ASPNETCORE_URLS" = "http://localhost:5042";
        "ASPNETCORE_ENVIRONMENT" = "Development"
    } `
    -WindowStyle Minimized

# 3. Start Frontend
Write-Host "[3/3] Starting Frontend (http://localhost:5173)..." -ForegroundColor Yellow
Start-Process -FilePath "cmd.exe" `
    -ArgumentList "/c npm run dev" `
    -WorkingDirectory $frontendDir `
    -WindowStyle Minimized

Write-Host "`nSAMAYA is now running!" -ForegroundColor Green
Write-Host "  - Frontend: http://localhost:5173" -ForegroundColor Cyan
Write-Host "  - Backend API: http://localhost:5042" -ForegroundColor Cyan
Write-Host "  - Swagger / OpenAPI: http://localhost:5042/openapi/v1.json" -ForegroundColor Cyan
