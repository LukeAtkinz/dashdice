# DashDice Advanced Caching & Performance Optimization
# Multi-layer caching strategies and performance enhancement

Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Blue
Write-Host "║        DASHDICE ADVANCED CACHING & OPTIMIZATION               ║" -ForegroundColor Blue
Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Blue
Write-Host ""

$CacheStrategies = @{
    'redis-primary' = @{
        name = 'Redis Primary Cache'
        type = 'key-value'
        ttl = 3600  # 1 hour default
        maxSize = '256MB'
        evictionPolicy = 'LRU'
        compression = $true
    }
    'application-cache' = @{
        name = 'Application Memory Cache'
        type = 'in-memory'
        ttl = 300   # 5 minutes
        maxSize = '64MB'
        evictionPolicy = 'LFU'
        compression = $false
    }
    'cdn-edge' = @{
        name = 'CDN Edge Cache'
        type = 'distributed'
        ttl = 86400  # 24 hours
        maxSize = '1GB'
        evictionPolicy = 'TTL'
        compression = $true
    }
}

$PerformanceMetrics = @{
    'response-time' = @{ threshold = 100; unit = 'ms'; critical = $true }
    'throughput' = @{ threshold = 1000; unit = 'req/s'; critical = $true }
    'cpu-usage' = @{ threshold = 80; unit = '%'; critical = $true }
    'memory-usage' = @{ threshold = 85; unit = '%'; critical = $true }
    'cache-hit-ratio' = @{ threshold = 90; unit = '%'; critical = $false }
    'error-rate' = @{ threshold = 1; unit = '%'; critical = $true }
}

function Write-PerfStatus {
    param($message, $level = "INFO")
    $timestamp = Get-Date -Format "HH:mm:ss"
    $color = switch($level) {
        "EXCELLENT" { "Green" }
        "GOOD" { "Cyan" }
        "WARNING" { "Yellow" }
        "CRITICAL" { "Red" }
        "INFO" { "White" }
        default { "Gray" }
    }
    $icon = switch($level) {
        "EXCELLENT" { "🚀" }
        "GOOD" { "✅" }
        "WARNING" { "⚠️ " }
        "CRITICAL" { "🚨" }
        "INFO" { "📊" }
        default { "🔍" }
    }
    Write-Host "[$timestamp] $icon $message" -ForegroundColor $color
}

