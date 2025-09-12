# DashDice Service Orchestration - Simple Demo
# Advanced service management and automated workflows

Write-Host "=============================================================" -ForegroundColor Magenta
Write-Host "        DASHDICE SERVICE ORCHESTRATION DEMO                 " -ForegroundColor Magenta
Write-Host "=============================================================" -ForegroundColor Magenta
Write-Host ""

# Service definitions
$Services = @{
    'redis' = @{
        name = 'dashdice-redis'
        port = 6379
        critical = $true
    }
    'api-gateway' = @{
        name = 'dashdice-api-gateway'
        port = 8080
        critical = $true
    }
    'match-service' = @{
        name = 'dashdice-match-service'
        port = 8081
        critical = $true
    }
    'queue-service' = @{
        name = 'dashdice-queue-service-v3'
        port = 8082
        critical = $true
    }
    'notification-service' = @{
        name = 'dashdice-notification-service'
        port = 8083
        critical = $false
    }
}

function Write-Status {
    param($message, $type = "INFO")
    $timestamp = Get-Date -Format "HH:mm:ss"
    $color = switch($type) {
        "SUCCESS" { "Green" }
        "ERROR" { "Red" }
        "WARNING" { "Yellow" }
        "INFO" { "Cyan" }
        default { "White" }
    }
    Write-Host "[$timestamp] $message" -ForegroundColor $color
}

function Test-ServiceHealth {
    param($serviceName)
    
    $service = $Services[$serviceName]
    if (-not $service) {
        return @{ healthy = $false; error = "Service not found" }
    }
    
    try {
        if($serviceName -eq 'redis') {
            $result = docker exec dashdice-redis redis-cli ping
            return @{ healthy = ($result -eq "PONG"); service = $serviceName; response = $result }
        } else {
            $url = "http://localhost:$($service.port)/health"
            $response = Invoke-WebRequest -Uri $url -TimeoutSec 3
            return @{ healthy = ($response.StatusCode -eq 200); service = $serviceName; statusCode = $response.StatusCode }
        }
    } catch {
        return @{ healthy = $false; service = $serviceName; error = $_.Exception.Message }
    }
}

function Invoke-SystemHealthCheck {
    Write-Status "Executing System Health Check" "INFO"
    
    $results = @{}
    $overallHealth = $true
    
    foreach($serviceName in $Services.Keys) {
        Write-Status "Checking $serviceName..." "INFO"
        $healthResult = Test-ServiceHealth -serviceName $serviceName
        $results[$serviceName] = $healthResult
        
        if($healthResult.healthy) {
            Write-Status "SUCCESS: $serviceName is healthy" "SUCCESS"
        } else {
            $service = $Services[$serviceName]
            if($service.critical) {
                Write-Status "CRITICAL ERROR: $serviceName is unhealthy" "ERROR"
                $overallHealth = $false
            } else {
                Write-Status "WARNING: $serviceName is unhealthy" "WARNING"
            }
        }
        Start-Sleep -Milliseconds 300
    }
    
    Write-Host "`nSYSTEM HEALTH SUMMARY:" -ForegroundColor Green
    Write-Host "-----------------------------------------------------" -ForegroundColor Gray
    
    $healthyCount = ($results.Values | Where-Object { $_.healthy }).Count
    $totalCount = $results.Count
    
    Write-Host "Services Checked: $totalCount" -ForegroundColor White
    Write-Host "Healthy Services: $healthyCount" -ForegroundColor Green
    $statusText = if($overallHealth) {"HEALTHY"} else {"DEGRADED"}
    $statusColor = if($overallHealth) {"Green"} else {"Red"}
    Write-Host "Overall Status: $statusText" -ForegroundColor $statusColor
    
    return @{
        overallHealth = $overallHealth
        results = $results
        healthyCount = $healthyCount
        totalCount = $totalCount
    }
}

