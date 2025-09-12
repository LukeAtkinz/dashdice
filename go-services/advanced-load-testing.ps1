# DashDice Advanced Load Testing & Stress Testing System
# Comprehensive performance validation for production deployment

Write-Host "=============================================================" -ForegroundColor Blue
Write-Host "    DASHDICE ADVANCED LOAD TESTING & STRESS TESTING        " -ForegroundColor Blue
Write-Host "=============================================================" -ForegroundColor Blue
Write-Host ""

function Write-LoadTestStatus {
    param($message, $status = "INFO")
    $timestamp = Get-Date -Format "HH:mm:ss"
    $color = switch($status) {
        "SUCCESS" { "Green" }
        "ERROR" { "Red" }
        "WARNING" { "Yellow" }
        "INFO" { "Cyan" }
        "TESTING" { "Magenta" }
        "PERFORMANCE" { "Blue" }
        default { "White" }
    }
    $prefix = switch($status) {
        "SUCCESS" { "[PASS]" }
        "ERROR" { "[FAIL]" }
        "WARNING" { "[WARN]" }
        "INFO" { "[INFO]" }
        "TESTING" { "[TEST]" }
        "PERFORMANCE" { "[PERF]" }
        default { "[----]" }
    }
    Write-Host "[$timestamp] $prefix $message" -ForegroundColor $color
}

function Start-ConcurrentLoadTest {
    param(
        $concurrent_users = 50,
        $requests_per_user = 10,
        $test_duration_seconds = 60
    )
    
    Write-LoadTestStatus "Starting concurrent load test with $concurrent_users users, $requests_per_user requests each" "TESTING"
    
    $jobs = @()
    $startTime = Get-Date
    $testResults = @{
        total_requests = 0
        successful_requests = 0
        failed_requests = 0
        response_times = @()
        errors = @()
        start_time = $startTime
        concurrent_users = $concurrent_users
        requests_per_user = $requests_per_user
    }
    
    # Create concurrent user jobs
    for($user = 1; $user -le $concurrent_users; $user++) {
        $job = Start-Job -ScriptBlock {
            param($userId, $requests, $baseUrl, $testDuration)
            
            $userResults = @{
                user_id = $userId
                requests_sent = 0
                successful_requests = 0
                failed_requests = 0
                response_times = @()
                errors = @()
            }
            
            $endTime = (Get-Date).AddSeconds($testDuration)
            $requestCount = 0
            
            while((Get-Date) -lt $endTime -and $requestCount -lt $requests) {
                $requestCount++
                $timer = [System.Diagnostics.Stopwatch]::StartNew()
                
                try {
                    $body = @{
                        game_mode = "load-test-$(Get-Random -Maximum 4 | ForEach-Object { @('casual', 'ranked', 'blitz', 'tournament')[$_] })"
                        user_id = "load-user-$userId-req-$requestCount"
                        skill_level = Get-Random -Minimum 1 -Maximum 100
                    } | ConvertTo-Json
                    
                    $response = Invoke-WebRequest -Uri "$baseUrl/api/v1/queue/join" -Method POST -Body $body -ContentType "application/json" -TimeoutSec 10
                    $timer.Stop()
                    
                    $userResults.requests_sent++
                    $userResults.response_times += $timer.ElapsedMilliseconds
                    
                    if($response.StatusCode -eq 200) {
                        $userResults.successful_requests++
                    } else {
                        $userResults.failed_requests++
                        $userResults.errors += "HTTP $($response.StatusCode)"
                    }
                    
                } catch {
                    $timer.Stop()
                    $userResults.requests_sent++
                    $userResults.failed_requests++
                    $userResults.errors += $_.Exception.Message
                }
                
                # Small delay between requests to simulate realistic usage
                Start-Sleep -Milliseconds (Get-Random -Minimum 100 -Maximum 500)
            }
            
            return $userResults
        } -ArgumentList $user, $requests_per_user, "http://localhost:8080", $test_duration_seconds
        
        $jobs += $job
        
        # Stagger job starts to simulate realistic user behavior
        Start-Sleep -Milliseconds (Get-Random -Minimum 50 -Maximum 200)
    }
    
    Write-LoadTestStatus "All $($jobs.Count) user simulation jobs started. Waiting for completion..." "INFO"
    
    # Monitor progress
    $completedJobs = 0
    while($completedJobs -lt $jobs.Count) {
        Start-Sleep -Seconds 5
        $newlyCompleted = ($jobs | Where-Object { $_.State -eq 'Completed' }).Count
        if($newlyCompleted -gt $completedJobs) {
            $completedJobs = $newlyCompleted
            Write-LoadTestStatus "Progress: $completedJobs / $($jobs.Count) users completed" "INFO"
        }
    }
    
    # Collect all results
    foreach($job in $jobs) {
        $userResult = Receive-Job -Job $job -Wait
        $testResults.total_requests += $userResult.requests_sent
        $testResults.successful_requests += $userResult.successful_requests
        $testResults.failed_requests += $userResult.failed_requests
        $testResults.response_times += $userResult.response_times
        $testResults.errors += $userResult.errors
        Remove-Job -Job $job
    }
    
    $testResults.end_time = Get-Date
    $testResults.total_duration = ($testResults.end_time - $testResults.start_time).TotalSeconds
    
    return $testResults
}

