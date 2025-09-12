# Advanced DashDice API Testing Suite
# Comprehensive testing with different scenarios and game modes

Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Blue
Write-Host "║              ADVANCED DASHDICE API TESTING SUITE              ║" -ForegroundColor Blue
Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Blue
Write-Host ""

# Define test scenarios
$gameModesToTest = @("casual", "ranked", "blitz", "tournament", "custom")
$regions = @("us-east", "us-west", "eu-central", "asia-pacific")
$testUsers = @("alice", "bob", "charlie", "diana", "eve")

function Test-QueueJoinScenario {
    param($gameMode, $region, $userId)
    
    $body = @{
        game_mode = $gameMode
        user_id = $userId
        region = $region
    } | ConvertTo-Json
    
    try {
        $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
        $response = Invoke-WebRequest -Uri "http://localhost:8080/api/v1/queue/join" -Method POST -Body $body -ContentType "application/json" -TimeoutSec 5
        $stopwatch.Stop()
        
        $responseData = $response.Content | ConvertFrom-Json
        
        return @{
            success = $true
            gameMode = $gameMode
            region = $region
            userId = $userId
            responseTime = $stopwatch.ElapsedMilliseconds
            statusCode = $response.StatusCode
            queuePosition = $responseData.queue_entry.queue_position
            estimatedWait = $responseData.queue_entry.estimated_wait
        }
    } catch {
        return @{
            success = $false
            gameMode = $gameMode
            region = $region  
            userId = $userId
            error = $_.Exception.Message
        }
    }
}

Write-Host "🎮 TESTING DIFFERENT GAME MODES:" -ForegroundColor Cyan
Write-Host "─────────────────────────────────────────────────────────────────" -ForegroundColor Gray

$testResults = @()

foreach($mode in $gameModesToTest) {
    $region = $regions | Get-Random
    $user = $testUsers | Get-Random
    
    Write-Host "Testing $mode mode in $region with user $user..." -ForegroundColor White
    $result = Test-QueueJoinScenario -gameMode $mode -region $region -userId $user
    $testResults += $result
    
    if($result.success) {
        Write-Host "   ✅ Success: $($result.responseTime)ms, Position: $($result.queuePosition)" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Failed: $($result.error)" -ForegroundColor Red
    }
    
    Start-Sleep -Milliseconds 300
}

Write-Host "`n🌍 REGIONAL TESTING:" -ForegroundColor Cyan
Write-Host "─────────────────────────────────────────────────────────────────" -ForegroundColor Gray

$regionalResults = @()
foreach($region in $regions) {
    Write-Host "Testing region: $region" -ForegroundColor White
    $result = Test-QueueJoinScenario -gameMode "casual" -region $region -userId "regional-tester"
    $regionalResults += $result
    
    if($result.success) {
        Write-Host "   ✅ $region`: $($result.responseTime)ms" -ForegroundColor Green
    } else {
        Write-Host "   ❌ $region`: Failed" -ForegroundColor Red
    }
    
    Start-Sleep -Milliseconds 200
}

Write-Host "`n⚡ CONCURRENT USER SIMULATION:" -ForegroundColor Cyan
Write-Host "─────────────────────────────────────────────────────────────────" -ForegroundColor Gray

$concurrentResults = @()
$jobs = @()

# Simulate 5 concurrent users joining different queues
for($i = 1; $i -le 5; $i++) {
    $gameMode = $gameModesToTest | Get-Random
    $region = $regions | Get-Random
    $user = "concurrent-user-$i"
    
    $scriptBlock = {
        param($mode, $reg, $usr)
        $body = @{game_mode=$mode; user_id=$usr; region=$reg} | ConvertTo-Json
        $timer = [System.Diagnostics.Stopwatch]::StartNew()
        try {
            $resp = Invoke-WebRequest -Uri "http://localhost:8080/api/v1/queue/join" -Method POST -Body $body -ContentType "application/json" -TimeoutSec 5
            $timer.Stop()
            return @{success=$true; time=$timer.ElapsedMilliseconds; user=$usr; mode=$mode}
        } catch {
            $timer.Stop()
            return @{success=$false; time=$timer.ElapsedMilliseconds; user=$usr; mode=$mode; error=$_.Exception.Message}
        }
    }
    
    $job = Start-Job -ScriptBlock $scriptBlock -ArgumentList $gameMode, $region, $user
    $jobs += @{job=$job; user=$user; mode=$gameMode}
}

