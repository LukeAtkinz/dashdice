# Advanced Monitoring & Alerting System for DashDice Microservices
# Monitors health, performance, and provides automated alerting

param(
    [int]$MonitoringInterval = 30,  # seconds between checks
    [int]$AlertThreshold = 500,     # response time threshold for alerts (ms)
    [int]$MaxFailures = 3           # max consecutive failures before alert
)

# Configuration
$Services = @(
    @{name="API Gateway"; port=8080; critical=$true},
    @{name="Match Service"; port=8081; critical=$true},
    @{name="Queue Service"; port=8082; critical=$true},
    @{name="Notification Service"; port=8083; critical=$false}
)

$MonitoringState = @{
    startTime = Get-Date
    totalChecks = 0
    alerts = @()
    serviceStates = @{}
}

# Initialize service states
$Services | ForEach-Object {
    $MonitoringState.serviceStates[$_.name] = @{
        consecutiveFailures = 0
        lastResponseTime = 0
        status = "unknown"
        lastCheck = $null
    }
}

function Test-ServiceHealth {
    param($service)
    
    try {
        $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
        $response = Invoke-WebRequest -Uri "http://localhost:$($service.port)/health" -TimeoutSec 5
        $stopwatch.Stop()
        
        $healthData = $response.Content | ConvertFrom-Json
        
        return @{
            success = $true
            responseTime = $stopwatch.ElapsedMilliseconds
            status = $healthData.status
            service = $healthData.service
            timestamp = Get-Date
        }
    } catch {
        return @{
            success = $false
            error = $_.Exception.Message
            responseTime = 0
            timestamp = Get-Date
        }
    }
}

function Send-Alert {
    param($alertType, $serviceName, $details)
    
    $alert = @{
        type = $alertType
        service = $serviceName
        details = $details
        timestamp = Get-Date
        id = [System.Guid]::NewGuid()
    }
    
    $MonitoringState.alerts += $alert
    
    # In a real system, this would send to Slack, email, etc.
    Write-Host "🚨 ALERT: [$alertType] $serviceName - $details" -ForegroundColor Red -BackgroundColor Yellow
    
    # Keep only last 50 alerts
    if($MonitoringState.alerts.Count -gt 50) {
        $MonitoringState.alerts = $MonitoringState.alerts[-50..-1]
    }
}