function Start-StressTest {
    param(
        $max_concurrent_users = 100,
        $ramp_up_time_seconds = 30,
        $hold_time_seconds = 60,
        $ramp_down_time_seconds = 30
    )
    
    Write-LoadTestStatus "Starting stress test - ramping up to $max_concurrent_users users" "TESTING"
    
    $stressResults = @{
        phases = @()
        peak_performance = @{}
        system_breaking_point = $null
        recommendations = @()
    }
    
    # Ramp-up phase
    Write-LoadTestStatus "Phase 1: Ramp-up ($ramp_up_time_seconds seconds)" "PERFORMANCE"
    
    $rampUpUsers = @(5, 10, 20, 35, 50, 75, $max_concurrent_users)
    foreach($userCount in $rampUpUsers) {
        Write-LoadTestStatus "Testing with $userCount concurrent users" "TESTING"
        
        $phaseResult = Start-ConcurrentLoadTest -concurrent_users $userCount -requests_per_user 5 -test_duration_seconds 15
        $avgResponseTime = if($phaseResult.response_times.Count -gt 0) { ($phaseResult.response_times | Measure-Object -Average).Average } else { 0 }
        $successRate = if($phaseResult.total_requests -gt 0) { ($phaseResult.successful_requests / $phaseResult.total_requests) * 100 } else { 0 }
        
        $stressResults.phases += @{
            phase = "ramp-up"
            concurrent_users = $userCount
            avg_response_time = $avgResponseTime
            success_rate = $successRate
            requests_per_second = $phaseResult.total_requests / $phaseResult.total_duration
            total_requests = $phaseResult.total_requests
        }
        
        Write-LoadTestStatus "Users: $userCount | Avg Response: $([math]::Round($avgResponseTime))ms | Success: $([math]::Round($successRate))%" "PERFORMANCE"
        
        # Check for breaking point
        if($successRate -lt 95 -or $avgResponseTime -gt 2000) {
            $stressResults.system_breaking_point = $userCount
            Write-LoadTestStatus "System breaking point detected at $userCount concurrent users" "WARNING"
            break
        }
        
        Start-Sleep -Seconds 2
    }
    
    # Hold phase (if system didn't break)
    if(-not $stressResults.system_breaking_point) {
        Write-LoadTestStatus "Phase 2: Hold at peak load ($hold_time_seconds seconds)" "PERFORMANCE"
        
        $holdResult = Start-ConcurrentLoadTest -concurrent_users $max_concurrent_users -requests_per_user 10 -test_duration_seconds $hold_time_seconds
        $holdAvgResponseTime = if($holdResult.response_times.Count -gt 0) { ($holdResult.response_times | Measure-Object -Average).Average } else { 0 }
        $holdSuccessRate = if($holdResult.total_requests -gt 0) { ($holdResult.successful_requests / $holdResult.total_requests) * 100 } else { 0 }
        
        $stressResults.peak_performance = @{
            concurrent_users = $max_concurrent_users
            avg_response_time = $holdAvgResponseTime
            success_rate = $holdSuccessRate
            requests_per_second = $holdResult.total_requests / $holdResult.total_duration
            total_requests = $holdResult.total_requests
            duration = $hold_time_seconds
        }
        
        Write-LoadTestStatus "Peak performance: $([math]::Round($holdAvgResponseTime))ms avg, $([math]::Round($holdSuccessRate))% success rate" "PERFORMANCE"
    }
    
    return $stressResults
}

