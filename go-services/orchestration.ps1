# DashDice Service Orchestration & Workflow Automation
# Advanced service management and automated workflows

Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Magenta
Write-Host "║        DASHDICE SERVICE ORCHESTRATION & AUTOMATION            ║" -ForegroundColor Magenta
Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Magenta
Write-Host ""

# Service definitions with dependencies and health requirements
$ServiceTopology = @{
    'redis' = @{
        name = 'dashdice-redis'
        port = 6379
        dependencies = @()
        healthCheck = { docker exec dashdice-redis redis-cli ping }
        critical = $true
        startupTime = 5
    }
    'api-gateway' = @{
        name = 'dashdice-api-gateway'
        port = 8080
        dependencies = @('redis')
        healthCheck = { Invoke-WebRequest -Uri "http://localhost:8080/health" -TimeoutSec 3 }
        critical = $true
        startupTime = 15
    }
    'match-service' = @{
        name = 'dashdice-match-service'
        port = 8081
        dependencies = @('redis')
        healthCheck = { Invoke-WebRequest -Uri "http://localhost:8081/health" -TimeoutSec 3 }
        critical = $true
        startupTime = 10
    }
    'queue-service' = @{
        name = 'dashdice-queue-service-v3'
        port = 8082
        dependencies = @('redis')
        healthCheck = { Invoke-WebRequest -Uri "http://localhost:8082/health" -TimeoutSec 3 }
        critical = $true
        startupTime = 10
    }
    'notification-service' = @{
        name = 'dashdice-notification-service'
        port = 8083
        dependencies = @('redis')
        healthCheck = { Invoke-WebRequest -Uri "http://localhost:8083/health" -TimeoutSec 3 }
        critical = $false
        startupTime = 8
    }
}