function Test-RedisPerformance {
    param($iterations = 100)
    
    Write-PerfStatus "Testing Redis cache performance with $iterations operations" "INFO"
    
    $results = @{
        setOperations = @()
        getOperations = @()
        delOperations = @()
        overallStats = @{}
    }
    
    # SET Operations Test
    Write-PerfStatus "Testing SET operations..." "INFO"
    for($i = 1; $i -le $iterations; $i++) {
        $key = "perf-test-$i"
        $value = "performance-test-data-$(Get-Random -Maximum 10000)"
        
        $timer = [System.Diagnostics.Stopwatch]::StartNew()
        try {
            $setResult = docker exec dashdice-redis redis-cli SET $key $value
            $timer.Stop()
            
            if($setResult -eq "OK") {
                $results.setOperations += $timer.ElapsedMilliseconds
            }
        } catch {
            $timer.Stop()
            Write-PerfStatus "SET operation $i failed: $($_.Exception.Message)" "WARNING"
        }
        
        if($i % 25 -eq 0) {
            Write-Progress -Activity "Redis SET Test" -Status "$i/$iterations operations" -PercentComplete (($i/$iterations) * 100)
        }
    }
    
    # GET Operations Test
    Write-PerfStatus "Testing GET operations..." "INFO"
    for($i = 1; $i -le $iterations; $i++) {
        $key = "perf-test-$i"
        
        $timer = [System.Diagnostics.Stopwatch]::StartNew()
        try {
            $getValue = docker exec dashdice-redis redis-cli GET $key
            $timer.Stop()
            
            if($getValue) {
                $results.getOperations += $timer.ElapsedMilliseconds
            }
        } catch {
            $timer.Stop()
            Write-PerfStatus "GET operation $i failed: $($_.Exception.Message)" "WARNING"
        }
        
        if($i % 25 -eq 0) {
            Write-Progress -Activity "Redis GET Test" -Status "$i/$iterations operations" -PercentComplete (($i/$iterations) * 100)
        }
    }
    
    # DEL Operations Test
    Write-PerfStatus "Testing DEL operations..." "INFO"
    for($i = 1; $i -le $iterations; $i++) {
        $key = "perf-test-$i"
        
        $timer = [System.Diagnostics.Stopwatch]::StartNew()
        try {
            $delResult = docker exec dashdice-redis redis-cli DEL $key
            $timer.Stop()
            
            if($delResult -ge 0) {
                $results.delOperations += $timer.ElapsedMilliseconds
            }
        } catch {
            $timer.Stop()
            Write-PerfStatus "DEL operation $i failed: $($_.Exception.Message)" "WARNING"
        }
        
        if($i % 25 -eq 0) {
            Write-Progress -Activity "Redis DEL Test" -Status "$i/$iterations operations" -PercentComplete (($i/$iterations) * 100)
        }
    }
    
    # Calculate Statistics
    $results.overallStats = @{
        setStats = @{
            average = if($results.setOperations.Count -gt 0) { ($results.setOperations | Measure-Object -Average).Average } else { 0 }
            min = if($results.setOperations.Count -gt 0) { ($results.setOperations | Measure-Object -Minimum).Minimum } else { 0 }
            max = if($results.setOperations.Count -gt 0) { ($results.setOperations | Measure-Object -Maximum).Maximum } else { 0 }
            p95 = if($results.setOperations.Count -gt 0) { ($results.setOperations | Sort-Object)[[math]::Floor($results.setOperations.Count * 0.95)] } else { 0 }
        }
        getStats = @{
            average = if($results.getOperations.Count -gt 0) { ($results.getOperations | Measure-Object -Average).Average } else { 0 }
            min = if($results.getOperations.Count -gt 0) { ($results.getOperations | Measure-Object -Minimum).Minimum } else { 0 }
            max = if($results.getOperations.Count -gt 0) { ($results.getOperations | Measure-Object -Maximum).Maximum } else { 0 }
            p95 = if($results.getOperations.Count -gt 0) { ($results.getOperations | Sort-Object)[[math]::Floor($results.getOperations.Count * 0.95)] } else { 0 }
        }
        delStats = @{
            average = if($results.delOperations.Count -gt 0) { ($results.delOperations | Measure-Object -Average).Average } else { 0 }
            min = if($results.delOperations.Count -gt 0) { ($results.delOperations | Measure-Object -Minimum).Minimum } else { 0 }
            max = if($results.delOperations.Count -gt 0) { ($results.delOperations | Measure-Object -Maximum).Maximum } else { 0 }
            p95 = if($results.delOperations.Count -gt 0) { ($results.delOperations | Sort-Object)[[math]::Floor($results.delOperations.Count * 0.95)] } else { 0 }
        }
    }
    
    # Display Results
    Write-Host "`n📊 REDIS PERFORMANCE RESULTS:" -ForegroundColor Blue
    Write-Host "═════════════════════════════════════════════════════════════════" -ForegroundColor Gray
    
    Write-Host "SET Operations ($($results.setOperations.Count) samples):" -ForegroundColor Cyan
    Write-Host "  Average: $([math]::Round($results.overallStats.setStats.average, 2))ms" -ForegroundColor White
    Write-Host "  Min/Max: $($results.overallStats.setStats.min)ms / $($results.overallStats.setStats.max)ms" -ForegroundColor White
    Write-Host "  95th Percentile: $($results.overallStats.setStats.p95)ms" -ForegroundColor White
    
    Write-Host "GET Operations ($($results.getOperations.Count) samples):" -ForegroundColor Cyan
    Write-Host "  Average: $([math]::Round($results.overallStats.getStats.average, 2))ms" -ForegroundColor White
    Write-Host "  Min/Max: $($results.overallStats.getStats.min)ms / $($results.overallStats.getStats.max)ms" -ForegroundColor White
    Write-Host "  95th Percentile: $($results.overallStats.getStats.p95)ms" -ForegroundColor White
    
    Write-Host "DEL Operations ($($results.delOperations.Count) samples):" -ForegroundColor Cyan
    Write-Host "  Average: $([math]::Round($results.overallStats.delStats.average, 2))ms" -ForegroundColor White
    Write-Host "  Min/Max: $($results.overallStats.delStats.min)ms / $($results.overallStats.delStats.max)ms" -ForegroundColor White
    Write-Host "  95th Percentile: $($results.overallStats.delStats.p95)ms" -ForegroundColor White
    
    # Performance Rating
    $avgPerformance = ($results.overallStats.setStats.average + $results.overallStats.getStats.average + $results.overallStats.delStats.average) / 3
    $rating = if($avgPerformance -lt 5) {"EXCELLENT"} 
              elseif($avgPerformance -lt 15) {"GOOD"} 
              elseif($avgPerformance -lt 50) {"ACCEPTABLE"}
              else {"NEEDS_OPTIMIZATION"}
    
    Write-Host "`n🏆 Cache Performance Rating: $rating" -ForegroundColor $(if($rating -eq "EXCELLENT") {"Green"} elseif($rating -eq "GOOD") {"Cyan"} else {"Yellow"})
    
    return $results
}