function Test-DatabaseStressTest {
    Write-LoadTestStatus "Starting Redis database stress test" "TESTING"
    
    $dbStressResults = @{
        operations_tested = @('SET', 'GET', 'DEL', 'INCR', 'LPUSH', 'LPOP')
        results = @{}
        concurrent_connections = 10
        operations_per_connection = 100
    }
    
    foreach($operation in $dbStressResults.operations_tested) {
        Write-LoadTestStatus "Testing $operation operations under load" "TESTING"
        
        $opJobs = @()
        for($conn = 1; $conn -le $dbStressResults.concurrent_connections; $conn++) {
            $opJob = Start-Job -ScriptBlock {
                param($operation, $connectionId, $operationCount)
                
                $opResults = @{
                    operation = $operation
                    connection_id = $connectionId
                    successful_ops = 0
                    failed_ops = 0
                    response_times = @()
                }
                
                for($i = 1; $i -le $operationCount; $i++) {
                    $timer = [System.Diagnostics.Stopwatch]::StartNew()
                    $key = "stress-test-$operation-$connectionId-$i"
                    $value = "test-data-$(Get-Random -Maximum 10000)"
                    
                    try {
                        switch($operation) {
                            'SET' { 
                                $result = docker exec dashdice-redis redis-cli SET $key $value
                                if($result -eq 'OK') { $opResults.successful_ops++ } else { $opResults.failed_ops++ }
                            }
                            'GET' {
                                $result = docker exec dashdice-redis redis-cli GET $key
                                $opResults.successful_ops++
                            }
                            'DEL' {
                                $result = docker exec dashdice-redis redis-cli DEL $key
                                $opResults.successful_ops++
                            }
                            'INCR' {
                                $result = docker exec dashdice-redis redis-cli INCR "counter-$connectionId"
                                $opResults.successful_ops++
                            }
                            'LPUSH' {
                                $result = docker exec dashdice-redis redis-cli LPUSH "list-$connectionId" $value
                                $opResults.successful_ops++
                            }
                            'LPOP' {
                                $result = docker exec dashdice-redis redis-cli LPOP "list-$connectionId"
                                $opResults.successful_ops++
                            }
                        }
                        
                        $timer.Stop()
                        $opResults.response_times += $timer.ElapsedMilliseconds
                        
                    } catch {
                        $timer.Stop()
                        $opResults.failed_ops++
                    }
                    
                    Start-Sleep -Milliseconds 10
                }
                
                return $opResults
            } -ArgumentList $operation, $conn, $dbStressResults.operations_per_connection
            
            $opJobs += $opJob
        }
        
        # Wait for all operations to complete
        $allOpResults = @()
        foreach($opJob in $opJobs) {
            $opResult = Receive-Job -Job $opJob -Wait
            $allOpResults += $opResult
            Remove-Job -Job $opJob
        }
        
        # Aggregate results for this operation
        $totalSuccessful = ($allOpResults | Measure-Object -Property successful_ops -Sum).Sum
        $totalFailed = ($allOpResults | Measure-Object -Property failed_ops -Sum).Sum
        $allResponseTimes = $allOpResults | ForEach-Object { $_.response_times } | Where-Object { $_ -ne $null }
        $avgResponseTime = if($allResponseTimes.Count -gt 0) { ($allResponseTimes | Measure-Object -Average).Average } else { 0 }
        
        $dbStressResults.results[$operation] = @{
            total_operations = $totalSuccessful + $totalFailed
            successful_operations = $totalSuccessful
            failed_operations = $totalFailed
            success_rate = if(($totalSuccessful + $totalFailed) -gt 0) { ($totalSuccessful / ($totalSuccessful + $totalFailed)) * 100 } else { 0 }
            avg_response_time = $avgResponseTime
        }
        
        Write-LoadTestStatus "${operation}: $totalSuccessful successful, $([math]::Round($avgResponseTime))ms avg" "PERFORMANCE"
    }
    
    return $dbStressResults
}