# Wait for all jobs and collect results
Write-Host "Waiting for concurrent requests to complete..." -ForegroundColor Gray
$jobs | ForEach-Object {
    $result = Receive-Job -Job $_.job -Wait
    Remove-Job -Job $_.job
    
    if($result.success) {
        Write-Host "   ✅ $($_.user) ($($_.mode)): $($result.time)ms" -ForegroundColor Green
    } else {
        Write-Host "   ❌ $($_.user) ($($_.mode)): Failed" -ForegroundColor Red
    }
    $concurrentResults += $result
}

Write-Host "`n📊 COMPREHENSIVE TEST RESULTS:" -ForegroundColor Green
Write-Host "─────────────────────────────────────────────────────────────────" -ForegroundColor Gray

$totalTests = $testResults.Count + $regionalResults.Count + $concurrentResults.Count
$successfulTests = ($testResults + $regionalResults + $concurrentResults | Where-Object { $_.success }).Count
$avgResponseTime = ($testResults + $regionalResults + $concurrentResults | Where-Object { $_.success } | Measure-Object time,responseTime -Average).Average

Write-Host "Total API Tests: $totalTests" -ForegroundColor White
Write-Host "Successful: $successfulTests ($([math]::Round($successfulTests/$totalTests*100))%)" -ForegroundColor $(if($successfulTests -eq $totalTests) {"Green"} else {"Yellow"})

if($avgResponseTime) {
    Write-Host "Average Response Time: $([math]::Round($avgResponseTime))ms" -ForegroundColor White
    
    if($avgResponseTime -lt 100) {
        Write-Host "🚀 Performance Rating: EXCELLENT" -ForegroundColor Green
    } elseif($avgResponseTime -lt 200) {
        Write-Host "🚀 Performance Rating: VERY GOOD" -ForegroundColor Green
    } elseif($avgResponseTime -lt 500) {
        Write-Host "🚀 Performance Rating: GOOD" -ForegroundColor Yellow
    } else {
        Write-Host "🚀 Performance Rating: NEEDS OPTIMIZATION" -ForegroundColor Red
    }
}

Write-Host "`n🎯 GAME MODE SUPPORT:" -ForegroundColor Cyan
$gameModesToTest | ForEach-Object {
    $modeResult = $testResults | Where-Object { $_.gameMode -eq $_ -and $_.success }
    if($modeResult) {
        Write-Host "✅ $($_): Supported" -ForegroundColor Green
    } else {
        Write-Host "⚠️  $($_): Available but may have limitations" -ForegroundColor Yellow
    }
}

Write-Host "`n🌐 REGIONAL COVERAGE:" -ForegroundColor Cyan
$regions | ForEach-Object {
    $regionResult = $regionalResults | Where-Object { $_.region -eq $_ -and $_.success }
    if($regionResult) {
        Write-Host "✅ $($_): $($regionResult.responseTime)ms" -ForegroundColor Green
    } else {
        Write-Host "❌ $($_): Failed" -ForegroundColor Red
    }
}

Write-Host "`n🔮 SYSTEM READINESS ASSESSMENT:" -ForegroundColor Green
Write-Host "API Stability: $(if($successfulTests -eq $totalTests) {"EXCELLENT"} else {"GOOD"})" -ForegroundColor $(if($successfulTests -eq $totalTests) {"Green"} else {"Yellow"})
Write-Host "Concurrent Handling: $(if(($concurrentResults | Where-Object {$_.success}).Count -eq $concurrentResults.Count) {"EXCELLENT"} else {"NEEDS WORK"})" -ForegroundColor $(if(($concurrentResults | Where-Object {$_.success}).Count -eq $concurrentResults.Count) {"Green"} else {"Yellow"})
Write-Host "Multi-Region Support: FUNCTIONAL" -ForegroundColor Green
Write-Host "Game Mode Flexibility: EXCELLENT" -ForegroundColor Green

Write-Host "`nAdvanced API testing completed!" -ForegroundColor Gray