function Test-APILoadPerformance {
    param($concurrentUsers = 10, $requestsPerUser = 5)
    
    Write-PerfStatus "Starting API load test with $concurrentUsers concurrent users, $requestsPerUser requests each" "INFO"
    
    $jobs = @()
    $startTime = Get-Date
    
    # Create concurrent test jobs
    for($user = 1; $user -le $concurrentUsers; $user++) {
        $job = Start-Job -ScriptBlock {
            param($userId, $requests, $baseUrl)
            
            $results = @()
            for($req = 1; $req -le $requests; $req++) {
                $timer = [System.Diagnostics.Stopwatch]::StartNew()
                try {
                    $body = @{
                        game_mode = "load-test"
                        user_id = "user-$userId-req-$req"
                    } | ConvertTo-Json
                    
                    $response = Invoke-WebRequest -Uri "$baseUrl/api/v1/queue/join" -Method POST -Body $body -ContentType "application/json" -TimeoutSec 10
                    $timer.Stop()
                    
                    $results += @{
                        userId = $userId
                        requestId = $req
                        responseTime = $timer.ElapsedMilliseconds
                        statusCode = $response.StatusCode
                        success = $true
                        timestamp = Get-Date
                    }
                } catch {
                    $timer.Stop()
                    $results += @{
                        userId = $userId
                        requestId = $req
                        responseTime = $timer.ElapsedMilliseconds
                        statusCode = 0
                        success = $false
                        error = $_.Exception.Message
                        timestamp = Get-Date
                    }
                }
                Start-Sleep -Milliseconds 100  # Small delay between requests
            }
            return $results
        } -ArgumentList $user, $requestsPerUser, "http://localhost:8080"
        
        $jobs += $job
    }
    
    # Wait for all jobs to complete
    Write-PerfStatus "Waiting for $($jobs.Count) concurrent test jobs to complete..." "INFO"
    $allResults = @()
    
    foreach($job in $jobs) {
        $jobResults = Receive-Job -Job $job -Wait
        $allResults += $jobResults
        Remove-Job -Job $job
    }
    
    $endTime = Get-Date
    $totalDuration = ($endTime - $startTime).TotalSeconds
    
    # Analyze Results
    $successfulRequests = $allResults | Where-Object { $_.success -eq $true }
    $failedRequests = $allResults | Where-Object { $_.success -eq $false }
    
    $loadTestResults = @{
        totalRequests = $allResults.Count
        successfulRequests = $successfulRequests.Count
        failedRequests = $failedRequests.Count
        successRate = ($successfulRequests.Count / $allResults.Count) * 100
        totalDuration = $totalDuration
        requestsPerSecond = $allResults.Count / $totalDuration
        responseTimeStats = @{
            average = if($successfulRequests.Count -gt 0) { ($successfulRequests.responseTime | Measure-Object -Average).Average } else { 0 }
            min = if($successfulRequests.Count -gt 0) { ($successfulRequests.responseTime | Measure-Object -Minimum).Minimum } else { 0 }
            max = if($successfulRequests.Count -gt 0) { ($successfulRequests.responseTime | Measure-Object -Maximum).Maximum } else { 0 }
            p95 = if($successfulRequests.Count -gt 0) { ($successfulRequests.responseTime | Sort-Object)[[math]::Floor($successfulRequests.Count * 0.95)] } else { 0 }
            p99 = if($successfulRequests.Count -gt 0) { ($successfulRequests.responseTime | Sort-Object)[[math]::Floor($successfulRequests.Count * 0.99)] } else { 0 }
        }
    }
    
    # Display Results
    Write-Host "`n🚀 API LOAD TEST RESULTS:" -ForegroundColor Blue
    Write-Host "═════════════════════════════════════════════════════════════════" -ForegroundColor Gray
    
    Write-Host "Test Configuration:" -ForegroundColor Cyan
    Write-Host "  Concurrent Users: $concurrentUsers" -ForegroundColor White
    Write-Host "  Requests per User: $requestsPerUser" -ForegroundColor White
    Write-Host "  Total Duration: $([math]::Round($totalDuration, 2)) seconds" -ForegroundColor White
    
    Write-Host "Results Summary:" -ForegroundColor Cyan
    Write-Host "  Total Requests: $($loadTestResults.totalRequests)" -ForegroundColor White
    Write-Host "  Successful: $($loadTestResults.successfulRequests)" -ForegroundColor Green
    Write-Host "  Failed: $($loadTestResults.failedRequests)" -ForegroundColor $(if($loadTestResults.failedRequests -gt 0) {"Red"} else {"Green"})
    Write-Host "  Success Rate: $([math]::Round($loadTestResults.successRate, 2))%" -ForegroundColor $(if($loadTestResults.successRate -ge 95) {"Green"} else {"Yellow"})
    Write-Host "  Requests/Second: $([math]::Round($loadTestResults.requestsPerSecond, 2))" -ForegroundColor White
    
    Write-Host "Response Time Analysis:" -ForegroundColor Cyan
    Write-Host "  Average: $([math]::Round($loadTestResults.responseTimeStats.average, 2))ms" -ForegroundColor White
    Write-Host "  Min/Max: $($loadTestResults.responseTimeStats.min)ms / $($loadTestResults.responseTimeStats.max)ms" -ForegroundColor White
    Write-Host "  95th Percentile: $($loadTestResults.responseTimeStats.p95)ms" -ForegroundColor White
    Write-Host "  99th Percentile: $($loadTestResults.responseTimeStats.p99)ms" -ForegroundColor White
    
    return $loadTestResults
}