# Workflow definitions
$Workflows = @{
    'full-system-check' = @{
        name = 'Full System Health Check'
        steps = @('check-dependencies', 'validate-services', 'test-api-endpoints', 'verify-database')
        timeout = 60
    }
    'graceful-restart' = @{
        name = 'Graceful System Restart'
        steps = @('drain-connections', 'stop-services', 'start-dependencies', 'start-services', 'verify-health')
        timeout = 120
    }
    'performance-test' = @{
        name = 'Performance Testing Suite'
        steps = @('load-test-api', 'stress-test-database', 'concurrent-user-test', 'generate-report')
        timeout = 300
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
    
    $service = $ServiceTopology[$serviceName]
    if (-not $service) {
        return @{ healthy = $false; error = "Service not found in topology" }
    }
    
    try {
        $result = & $service.healthCheck
        return @{ healthy = $true; service = $serviceName; response = $result }
    } catch {
        return @{ healthy = $false; service = $serviceName; error = $_.Exception.Message }
    }
}

function Get-ServiceDependencies {
    param($serviceName)
    
    $service = $ServiceTopology[$serviceName]
    if (-not $service) { return @() }
    
    $allDependencies = @()
    foreach($dep in $service.dependencies) {
        $allDependencies += $dep
        $allDependencies += Get-ServiceDependencies -serviceName $dep
    }
    
    return $allDependencies | Select-Object -Unique
}

function Start-ServiceOrchestration {
    Write-Status "🚀 Starting DashDice Service Orchestration" "SUCCESS"
    Write-Status "Service topology loaded with $($ServiceTopology.Count) services"
    
    # Display service dependency graph
    Write-Host "`n📊 SERVICE DEPENDENCY GRAPH:" -ForegroundColor Cyan
    Write-Host "─────────────────────────────────────────────────────" -ForegroundColor Gray
    
    foreach($serviceName in $ServiceTopology.Keys) {
        $service = $ServiceTopology[$serviceName]
        $depString = if($service.dependencies.Count -eq 0) { "None" } else { $service.dependencies -join ", " }
        $criticalIcon = if($service.critical) { "🔥" } else { "📋" }
        Write-Host "$criticalIcon $serviceName -> Dependencies: $depString" -ForegroundColor White
    }
}

function Invoke-FullSystemCheck {
    Write-Status "🔍 Executing Full System Health Check" "INFO"
    
    $results = @{}
    $overallHealth = $true
    
    # Check each service in dependency order
    $serviceOrder = @('redis', 'api-gateway', 'match-service', 'queue-service', 'notification-service')
    
    foreach($serviceName in $serviceOrder) {
        Write-Status "Checking $serviceName..." "INFO"
        $healthResult = Test-ServiceHealth -serviceName $serviceName
        $results[$serviceName] = $healthResult
        
        if($healthResult.healthy) {
            Write-Status "✅ $serviceName is healthy" "SUCCESS"
        } else {
            $service = $ServiceTopology[$serviceName]
            if($service.critical) {
                Write-Status "❌ CRITICAL: $serviceName is unhealthy - $($healthResult.error)" "ERROR"
                $overallHealth = $false
            } else {
                Write-Status "⚠️  WARNING: $serviceName is unhealthy - $($healthResult.error)" "WARNING"
            }
        }
        Start-Sleep -Milliseconds 500
    }
    
    Write-Host "`n📊 SYSTEM HEALTH SUMMARY:" -ForegroundColor Green
    Write-Host "─────────────────────────────────────────────────────" -ForegroundColor Gray
    
    $healthyCount = ($results.Values | Where-Object { $_.healthy }).Count
    $totalCount = $results.Count
    
    Write-Host "Services Checked: $totalCount" -ForegroundColor White
    Write-Host "Healthy Services: $healthyCount" -ForegroundColor $(if($healthyCount -eq $totalCount) {"Green"} else {"Yellow"})
    Write-Host "Overall Status: $(if($overallHealth) {"🟢 HEALTHY"} else {"🔴 DEGRADED"})" -ForegroundColor $(if($overallHealth) {"Green"} else {"Red"})
    
    return @{
        overallHealth = $overallHealth
        results = $results
        healthyCount = $healthyCount
        totalCount = $totalCount
    }
}

function Invoke-PerformanceBenchmark {
    Write-Status "⚡ Starting Performance Benchmark Suite" "INFO"
    
    $benchmarkResults = @{
        apiGateway = @{}
        database = @{}
        loadTest = @{}
        timestamp = Get-Date
    }
    
    # API Gateway Performance Test
    Write-Status "Testing API Gateway performance..." "INFO"
    $apiTimes = @()
    
    for($i = 1; $i -le 10; $i++) {
        $timer = [System.Diagnostics.Stopwatch]::StartNew()
        try {
            $body = '{"game_mode":"benchmark","user_id":"perf-test-' + $i + '"}'
            $response = Invoke-WebRequest -Uri "http://localhost:8080/api/v1/queue/join" -Method POST -Body $body -ContentType "application/json"
            $timer.Stop()
            $apiTimes += $timer.ElapsedMilliseconds
        } catch {
            $timer.Stop()
            Write-Status "API test $i failed: $($_.Exception.Message)" "WARNING"
        }
        Start-Sleep -Milliseconds 100
    }
    
    $benchmarkResults.apiGateway = @{
        tests = $apiTimes.Count
        averageTime = ($apiTimes | Measure-Object -Average).Average
        minTime = ($apiTimes | Measure-Object -Minimum).Minimum
        maxTime = ($apiTimes | Measure-Object -Maximum).Maximum
        successRate = ($apiTimes.Count / 10) * 100
    }
    
    # Database Performance Test
    Write-Status "Testing Redis database performance..." "INFO"
    $dbTimes = @()
    
    for($i = 1; $i -le 5; $i++) {
        $timer = [System.Diagnostics.Stopwatch]::StartNew()
        try {
            $pingResult = docker exec dashdice-redis redis-cli ping
            $timer.Stop()
            if($pingResult -eq "PONG") {
                $dbTimes += $timer.ElapsedMilliseconds
            }
        } catch {
            $timer.Stop()
            Write-Status "Database test $i failed" "WARNING"
        }
        Start-Sleep -Milliseconds 50
    }
    
    $benchmarkResults.database = @{
        tests = $dbTimes.Count
        averageTime = if($dbTimes.Count -gt 0) { ($dbTimes | Measure-Object -Average).Average } else { 0 }
        minTime = if($dbTimes.Count -gt 0) { ($dbTimes | Measure-Object -Minimum).Minimum } else { 0 }
        maxTime = if($dbTimes.Count -gt 0) { ($dbTimes | Measure-Object -Maximum).Maximum } else { 0 }
    }
    
    # Display Results
    Write-Host "`n📈 PERFORMANCE BENCHMARK RESULTS:" -ForegroundColor Green
    Write-Host "─────────────────────────────────────────────────────" -ForegroundColor Gray
    
    Write-Host "API Gateway Performance:" -ForegroundColor Cyan
    Write-Host "  Average Response Time: $([math]::Round($benchmarkResults.apiGateway.averageTime))ms" -ForegroundColor White
    Write-Host "  Min/Max: $($benchmarkResults.apiGateway.minTime)ms / $($benchmarkResults.apiGateway.maxTime)ms" -ForegroundColor White
    Write-Host "  Success Rate: $($benchmarkResults.apiGateway.successRate)%" -ForegroundColor White
    
    Write-Host "Database Performance:" -ForegroundColor Cyan
    Write-Host "  Average Response Time: $([math]::Round($benchmarkResults.database.averageTime))ms" -ForegroundColor White
    Write-Host "  Min/Max: $($benchmarkResults.database.minTime)ms / $($benchmarkResults.database.maxTime)ms" -ForegroundColor White
    
    # Performance Rating
    $apiRating = if($benchmarkResults.apiGateway.averageTime -lt 100) {"EXCELLENT"} 
                elseif($benchmarkResults.apiGateway.averageTime -lt 250) {"GOOD"} 
                else {"NEEDS IMPROVEMENT"}
    
    Write-Host "`n🏆 Performance Rating: $apiRating" -ForegroundColor $(if($apiRating -eq "EXCELLENT") {"Green"} else {"Yellow"})
    
    return $benchmarkResults
}

function Show-OrchestrationMenu {
    Write-Host "`n🎛️  SERVICE ORCHESTRATION MENU:" -ForegroundColor Magenta
    Write-Host "─────────────────────────────────────────────────────" -ForegroundColor Gray
    Write-Host "[1] Full System Health Check" -ForegroundColor White
    Write-Host "[2] Performance Benchmark Suite" -ForegroundColor White
    Write-Host "[3] Service Dependency Analysis" -ForegroundColor White
    Write-Host "[4] Automated Monitoring (30s intervals)" -ForegroundColor White
    Write-Host "[5] Generate System Report" -ForegroundColor White
    Write-Host "[Q] Quit" -ForegroundColor White
    Write-Host ""
    
    $choice = Read-Host "Select option"
    
    switch($choice) {
        '1' { 
            Invoke-FullSystemCheck 
            Show-OrchestrationMenu
        }
        '2' { 
            Invoke-PerformanceBenchmark 
            Show-OrchestrationMenu
        }
        '3' { 
            Show-DependencyAnalysis
            Show-OrchestrationMenu
        }
        '4' { 
            Start-AutomatedMonitoring
        }
        '5' {
            Generate-SystemReport
            Show-OrchestrationMenu
        }
        'Q' { 
            Write-Status "Service orchestration stopped" "INFO"
            return 
        }
        default { 
            Write-Status "Invalid option selected" "WARNING"
            Show-OrchestrationMenu
        }
    }
}

function Show-DependencyAnalysis {
    Write-Host "`n🕸️  SERVICE DEPENDENCY ANALYSIS:" -ForegroundColor Green
    Write-Host "─────────────────────────────────────────────────────" -ForegroundColor Gray
    
    foreach($serviceName in $ServiceTopology.Keys) {
        $service = $ServiceTopology[$serviceName]
        $dependencies = Get-ServiceDependencies -serviceName $serviceName
        
        Write-Host "$serviceName Dependencies:" -ForegroundColor Cyan
        if($dependencies.Count -eq 0) {
            Write-Host "  └─ No dependencies (root service)" -ForegroundColor Green
        } else {
            foreach($dep in $dependencies) {
                Write-Host "  └─ $dep" -ForegroundColor White
            }
        }
    }
}

function Start-AutomatedMonitoring {
    Write-Status "🔄 Starting Automated Monitoring (Press 'Q' to stop)" "INFO"
    
    while($true) {
        Clear-Host
        Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Blue
        Write-Host "║                    AUTOMATED MONITORING ACTIVE                ║" -ForegroundColor Blue
        Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Blue
        Write-Host ""
        
        $healthCheck = Invoke-FullSystemCheck
        
        Write-Host "`nNext check in 30 seconds... (Press 'Q' to quit)" -ForegroundColor Gray
        
        # Wait with interrupt capability
        $timeout = 30
        for($i = $timeout; $i -gt 0; $i--) {
            if([Console]::KeyAvailable) {
                $key = [Console]::ReadKey($true)
                if($key.Key -eq 'Q') {
                    Write-Status "Automated monitoring stopped" "INFO"
                    return
                }
            }
            Start-Sleep -Seconds 1
        }
    }
}

function Generate-SystemReport {
    Write-Status "📄 Generating Comprehensive System Report" "INFO"
    
    $reportData = @{
        timestamp = Get-Date
        systemCheck = Invoke-FullSystemCheck
        performance = Invoke-PerformanceBenchmark
        services = $ServiceTopology
    }
    
    $reportPath = "system-report-$(Get-Date -Format 'yyyyMMdd-HHmmss').json"
    $reportData | ConvertTo-Json -Depth 10 | Out-File -FilePath $reportPath
    
    Write-Status "📊 System report generated: $reportPath" "SUCCESS"
}

# Initialize orchestration
Start-ServiceOrchestration
Show-OrchestrationMenu
