# DashDice Go Services Management Script
# PowerShell script to manage Go microservices integration with Next.js frontend

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("start", "stop", "restart", "status", "logs", "build", "setup")]
    [string]$Action = "status"
)

$GoServicesPath = "c:\Users\david\Documents\dashdice\go-services"
$FrontendPath = "c:\Users\david\Documents\dashdice"

function Write-Status {
    param([string]$Message, [string]$Type = "Info")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    
    switch ($Type) {
        "Success" { Write-Host "[$timestamp] Success: $Message" -ForegroundColor Green }
        "Error" { Write-Host "[$timestamp] Error: $Message" -ForegroundColor Red }
        "Warning" { Write-Host "[$timestamp] Warning: $Message" -ForegroundColor Yellow }
        default { Write-Host "[$timestamp] Info: $Message" -ForegroundColor Cyan }
    }
}

function Test-DockerRunning {
    try {
        docker version | Out-Null
        return $true
    }
    catch {
        return $false
    }
}

function Start-GoServices {
    Write-Status "Starting DashDice Go microservices..."
    
    if (!(Test-DockerRunning)) {
        Write-Status "Docker Desktop is not running. Please start Docker Desktop first." -Type "Error"
        return $false
    }
    
    Set-Location $GoServicesPath
    
    # Build and start services
    Write-Status "Building and starting services with Docker Compose..."
    docker-compose up -d --build
    
    if ($LASTEXITCODE -eq 0) {
        Write-Status "Go services started successfully!" -Type "Success"
        Start-Sleep -Seconds 5
        Show-ServiceStatus
        return $true
    } else {
        Write-Status "Failed to start Go services" -Type "Error"
        return $false
    }
}

function Stop-GoServices {
    Write-Status "Stopping DashDice Go microservices..."
    Set-Location $GoServicesPath
    docker-compose down
    
    if ($LASTEXITCODE -eq 0) {
        Write-Status "Go services stopped successfully!" -Type "Success"
    } else {
        Write-Status "Failed to stop Go services" -Type "Error"
    }
}

function Show-ServiceStatus {
    Write-Status "Checking service status..."
    Set-Location $GoServicesPath
    
    if (!(Test-DockerRunning)) {
        Write-Status "Docker Desktop is not running" -Type "Warning"
        return
    }
    
    Write-Host ""
    Write-Host "=== Docker Compose Services Status ===" -ForegroundColor Magenta
    docker-compose ps
    
    Write-Host ""
    Write-Host "=== Service Health Checks ===" -ForegroundColor Magenta
    
    # Test API Gateway
    try {
        $null = Invoke-WebRequest -Uri "http://localhost:8080/health" -TimeoutSec 5 -UseBasicParsing
        Write-Status "API Gateway (8080): HEALTHY" -Type "Success"
    }
    catch {
        Write-Status "API Gateway (8080): NOT RESPONDING" -Type "Error"
    }
    
    # Test Match Service
    try {
        $null = Invoke-WebRequest -Uri "http://localhost:8081/health" -TimeoutSec 5 -UseBasicParsing -ErrorAction SilentlyContinue
        Write-Status "Match Service (8081): HEALTHY" -Type "Success"
    }
    catch {
        Write-Status "Match Service (8081): NOT RESPONDING" -Type "Warning"
    }
    
    # Test Queue Service
    try {
        $null = Invoke-WebRequest -Uri "http://localhost:8082/health" -TimeoutSec 5 -UseBasicParsing -ErrorAction SilentlyContinue
        Write-Status "Queue Service (8082): HEALTHY" -Type "Success"
    }
    catch {
        Write-Status "Queue Service (8082): NOT RESPONDING" -Type "Warning"
    }
    
    # Test Redis
    try {
        docker exec dashdice-redis redis-cli ping | Out-Null
        Write-Status "Redis: HEALTHY" -Type "Success"
    }
    catch {
        Write-Status "Redis: NOT RESPONDING" -Type "Warning"
    }
    
    # Test PostgreSQL
    try {
        docker exec dashdice-postgres pg_isready -U dashdice | Out-Null
        Write-Status "PostgreSQL: HEALTHY" -Type "Success"
    }
    catch {
        Write-Status "PostgreSQL: NOT RESPONDING" -Type "Warning"
    }
}

function Show-ServiceLogs {
    Write-Status "Showing recent logs from all services..."
    Set-Location $GoServicesPath
    docker-compose logs --tail=50 -f
}

function Restart-GoServices {
    Stop-GoServices
    Start-Sleep -Seconds 3
    Start-GoServices
}

function Invoke-GoServicesBuild {
    Write-Status "Building Go services..."
    Set-Location $GoServicesPath
    docker-compose build --no-cache
    
    if ($LASTEXITCODE -eq 0) {
        Write-Status "Go services built successfully!" -Type "Success"
    } else {
        Write-Status "Failed to build Go services" -Type "Error"
    }
}

function Initialize-Integration {
    Write-Status "Setting up Go services integration with Next.js frontend..."
    
    # Check if all required files exist
    $requiredFiles = @(
        "$GoServicesPath\.env",
        "$GoServicesPath\serviceAccountKey.json",
        "$GoServicesPath\docker-compose.yml"
    )
    
    foreach ($file in $requiredFiles) {
        if (!(Test-Path $file)) {
            Write-Status "Missing required file: $file" -Type "Error"
            return $false
        }
    }
    
    Write-Status "All required configuration files found" -Type "Success"
    
    # Update frontend API client configuration
    Write-Status "Updating frontend API client configuration..."
    
    # Create or update .env.local for frontend
    $frontendEnvPath = "$FrontendPath\.env.local"
    $envContent = @"
# DashDice Frontend Environment Variables
# Auto-generated by go-services-manager.ps1

# Go Services URLs
NEXT_PUBLIC_API_GATEWAY_URL=http://localhost:8080
NEXT_PUBLIC_WEBSOCKET_URL=ws://localhost:8080/api/v1/realtime/ws
API_GATEWAY_URL=http://localhost:8080
QUEUE_SERVICE_URL=http://localhost:8082
WEBSOCKET_PORT=8085

# Existing Firebase config (preserve existing values)
"@
    
    if (Test-Path $frontendEnvPath) {
        $existingContent = Get-Content $frontendEnvPath -Raw
        # Preserve existing Firebase configuration
        if ($existingContent -match "NEXT_PUBLIC_FIREBASE_API_KEY=(.+)") {
            $envContent += "`nNEXT_PUBLIC_FIREBASE_API_KEY=" + $matches[1]
        }
    }
    
    $envContent | Out-File -FilePath $frontendEnvPath -Encoding utf8
    Write-Status "Frontend environment configured" -Type "Success"
    
    Write-Status "Integration setup complete!" -Type "Success"
    Write-Status "Run 'npm run dev' in the frontend directory to start the Next.js app" -Type "Info"
    Write-Status "Run this script with -Action start to start the Go services" -Type "Info"
}

# Main execution
Write-Host ""
Write-Host "🎲 DashDice Go Services Manager 🎲" -ForegroundColor Magenta
Write-Host "=================================" -ForegroundColor Magenta
Write-Host ""

switch ($Action.ToLower()) {
    "start" { Start-GoServices }
    "stop" { Stop-GoServices }
    "restart" { Restart-GoServices }
    "status" { Show-ServiceStatus }
    "logs" { Show-ServiceLogs }
    "build" { Invoke-GoServicesBuild }
    "setup" { Initialize-Integration }
    default { 
        Write-Status "Available actions: start, stop, restart, status, logs, build, setup" -Type "Info"
        Show-ServiceStatus
    }
}

Write-Host ""