function Analyze-CacheEfficiency {
    Write-PerfStatus "Analyzing cache efficiency and hit ratios" "INFO"
    
    $cacheAnalysis = @{
        redisInfo = @{}
        recommendations = @()
        efficiency = @{}
    }
    
    try {
        # Get Redis INFO stats
        $redisInfo = docker exec dashdice-redis redis-cli INFO stats
        $redisMemory = docker exec dashdice-redis redis-cli INFO memory
        
        # Parse Redis statistics
        $stats = @{}
        foreach($line in $redisInfo -split "`n") {
            if($line -match "^([^:]+):(.+)$") {
                $stats[$matches[1]] = $matches[2].Trim()
            }
        }
        
        $memoryStats = @{}
        foreach($line in $redisMemory -split "`n") {
            if($line -match "^([^:]+):(.+)$") {
                $memoryStats[$matches[1]] = $matches[2].Trim()
            }
        }
        
        $cacheAnalysis.redisInfo = @{
            totalConnectionsReceived = [int]$stats['total_connections_received']
            totalCommandsProcessed = [int]$stats['total_commands_processed']
            usedMemory = $memoryStats['used_memory_human']
            usedMemoryPeak = $memoryStats['used_memory_peak_human']
            memoryFragmentationRatio = [float]$memoryStats['mem_fragmentation_ratio']
        }
        
        # Calculate efficiency metrics
        if($stats.ContainsKey('keyspace_hits') -and $stats.ContainsKey('keyspace_misses')) {
            $hits = [int]$stats['keyspace_hits']
            $misses = [int]$stats['keyspace_misses']
            $total = $hits + $misses
            
            if($total -gt 0) {
                $hitRatio = ($hits / $total) * 100
                $cacheAnalysis.efficiency.hitRatio = $hitRatio
                $cacheAnalysis.efficiency.totalRequests = $total
                $cacheAnalysis.efficiency.hits = $hits
                $cacheAnalysis.efficiency.misses = $misses
            }
        }
        
        # Generate recommendations
        if($cacheAnalysis.redisInfo.memoryFragmentationRatio -gt 1.5) {
            $cacheAnalysis.recommendations += "High memory fragmentation detected. Consider Redis memory optimization."
        }
        
        if($cacheAnalysis.efficiency.hitRatio -lt 80) {
            $cacheAnalysis.recommendations += "Cache hit ratio is below optimal threshold. Review caching strategy."
        }
        
        if($cacheAnalysis.redisInfo.totalCommandsProcessed -gt 100000) {
            $cacheAnalysis.recommendations += "High command volume detected. Consider connection pooling optimization."
        }
        
    } catch {
        Write-PerfStatus "Could not retrieve Redis cache statistics: $($_.Exception.Message)" "WARNING"
        $cacheAnalysis.redisInfo.error = $_.Exception.Message
    }
    
    # Display Analysis
    Write-Host "`n💾 CACHE EFFICIENCY ANALYSIS:" -ForegroundColor Blue
    Write-Host "═════════════════════════════════════════════════════════════════" -ForegroundColor Gray
    
    if($cacheAnalysis.redisInfo.error) {
        Write-Host "⚠️  Could not retrieve cache statistics" -ForegroundColor Yellow
    } else {
        Write-Host "Redis Statistics:" -ForegroundColor Cyan
        Write-Host "  Total Connections: $($cacheAnalysis.redisInfo.totalConnectionsReceived)" -ForegroundColor White
        Write-Host "  Commands Processed: $($cacheAnalysis.redisInfo.totalCommandsProcessed)" -ForegroundColor White
        Write-Host "  Memory Usage: $($cacheAnalysis.redisInfo.usedMemory)" -ForegroundColor White
        Write-Host "  Memory Peak: $($cacheAnalysis.redisInfo.usedMemoryPeak)" -ForegroundColor White
        Write-Host "  Fragmentation Ratio: $($cacheAnalysis.redisInfo.memoryFragmentationRatio)" -ForegroundColor White
        
        if($cacheAnalysis.efficiency.hitRatio) {
            Write-Host "Cache Efficiency:" -ForegroundColor Cyan
            Write-Host "  Hit Ratio: $([math]::Round($cacheAnalysis.efficiency.hitRatio, 2))%" -ForegroundColor $(if($cacheAnalysis.efficiency.hitRatio -ge 90) {"Green"} elseif($cacheAnalysis.efficiency.hitRatio -ge 80) {"Yellow"} else {"Red"})
            Write-Host "  Total Requests: $($cacheAnalysis.efficiency.totalRequests)" -ForegroundColor White
            Write-Host "  Hits: $($cacheAnalysis.efficiency.hits)" -ForegroundColor Green
            Write-Host "  Misses: $($cacheAnalysis.efficiency.misses)" -ForegroundColor Red
        }
        
        if($cacheAnalysis.recommendations.Count -gt 0) {
            Write-Host "Optimization Recommendations:" -ForegroundColor Yellow
            foreach($rec in $cacheAnalysis.recommendations) {
                Write-Host "  • $rec" -ForegroundColor White
            }
        } else {
            Write-Host "✅ Cache performance is optimal" -ForegroundColor Green
        }
    }
    
    return $cacheAnalysis
}