function Show-MonitoringDashboard {
    Clear-Host
    
    $uptime = (Get-Date) - $MonitoringState.startTime
    
    Write-Host "╔═══════════════════════════════════════════════════════════════════╗" -ForegroundColor Blue
    Write-Host "║              DASHDICE MICROSERVICES MONITORING CENTER            ║" -ForegroundColor Blue
    Write-Host "╚═══════════════════════════════════════════════════════════════════╝" -ForegroundColor Blue
    Write-Host ""
    Write-Host "🕒 Monitoring Since: $($MonitoringState.startTime.ToString('yyyy-MM-dd HH:mm:ss'))" -ForegroundColor Gray
    Write-Host "⏱️  Uptime: $([math]::Floor($uptime.TotalHours))h $($uptime.Minutes)m $($uptime.Seconds)s" -ForegroundColor Gray
    Write-Host "📊 Total Checks: $($MonitoringState.totalChecks)" -ForegroundColor Gray
    Write-Host "🚨 Active Alerts: $($MonitoringState.alerts.Count)" -ForegroundColor $(if($MonitoringState.alerts.Count -eq 0) {"Green"} else {"Red"})
    Write-Host ""
    
    Write-Host "📋 SERVICE STATUS:" -ForegroundColor Cyan
    Write-Host "─────────────────────────────────────────────────────────────────────" -ForegroundColor Gray
    
    $healthyServices = 0
    $totalServices = $Services.Count
    
    foreach($service in $Services) {
        $state = $MonitoringState.serviceStates[$service.name]
        $statusIcon = if($state.status -eq "healthy") {"✅"} elseif($state.status -eq "unknown") {"❓"} else {"❌"}
        $criticalIcon = if($service.critical) {"🔥"} else {"📋"}
        
        Write-Host "$statusIcon $criticalIcon $($service.name.PadRight(20))" -NoNewline
        
        if($state.status -eq "healthy") {
            $healthyServices++
            Write-Host "HEALTHY" -ForegroundColor Green -NoNewline
            Write-Host " ($($state.lastResponseTime)ms)" -ForegroundColor Gray
        } elseif($state.consecutiveFailures -gt 0) {
            Write-Host "FAILING" -ForegroundColor Red -NoNewline  
            Write-Host " (Failures: $($state.consecutiveFailures))" -ForegroundColor Gray
        } else {
            Write-Host "UNKNOWN" -ForegroundColor Yellow
        }
    }
    
    Write-Host ""
    Write-Host "🎯 SYSTEM HEALTH: $healthyServices/$totalServices services healthy ($([math]::Round($healthyServices/$totalServices*100))%)" -ForegroundColor $(if($healthyServices -eq $totalServices) {"Green"} else {"Yellow"})
    
    # Show recent alerts
    if($MonitoringState.alerts.Count -gt 0) {
        Write-Host ""
        Write-Host "🚨 RECENT ALERTS:" -ForegroundColor Red
        Write-Host "─────────────────────────────────────────────────────────────────────" -ForegroundColor Gray
        
        $recentAlerts = $MonitoringState.alerts | Sort-Object timestamp -Descending | Select-Object -First 5
        foreach($alert in $recentAlerts) {
            $timeAgo = ((Get-Date) - $alert.timestamp).TotalMinutes
            Write-Host "[$($alert.timestamp.ToString('HH:mm:ss'))] $($alert.type): $($alert.service) - $($alert.details)" -ForegroundColor Red
        }
    }
    
    Write-Host ""
    Write-Host "Press 'Q' to quit, any other key to refresh..." -ForegroundColor Gray
}

# Main monitoring loop
Write-Host "Starting DashDice Microservices Monitoring..." -ForegroundColor Green
Write-Host "Monitoring Interval: ${MonitoringInterval}s" -ForegroundColor Gray
Write-Host "Alert Threshold: ${AlertThreshold}ms" -ForegroundColor Gray
Write-Host ""

while($true) {
    # Perform health checks
    foreach($service in $Services) {
        $result = Test-ServiceHealth -service $service
        $state = $MonitoringState.serviceStates[$service.name]
        
        if($result.success) {
            # Service is healthy
            if($state.consecutiveFailures -gt 0) {
                Send-Alert -alertType "RECOVERY" -serviceName $service.name -details "Service recovered after $($state.consecutiveFailures) failures"
            }
            
            $state.consecutiveFailures = 0
            $state.lastResponseTime = $result.responseTime
            $state.status = $result.status
            $state.lastCheck = $result.timestamp
            
            # Check for performance alerts
            if($result.responseTime -gt $AlertThreshold) {
                Send-Alert -alertType "PERFORMANCE" -serviceName $service.name -details "Slow response time: $($result.responseTime)ms"
            }
            
        } else {
            # Service is failing
            $state.consecutiveFailures++
            $state.status = "failing"
            $state.lastCheck = $result.timestamp
            
            if($state.consecutiveFailures -eq 1) {
                Send-Alert -alertType "WARNING" -serviceName $service.name -details "Service failure detected"
            } elseif($state.consecutiveFailures -ge $MaxFailures) {
                Send-Alert -alertType "CRITICAL" -serviceName $service.name -details "Service down for $($state.consecutiveFailures) consecutive checks"
            }
        }
    }
    
    $MonitoringState.totalChecks++
    
    # Show dashboard
    Show-MonitoringDashboard
    
    # Wait for key or timeout
    $timeout = New-TimeSpan -Seconds $MonitoringInterval
    $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
    
    while ($stopwatch.Elapsed -lt $timeout) {
        if ([Console]::KeyAvailable) {
            $key = [Console]::ReadKey($true)
            if ($key.Key -eq 'Q') {
                Write-Host "`nMonitoring stopped." -ForegroundColor Gray
                exit
            }
            break
        }
        Start-Sleep -Milliseconds 100
    }
}