function Test-APIPerformance {
    Write-Status "Testing API Performance" "INFO"
    
    $times = @()
    $successCount = 0
    
    for($i = 1; $i -le 5; $i++) {
        $timer = [System.Diagnostics.Stopwatch]::StartNew()
        try {
            $body = '{"game_mode":"test","user_id":"perf-test-' + $i + '"}'
            Invoke-WebRequest -Uri "http://localhost:8080/api/v1/queue/join" -Method POST -Body $body -ContentType "application/json" -TimeoutSec 5 | Out-Null
            $timer.Stop()
            $times += $timer.ElapsedMilliseconds
            $successCount++
            Write-Status "API test $i completed in $($timer.ElapsedMilliseconds)ms" "SUCCESS"
        } catch {
            $timer.Stop()
            Write-Status "API test $i failed" "WARNING"
        }
        Start-Sleep -Milliseconds 200
    }
    
    if($times.Count -gt 0) {
        $avgTime = ($times | Measure-Object -Average).Average
        $minTime = ($times | Measure-Object -Minimum).Minimum
        $maxTime = ($times | Measure-Object -Maximum).Maximum
        $successRate = ($successCount / 5) * 100
        
        Write-Host "`nAPI PERFORMANCE RESULTS:" -ForegroundColor Green
        Write-Host "-----------------------------------------------------" -ForegroundColor Gray
        Write-Host "Tests Run: 5" -ForegroundColor White
        Write-Host "Successful: $successCount" -ForegroundColor Green
        Write-Host "Success Rate: $successRate%" -ForegroundColor Green
        Write-Host "Average Response Time: $([math]::Round($avgTime))ms" -ForegroundColor Cyan
        Write-Host "Min/Max Time: $minTime ms / $maxTime ms" -ForegroundColor White
        
        $rating = if($avgTime -lt 100) {"EXCELLENT"} elseif($avgTime -lt 300) {"GOOD"} else {"NEEDS IMPROVEMENT"}
        Write-Host "Performance Rating: $rating" -ForegroundColor $(if($rating -eq "EXCELLENT") {"Green"} else {"Yellow"})
    }
}

function Test-DatabasePerformance {
    Write-Status "Testing Redis Database Performance" "INFO"
    
    $times = @()
    
    for($i = 1; $i -le 5; $i++) {
        $timer = [System.Diagnostics.Stopwatch]::StartNew()
        try {
            $result = docker exec dashdice-redis redis-cli ping
            $timer.Stop()
            if($result -eq "PONG") {
                $times += $timer.ElapsedMilliseconds
                Write-Status "Redis ping $i: $($timer.ElapsedMilliseconds)ms" "SUCCESS"
            }
        } catch {
            $timer.Stop()
            Write-Status "Redis test $i failed" "WARNING"
        }
        Start-Sleep -Milliseconds 100
    }
    
    if($times.Count -gt 0) {
        $avgTime = ($times | Measure-Object -Average).Average
        $minTime = ($times | Measure-Object -Minimum).Minimum
        $maxTime = ($times | Measure-Object -Maximum).Maximum
        
        Write-Host "`nREDIS PERFORMANCE RESULTS:" -ForegroundColor Green
        Write-Host "-----------------------------------------------------" -ForegroundColor Gray
        Write-Host "Average Response Time: $([math]::Round($avgTime))ms" -ForegroundColor Cyan
        Write-Host "Min/Max Time: $minTime ms / $maxTime ms" -ForegroundColor White
        
        $rating = if($avgTime -lt 10) {"EXCELLENT"} elseif($avgTime -lt 50) {"GOOD"} else {"NEEDS IMPROVEMENT"}
        Write-Host "Database Rating: $rating" -ForegroundColor $(if($rating -eq "EXCELLENT") {"Green"} else {"Yellow"})
    }
}

# Main execution
Write-Status "Starting DashDice Service Orchestration Demo" "INFO"

Write-Host "`nSERVICE TOPOLOGY:" -ForegroundColor Cyan
Write-Host "-----------------------------------------------------" -ForegroundColor Gray
foreach($serviceName in $Services.Keys) {
    $service = $Services[$serviceName]
    $criticalText = if($service.critical) {"[CRITICAL]"} else {"[OPTIONAL]"}
    Write-Host "$criticalText $serviceName (Port: $($service.port))" -ForegroundColor White
}

Write-Host "`n1. Running System Health Check..." -ForegroundColor Cyan
$healthResults = Invoke-SystemHealthCheck

Write-Host "`n2. Running API Performance Test..." -ForegroundColor Cyan
Test-APIPerformance

Write-Host "`n3. Running Database Performance Test..." -ForegroundColor Cyan
Test-DatabasePerformance

Write-Host "`n=============================================================" -ForegroundColor Green
Write-Host "Service Orchestration Demo Complete" -ForegroundColor Green
Write-Host "=============================================================" -ForegroundColor Green

if($healthResults.overallHealth) {
    Write-Host "System Status: All critical services are operational" -ForegroundColor Green
} else {
    Write-Host "System Status: Some critical services need attention" -ForegroundColor Red
}
