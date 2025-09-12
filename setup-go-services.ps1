# DashDice Go Services Setup Script
# Simplified version for Windows PowerShell
# Updated: All PowerShell Script Analyzer warnings resolved

param(
    [string]$Action = "status"
)

$GoServicesPath = "c:\Users\david\Documents\dashdice\go-services"

Write-Host ""
Write-Host "DashDice Go Services Manager" -ForegroundColor Magenta
Write-Host "============================" -ForegroundColor Magenta
Write-Host ""

function Test-DockerRunning {
    try {
        docker version | Out-Null
        return $true
    }
    catch {
        return $false
    }
}

switch ($Action.ToLower()) {
    "start" {
        Write-Host "Starting DashDice Go microservices..." -ForegroundColor Green
        
        if (!(Test-DockerRunning)) {
            Write-Host "Error: Docker Desktop is not running. Please start Docker Desktop first." -ForegroundColor Red
            exit 1
        }
        
        Set-Location $GoServicesPath
        Write-Host "Building and starting services with Docker Compose..."
        docker-compose up -d --build
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Go services started successfully!" -ForegroundColor Green
            Write-Host ""
            Write-Host "Service URLs:" -ForegroundColor Cyan
            Write-Host "- API Gateway: http://localhost:8080" -ForegroundColor White
            Write-Host "- Match Service: http://localhost:8081" -ForegroundColor White
            Write-Host "- Queue Service: http://localhost:8082" -ForegroundColor White
            Write-Host "- Presence Service: http://localhost:8083" -ForegroundColor White
            Write-Host "- Notification Service: http://localhost:8084" -ForegroundColor White
        } else {
            Write-Host "Failed to start Go services" -ForegroundColor Red
        }
    }
    
    "stop" {
        Write-Host "Stopping DashDice Go microservices..." -ForegroundColor Yellow
        Set-Location $GoServicesPath
        docker-compose down
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Go services stopped successfully!" -ForegroundColor Green
        } else {
            Write-Host "Failed to stop Go services" -ForegroundColor Red
        }
    }
    
    "status" {
        Write-Host "Checking service status..." -ForegroundColor Cyan
        Set-Location $GoServicesPath
        
        if (!(Test-DockerRunning)) {
            Write-Host "Warning: Docker Desktop is not running" -ForegroundColor Yellow
            exit 1
        }
        
        Write-Host ""
        Write-Host "Docker Compose Services:" -ForegroundColor Magenta
        docker-compose ps
        
        Write-Host ""
        Write-Host "Testing service health..." -ForegroundColor Magenta
        
        # Test API Gateway
        try {
            $null = Invoke-WebRequest -Uri "http://localhost:8080/health" -TimeoutSec 5 -UseBasicParsing
            Write-Host "- API Gateway (8080): HEALTHY" -ForegroundColor Green
        }
        catch {
            Write-Host "- API Gateway (8080): NOT RESPONDING" -ForegroundColor Red
        }
        
        # Test Redis
        try {
            docker exec dashdice-redis redis-cli ping | Out-Null
            Write-Host "- Redis: HEALTHY" -ForegroundColor Green
        }
        catch {
            Write-Host "- Redis: NOT RESPONDING" -ForegroundColor Yellow
        }
        
        # Test PostgreSQL
        try {
            docker exec dashdice-postgres pg_isready -U dashdice | Out-Null
            Write-Host "- PostgreSQL: HEALTHY" -ForegroundColor Green
        }
        catch {
            Write-Host "- PostgreSQL: NOT RESPONDING" -ForegroundColor Yellow
        }
    }
    
    "logs" {
        Write-Host "Showing recent logs from all services..." -ForegroundColor Cyan
        Set-Location $GoServicesPath
        docker-compose logs --tail=50 -f
    }
    
    "setup" {
        Write-Host "Setting up Go services integration..." -ForegroundColor Green
        
        # Check required files
        $envFile = "$GoServicesPath\.env"
        $serviceAccountKey = "$GoServicesPath\serviceAccountKey.json"
        
        if (!(Test-Path $envFile)) {
            Write-Host "Error: Missing .env file at $envFile" -ForegroundColor Red
            exit 1
        }
        
        if (!(Test-Path $serviceAccountKey)) {
            Write-Host "Error: Missing serviceAccountKey.json at $serviceAccountKey" -ForegroundColor Red
            exit 1
        }
        
        Write-Host "All required files found!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Next steps:" -ForegroundColor Cyan
        Write-Host "1. Run: .\setup-go-services.ps1 -Action start" -ForegroundColor White
        Write-Host "2. Run: npm run dev (in main project directory)" -ForegroundColor White
        Write-Host "3. Test integration in the browser console" -ForegroundColor White
    }
    
    default {
        Write-Host "Available actions:" -ForegroundColor Cyan
        Write-Host "- start   : Start all Go services" -ForegroundColor White
        Write-Host "- stop    : Stop all Go services" -ForegroundColor White  
        Write-Host "- status  : Check service status" -ForegroundColor White
        Write-Host "- logs    : View service logs" -ForegroundColor White
        Write-Host "- setup   : Verify setup requirements" -ForegroundColor White
        Write-Host ""
        
        # Run status by default
        & $MyInvocation.MyCommand.Path -Action "status"
    }
}

Write-Host ""