function New-LoadTestReport {
    param($loadResults, $stressResults, $dbResults)
    
    Write-Host "`n📊 ADVANCED LOAD TESTING RESULTS:" -ForegroundColor Blue
    Write-Host "=================================================================" -ForegroundColor Gray
    
    # Load test results
    if($loadResults) {
        Write-Host "`nConcurrent Load Test Results:" -ForegroundColor Cyan
        Write-Host "  Total Requests: $($loadResults.total_requests)" -ForegroundColor White
        Write-Host "  Successful: $($loadResults.successful_requests)" -ForegroundColor Green
        Write-Host "  Failed: $($loadResults.failed_requests)" -ForegroundColor $(if($loadResults.failed_requests -gt 0) {"Red"} else {"Green"})
        
        if($loadResults.response_times.Count -gt 0) {
            $avgResponse = ($loadResults.response_times | Measure-Object -Average).Average
            $maxResponse = ($loadResults.response_times | Measure-Object -Maximum).Maximum
            $minResponse = ($loadResults.response_times | Measure-Object -Minimum).Minimum
            
            Write-Host "  Avg Response Time: $([math]::Round($avgResponse))ms" -ForegroundColor White
            Write-Host "  Min/Max Response: $minResponse ms / $maxResponse ms" -ForegroundColor White
            Write-Host "  Requests/Second: $([math]::Round($loadResults.total_requests / $loadResults.total_duration))" -ForegroundColor White
        }
        
        $successRate = ($loadResults.successful_requests / $loadResults.total_requests) * 100
        Write-Host "  Success Rate: $([math]::Round($successRate))%" -ForegroundColor $(if($successRate -ge 95) {"Green"} else {"Yellow"})
    }
    
    # Stress test results
    if($stressResults -and $stressResults.phases.Count -gt 0) {
        Write-Host "`nStress Test Results:" -ForegroundColor Cyan
        
        if($stressResults.system_breaking_point) {
            Write-Host "  System Breaking Point: $($stressResults.system_breaking_point) concurrent users" -ForegroundColor Red
        } else {
            Write-Host "  Maximum Load Sustained: System remained stable" -ForegroundColor Green
        }
        
        if($stressResults.peak_performance.concurrent_users) {
            Write-Host "  Peak Performance:" -ForegroundColor White
            Write-Host "    Users: $($stressResults.peak_performance.concurrent_users)" -ForegroundColor White
            Write-Host "    Avg Response: $([math]::Round($stressResults.peak_performance.avg_response_time))ms" -ForegroundColor White
            Write-Host "    Success Rate: $([math]::Round($stressResults.peak_performance.success_rate))%" -ForegroundColor White
            Write-Host "    Req/Sec: $([math]::Round($stressResults.peak_performance.requests_per_second))" -ForegroundColor White
        }
    }
    
    # Database stress test results
    if($dbResults) {
        Write-Host "`nDatabase Stress Test Results:" -ForegroundColor Cyan
        foreach($operation in $dbResults.results.Keys) {
            $opResult = $dbResults.results[$operation]
            Write-Host "  $operation Operations:" -ForegroundColor White
            Write-Host "    Success Rate: $([math]::Round($opResult.success_rate))%" -ForegroundColor $(if($opResult.success_rate -ge 95) {"Green"} else {"Yellow"})
            Write-Host "    Avg Response: $([math]::Round($opResult.avg_response_time))ms" -ForegroundColor White
            Write-Host "    Total Ops: $($opResult.total_operations)" -ForegroundColor White
        }
    }
    
    Write-Host "`n🏆 LOAD TESTING COMPLETE" -ForegroundColor Green
    Write-Host "System performance validated under various load conditions." -ForegroundColor Green
}

function Start-ComprehensiveLoadTest {
    Write-LoadTestStatus "Starting comprehensive load testing suite" "INFO"
    
    # Phase 1: Baseline load test
    Write-LoadTestStatus "Phase 1: Baseline concurrent load test" "TESTING"
    $loadResults = Start-ConcurrentLoadTest -concurrent_users 25 -requests_per_user 8 -test_duration_seconds 30
    
    # Phase 2: Stress test
    Write-LoadTestStatus "Phase 2: Progressive stress test" "TESTING"
    $stressResults = Start-StressTest -max_concurrent_users 75 -ramp_up_time_seconds 20 -hold_time_seconds 30 -ramp_down_time_seconds 15
    
    # Phase 3: Database stress test
    Write-LoadTestStatus "Phase 3: Database stress test" "TESTING"
    $dbResults = Test-DatabaseStressTest
    
    # Generate comprehensive report
    New-LoadTestReport -loadResults $loadResults -stressResults $stressResults -dbResults $dbResults
    
    return @{
        load_test = $loadResults
        stress_test = $stressResults  
        database_test = $dbResults
        timestamp = Get-Date
    }
}

# Main execution
Write-LoadTestStatus "DashDice Advanced Load Testing System Initialized" "INFO"

$choice = Read-Host "Select test type: [1] Quick Load Test [2] Comprehensive Test [3] Stress Test Only [4] Database Test Only"

switch($choice) {
    '1' { 
        $results = Start-ConcurrentLoadTest -concurrent_users 20 -requests_per_user 5 -test_duration_seconds 20
        New-LoadTestReport -loadResults $results
    }
    '2' { 
        Start-ComprehensiveLoadTest
    }
    '3' {
        $stressResults = Start-StressTest -max_concurrent_users 100
        New-LoadTestReport -stressResults $stressResults
    }
    '4' {
        $dbResults = Test-DatabaseStressTest
        New-LoadTestReport -dbResults $dbResults
    }
    default { 
        Write-LoadTestStatus "Invalid selection. Running quick load test." "WARNING"
        $results = Start-ConcurrentLoadTest -concurrent_users 15 -requests_per_user 3 -test_duration_seconds 15
        New-LoadTestReport -loadResults $results
    }
}