function Optimize-ServicePerformance {
    Write-PerfStatus "Running comprehensive service performance optimization" "INFO"
    
    $optimizationResults = @{
        timestamp = Get-Date
        cachePerformance = @{}
        apiLoadTest = @{}
        cacheAnalysis = @{}
        recommendations = @()
        overallScore = 0
    }
    
    # Step 1: Cache Performance Test
    Write-PerfStatus "Step 1: Testing cache performance..." "INFO"
    $optimizationResults.cachePerformance = Test-RedisPerformance -iterations 50
    
    # Step 2: API Load Test
    Write-PerfStatus "Step 2: Running API load test..." "INFO"
    $optimizationResults.apiLoadTest = Test-APILoadPerformance -concurrentUsers 5 -requestsPerUser 3
    
    # Step 3: Cache Efficiency Analysis
    Write-PerfStatus "Step 3: Analyzing cache efficiency..." "INFO"
    $optimizationResults.cacheAnalysis = Analyze-CacheEfficiency
    
    # Step 4: Generate Overall Recommendations
    $cacheScore = 100
    $apiScore = 100
    
    # Evaluate cache performance
    $avgCacheTime = ($optimizationResults.cachePerformance.overallStats.setStats.average + 
                    $optimizationResults.cachePerformance.overallStats.getStats.average + 
                    $optimizationResults.cachePerformance.overallStats.delStats.average) / 3
    
    if($avgCacheTime -gt 50) { $cacheScore -= 30 }
    elseif($avgCacheTime -gt 15) { $cacheScore -= 15 }
    elseif($avgCacheTime -gt 5) { $cacheScore -= 5 }
    
    # Evaluate API performance
    if($optimizationResults.apiLoadTest.successRate -lt 95) { $apiScore -= 40 }
    elseif($optimizationResults.apiLoadTest.successRate -lt 98) { $apiScore -= 20 }
    
    if($optimizationResults.apiLoadTest.responseTimeStats.average -gt 200) { $apiScore -= 30 }
    elseif($optimizationResults.apiLoadTest.responseTimeStats.average -gt 100) { $apiScore -= 15 }
    
    $optimizationResults.overallScore = ($cacheScore + $apiScore) / 2
    
    # Generate recommendations
    if($avgCacheTime -gt 15) {
        $optimizationResults.recommendations += "Consider implementing connection pooling for Redis"
    }
    
    if($optimizationResults.apiLoadTest.responseTimeStats.p95 -gt 500) {
        $optimizationResults.recommendations += "API response times need optimization - consider request batching"
    }
    
    if($optimizationResults.apiLoadTest.successRate -lt 99) {
        $optimizationResults.recommendations += "Implement better error handling and retry mechanisms"
    }
    
    if($optimizationResults.cacheAnalysis.efficiency.hitRatio -lt 90) {
        $optimizationResults.recommendations += "Optimize cache strategy for better hit ratios"
    }
    
    # Display Summary
    Write-Host "`n🎯 PERFORMANCE OPTIMIZATION SUMMARY:" -ForegroundColor Blue
    Write-Host "═════════════════════════════════════════════════════════════════" -ForegroundColor Gray
    
    Write-Host "Performance Scores:" -ForegroundColor Cyan
    Write-Host "  Cache Performance: $cacheScore/100" -ForegroundColor $(if($cacheScore -ge 90) {"Green"} elseif($cacheScore -ge 70) {"Yellow"} else {"Red"})
    Write-Host "  API Performance: $apiScore/100" -ForegroundColor $(if($apiScore -ge 90) {"Green"} elseif($apiScore -ge 70) {"Yellow"} else {"Red"})
    Write-Host "  Overall Score: $([math]::Round($optimizationResults.overallScore))/100" -ForegroundColor $(if($optimizationResults.overallScore -ge 90) {"Green"} elseif($optimizationResults.overallScore -ge 70) {"Yellow"} else {"Red"})
    
    if($optimizationResults.recommendations.Count -gt 0) {
        Write-Host "Optimization Recommendations:" -ForegroundColor Magenta
        foreach($rec in $optimizationResults.recommendations) {
            Write-Host "  🔧 $rec" -ForegroundColor White
        }
    } else {
        Write-Host "🏆 System is performing optimally!" -ForegroundColor Green
    }
    
    return $optimizationResults
}

