# Comprehensive Monitoring Startup Script
# Starts all monitoring services and validates their health

param(
    [switch]$SkipServices,
    [switch]$VerboseOutput,
    [int]$HealthCheckTimeout = 300
)

Write-Host "=== DashDice Monitoring System Startup ===" -ForegroundColor Cyan

# Function to check if a service is healthy
function Test-ServiceHealth {
    param(
        [string]$ServiceName,
        [string]$HealthUrl,
        [int]$TimeoutSeconds = 30
    )
    
    try {
        $response = Invoke-RestMethod -Uri $HealthUrl -TimeoutSec $TimeoutSeconds
        Write-Host "✓ $ServiceName is healthy" -ForegroundColor Green
        if ($VerboseOutput) {
            Write-Host "  Response: $($response | ConvertTo-Json -Depth 1)" -ForegroundColor Gray
        }
        return $true
    }
    catch {
        Write-Host "✗ $ServiceName health check failed: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Start core services first if not skipped
if (-not $SkipServices) {
    Write-Host "`n[1/4] Starting Core Services..." -ForegroundColor Yellow
    
    try {
        Push-Location "go-services"
        docker-compose up -d redis postgres
        Write-Host "✓ Core services started" -ForegroundColor Green
    }
    catch {
        Write-Host "✗ Failed to start core services: $($_.Exception.Message)" -ForegroundColor Red
        exit 1
    }
    finally {
        Pop-Location
    }
    
    # Wait for core services to be ready
    Write-Host "Waiting for core services to be ready..." -ForegroundColor Gray
    Start-Sleep -Seconds 20
}

# Start monitoring infrastructure
Write-Host "`n[2/4] Starting Monitoring Infrastructure..." -ForegroundColor Yellow

try {
    Push-Location "monitoring"
    docker-compose -f docker-compose.monitoring.yml up -d elasticsearch logstash kibana prometheus grafana alertmanager
    Write-Host "✓ Monitoring infrastructure started" -ForegroundColor Green
}
catch {
    Write-Host "✗ Failed to start monitoring infrastructure: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
finally {
    Pop-Location
}

# Wait for services to initialize
Write-Host "Waiting for monitoring services to initialize..." -ForegroundColor Gray
Start-Sleep -Seconds 60

# Start additional monitoring services
Write-Host "`n[3/4] Starting Additional Monitoring Services..." -ForegroundColor Yellow

try {
    Push-Location "monitoring"
    docker-compose -f docker-compose.monitoring.yml up -d filebeat node-exporter cadvisor redis-exporter postgres-exporter jaeger otel-collector uptime-kuma
    Write-Host "✓ Additional monitoring services started" -ForegroundColor Green
}
catch {
    Write-Host "✗ Failed to start additional monitoring services: $($_.Exception.Message)" -ForegroundColor Red
}
finally {
    Pop-Location
}

# Wait for all services to be fully ready
Write-Host "Waiting for all services to be fully ready..." -ForegroundColor Gray
Start-Sleep -Seconds 45

# Health check monitoring services
Write-Host "`n[4/4] Performing Health Checks..." -ForegroundColor Yellow

$healthChecks = @{
    "Elasticsearch" = "http://localhost:9200/_cluster/health"
    "Kibana" = "http://localhost:5601/api/status"
    "Prometheus" = "http://localhost:9090/-/healthy"
    "Grafana" = "http://localhost:3001/api/health"
    "AlertManager" = "http://localhost:9093/-/healthy"
}

$healthResults = @{}

foreach ($service in $healthChecks.GetEnumerator()) {
    Write-Host "Checking $($service.Key)..." -ForegroundColor Gray
    $healthResults[$service.Key] = Test-ServiceHealth -ServiceName $service.Key -HealthUrl $service.Value
    Start-Sleep -Seconds 2
}

# Check application services if they're running
if (-not $SkipServices) {
    $appHealthChecks = @{
        "Redis" = "http://localhost:6379"
        "API Gateway" = "http://localhost:8080/health"
        "Match Service" = "http://localhost:8081/health"
        "Queue Service" = "http://localhost:8082/health"
        "Presence Service" = "http://localhost:8083/health"
        "Notification Service" = "http://localhost:8084/health"
        "WebSocket Server" = "http://localhost:8085/health"
    }
    
    foreach ($service in $appHealthChecks.GetEnumerator()) {
        Write-Host "Checking $($service.Key)..." -ForegroundColor Gray
        $healthResults[$service.Key] = Test-ServiceHealth -ServiceName $service.Key -HealthUrl $service.Value -TimeoutSeconds 10
        Start-Sleep -Seconds 1
    }
}

# Summary and dashboard URLs
Write-Host "`n=== Monitoring System Status ===" -ForegroundColor Cyan

$totalChecks = $healthResults.Count
$passedChecks = ($healthResults.Values | Where-Object { $_ -eq $true }).Count
$failedChecks = $totalChecks - $passedChecks

Write-Host "Health Checks: $passedChecks/$totalChecks passed" -ForegroundColor $(if ($failedChecks -eq 0) { "Green" } else { "Yellow" })

if ($failedChecks -gt 0) {
    Write-Host "`nFailed Services:" -ForegroundColor Red
    $healthResults.GetEnumerator() | Where-Object { $_.Value -eq $false } | ForEach-Object {
        Write-Host "  ✗ $($_.Key)" -ForegroundColor Red
    }
}

Write-Host "`n=== Dashboard URLs ===" -ForegroundColor Cyan
Write-Host "📊 Grafana Dashboard: http://localhost:3001 (admin/admin123)" -ForegroundColor Green
Write-Host "🔍 Kibana Logs: http://localhost:5601" -ForegroundColor Green
Write-Host "📈 Prometheus Metrics: http://localhost:9090" -ForegroundColor Green
Write-Host "🚨 AlertManager: http://localhost:9093" -ForegroundColor Green
Write-Host "⏱️ Jaeger Tracing: http://localhost:16686" -ForegroundColor Green
Write-Host "📡 Uptime Monitor: http://localhost:3002" -ForegroundColor Green

if ($VerboseOutput) {
    Write-Host "`n=== Container Status ===" -ForegroundColor Cyan
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | Where-Object { $_ -match "dashdice" }
}

Write-Host "`n=== Quick Commands ===" -ForegroundColor Cyan
Write-Host "View logs: docker-compose -f monitoring/docker-compose.monitoring.yml logs -f [service]" -ForegroundColor Gray
Write-Host "Stop monitoring: docker-compose -f monitoring/docker-compose.monitoring.yml down" -ForegroundColor Gray
Write-Host "Restart service: docker-compose -f monitoring/docker-compose.monitoring.yml restart [service]" -ForegroundColor Gray

# Create monitoring report
$reportPath = "monitoring-status-$(Get-Date -Format 'yyyyMMdd-HHmmss').txt"
$reportContent = @"
DashDice Monitoring System Status Report
Generated: $(Get-Date)

Health Check Results:
$(($healthResults.GetEnumerator() | ForEach-Object { "$($_.Key): $(if ($_.Value) { 'HEALTHY' } else { 'FAILED' })" }) -join "`n")

Dashboard URLs:
- Grafana: http://localhost:3001
- Kibana: http://localhost:5601
- Prometheus: http://localhost:9090
- AlertManager: http://localhost:9093
- Jaeger: http://localhost:16686
- Uptime Monitor: http://localhost:3002

Container Status:
$(docker ps --format "{{.Names}} - {{.Status}}" | Where-Object { $_ -match "dashdice" } | Out-String)

Overall Status: $(if ($failedChecks -eq 0) { 'ALL SYSTEMS OPERATIONAL' } else { "ISSUES DETECTED - $failedChecks failed checks" })
"@

$reportContent | Out-File -FilePath $reportPath -Encoding UTF8
Write-Host "Detailed report saved to: $reportPath" -ForegroundColor Gray

# Exit with appropriate code
if ($failedChecks -eq 0) {
    Write-Host "`n🎉 All monitoring services are operational!" -ForegroundColor Green
    exit 0
} else {
    Write-Host "`n⚠️ Some services have issues. Please check the logs." -ForegroundColor Yellow
    exit 1
}