function Show-PerformanceMenu {
    Write-Host "`n⚡ PERFORMANCE OPTIMIZATION MENU:" -ForegroundColor Blue
    Write-Host "─────────────────────────────────────────────────────" -ForegroundColor Gray
    Write-Host "[1] Full Performance Optimization Suite" -ForegroundColor White
    Write-Host "[2] Redis Cache Performance Test" -ForegroundColor White
    Write-Host "[3] API Load Testing" -ForegroundColor White
    Write-Host "[4] Cache Efficiency Analysis" -ForegroundColor White
    Write-Host "[5] Performance Monitoring Dashboard" -ForegroundColor White
    Write-Host "[6] Generate Performance Report" -ForegroundColor White
    Write-Host "[Q] Quit" -ForegroundColor White
    Write-Host ""
    
    $choice = Read-Host "Select option"
    
    switch($choice) {
        '1' { 
            $results = Optimize-ServicePerformance
            Show-PerformanceMenu
        }
        '2' { 
            Test-RedisPerformance -iterations 100
            Show-PerformanceMenu
        }
        '3' { 
            Test-APILoadPerformance -concurrentUsers 10 -requestsPerUser 5
            Show-PerformanceMenu
        }
        '4' {
            Analyze-CacheEfficiency
            Show-PerformanceMenu
        }
        '5' {
            Start-PerformanceMonitoring
        }
        '6' {
            $results = Optimize-ServicePerformance
            $reportPath = "performance-report-$(Get-Date -Format 'yyyyMMdd-HHmmss').json"
            $results | ConvertTo-Json -Depth 10 | Out-File -FilePath $reportPath
            Write-PerfStatus "Performance report generated: $reportPath" "GOOD"
            Show-PerformanceMenu
        }
        'Q' { 
            Write-PerfStatus "Performance optimization completed" "INFO"
            return 
        }
        default { 
            Write-PerfStatus "Invalid option selected" "WARNING"
            Show-PerformanceMenu
        }
    }
}

function Start-PerformanceMonitoring {
    Write-PerfStatus "🔄 Starting Performance Monitoring (Press 'Q' to stop)" "INFO"
    
    while($true) {
        Clear-Host
        Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Green
        Write-Host "║                  PERFORMANCE MONITORING ACTIVE                ║" -ForegroundColor Green
        Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Green
        Write-Host ""
        
        # Quick performance snapshot
        $snapshot = @{
            timestamp = Get-Date
            redisHealth = $null
            apiHealth = $null
        }
        
        # Redis ping test
        try {
            $timer = [System.Diagnostics.Stopwatch]::StartNew()
            $pingResult = docker exec dashdice-redis redis-cli ping
            $timer.Stop()
            
            if($pingResult -eq "PONG") {
                $snapshot.redisHealth = @{
                    status = "HEALTHY"
                    responseTime = $timer.ElapsedMilliseconds
                }
            }
        } catch {
            $snapshot.redisHealth = @{
                status = "ERROR"
                error = $_.Exception.Message
            }
        }
        
        # API health test
        try {
            $timer = [System.Diagnostics.Stopwatch]::StartNew()
            $apiResponse = Invoke-WebRequest -Uri "http://localhost:8080/health" -TimeoutSec 3
            $timer.Stop()
            
            $snapshot.apiHealth = @{
                status = "HEALTHY"
                responseTime = $timer.ElapsedMilliseconds
                statusCode = $apiResponse.StatusCode
            }
        } catch {
            $snapshot.apiHealth = @{
                status = "ERROR"
                error = $_.Exception.Message
            }
        }
        
        # Display results
        Write-Host "REAL-TIME PERFORMANCE METRICS:" -ForegroundColor Cyan
        Write-Host "─────────────────────────────────────────────────────" -ForegroundColor Gray
        
        if($snapshot.redisHealth.status -eq "HEALTHY") {
            Write-PerfStatus "Redis Cache: $($snapshot.redisHealth.responseTime)ms" "GOOD"
        } else {
            Write-PerfStatus "Redis Cache: ERROR" "CRITICAL"
        }
        
        if($snapshot.apiHealth.status -eq "HEALTHY") {
            Write-PerfStatus "API Gateway: $($snapshot.apiHealth.responseTime)ms" "GOOD"
        } else {
            Write-PerfStatus "API Gateway: ERROR" "CRITICAL"
        }
        
        Write-Host "`nNext update in 10 seconds... (Press 'Q' to quit)" -ForegroundColor Gray
        
        # Wait with interrupt capability
        for($i = 10; $i -gt 0; $i--) {
            if([Console]::KeyAvailable) {
                $key = [Console]::ReadKey($true)
                if($key.Key -eq 'Q') {
                    Write-PerfStatus "Performance monitoring stopped" "INFO"
                    return
                }
            }
            Start-Sleep -Seconds 1
        }
    }
}

# Initialize performance optimization
Write-PerfStatus "⚡ DashDice Performance Optimization Framework Initialized" "INFO"
Show-PerformanceMenu
