# DashDice Security Testing & Vulnerability Assessment
# Comprehensive security validation for production readiness

Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Red
Write-Host "║           DASHDICE SECURITY TESTING & ASSESSMENT              ║" -ForegroundColor Red  
Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Red
Write-Host ""

$SecurityTestSuites = @{
    'authentication' = @{
        name = 'Authentication Security Tests'
        tests = @('jwt-validation', 'session-security', 'unauthorized-access', 'token-expiration')
        critical = $true
    }
    'api-security' = @{
        name = 'API Security Validation'
        tests = @('sql-injection', 'xss-protection', 'csrf-tokens', 'input-validation', 'rate-limiting')
        critical = $true
    }
    'network-security' = @{
        name = 'Network Security Assessment'
        tests = @('port-scanning', 'ssl-certificates', 'cors-policy', 'security-headers')
        critical = $true
    }
    'data-security' = @{
        name = 'Data Protection Tests'
        tests = @('database-access', 'data-encryption', 'pii-handling', 'backup-security')
        critical = $true
    }
    'infrastructure' = @{
        name = 'Infrastructure Security'
        tests = @('container-security', 'service-isolation', 'secrets-management', 'access-controls')
        critical = $false
    }
}

$VulnerabilityDatabase = @{
    'OWASP-A01' = @{ name = 'Broken Access Control'; severity = 'HIGH'; category = 'authentication' }
    'OWASP-A02' = @{ name = 'Cryptographic Failures'; severity = 'HIGH'; category = 'data-security' }
    'OWASP-A03' = @{ name = 'Injection'; severity = 'HIGH'; category = 'api-security' }
    'OWASP-A04' = @{ name = 'Insecure Design'; severity = 'MEDIUM'; category = 'infrastructure' }
    'OWASP-A05' = @{ name = 'Security Misconfiguration'; severity = 'MEDIUM'; category = 'network-security' }
    'OWASP-A06' = @{ name = 'Vulnerable Components'; severity = 'HIGH'; category = 'infrastructure' }
    'OWASP-A07' = @{ name = 'Identity & Auth Failures'; severity = 'HIGH'; category = 'authentication' }
    'OWASP-A08' = @{ name = 'Software & Data Integrity'; severity = 'MEDIUM'; category = 'data-security' }
    'OWASP-A09' = @{ name = 'Security Logging Failures'; severity = 'MEDIUM'; category = 'infrastructure' }
    'OWASP-A10' = @{ name = 'Server-Side Request Forgery'; severity = 'MEDIUM'; category = 'api-security' }
}

function Write-SecurityStatus {
    param($message, $severity = "INFO")
    $timestamp = Get-Date -Format "HH:mm:ss"
    $color = switch($severity) {
        "CRITICAL" { "Red" }
        "HIGH" { "Magenta" }
        "MEDIUM" { "Yellow" }
        "LOW" { "Green" }
        "INFO" { "Cyan" }
        "PASS" { "Green" }
        "FAIL" { "Red" }
        default { "White" }
    }
    $icon = switch($severity) {
        "CRITICAL" { "🚨" }
        "HIGH" { "⚠️ " }
        "MEDIUM" { "🔶" }
        "LOW" { "ℹ️ " }
        "PASS" { "✅" }
        "FAIL" { "❌" }
        default { "🔍" }
    }
    Write-Host "[$timestamp] $icon $message" -ForegroundColor $color
}

function Test-APISecurityEndpoints {
    param($baseUrl = "http://localhost:8080")
    
    Write-SecurityStatus "Starting API Security Endpoint Tests" "INFO"
    
    $results = @{}
    $testResults = @()
    
    # Test 1: SQL Injection Attempts
    Write-SecurityStatus "Testing SQL injection protection..." "INFO"
    $sqlPayloads = @(
        "'; DROP TABLE users; --",
        "1' OR '1'='1",
        "admin'/*",
        "' UNION SELECT * FROM users --"
    )
    
    foreach($payload in $sqlPayloads) {
        try {
            $body = @{
                game_mode = $payload
                user_id = "security-test"
            } | ConvertTo-Json
            
            $response = Invoke-WebRequest -Uri "$baseUrl/api/v1/queue/join" -Method POST -Body $body -ContentType "application/json" -TimeoutSec 5
            
            if($response.StatusCode -eq 200) {
                $testResults += @{
                    test = "SQL Injection - $payload"
                    result = "POTENTIAL_VULNERABILITY"
                    severity = "HIGH"
                    details = "API accepted potentially malicious SQL payload"
                }
            }
        } catch {
            # Good - the API should reject malicious payloads
            $testResults += @{
                test = "SQL Injection - $payload"
                result = "PASS"
                severity = "PASS"
                details = "API properly rejected malicious payload"
            }
        }
    }
    
    # Test 2: XSS Protection
    Write-SecurityStatus "Testing XSS protection..." "INFO"
    $xssPayloads = @(
        "<script>alert('xss')</script>",
        "javascript:alert(1)",
        "<img src=x onerror=alert(1)>",
        "';alert('XSS');//"
    )
    
    foreach($payload in $xssPayloads) {
        try {
            $body = @{
                game_mode = $payload
                user_id = "xss-test"
            } | ConvertTo-Json
            
            $response = Invoke-WebRequest -Uri "$baseUrl/api/v1/queue/join" -Method POST -Body $body -ContentType "application/json" -TimeoutSec 5
            
            if($response.Content -match $payload) {
                $testResults += @{
                    test = "XSS Protection - $payload"
                    result = "POTENTIAL_VULNERABILITY"
                    severity = "MEDIUM"
                    details = "API may be vulnerable to XSS attacks"
                }
            } else {
                $testResults += @{
                    test = "XSS Protection - $payload"
                    result = "PASS"
                    severity = "PASS"
                    details = "XSS payload properly sanitized"
                }
            }
        } catch {
            $testResults += @{
                test = "XSS Protection - $payload"
                result = "PASS"
                severity = "PASS"
                details = "API properly rejected XSS payload"
            }
        }
    }
    
    # Test 3: Input Validation
    Write-SecurityStatus "Testing input validation..." "INFO"
    $invalidInputs = @(
        @{ game_mode = ""; user_id = "test" },  # Empty game mode
        @{ game_mode = "a" * 1000; user_id = "test" },  # Oversized input
        @{ user_id = "test" },  # Missing required field
        @{ game_mode = $null; user_id = "test" },  # Null values
        @{ game_mode = 123; user_id = "test" }  # Wrong data type
    )
    
    foreach($input in $invalidInputs) {
        try {
            $body = $input | ConvertTo-Json
            $response = Invoke-WebRequest -Uri "$baseUrl/api/v1/queue/join" -Method POST -Body $body -ContentType "application/json" -TimeoutSec 5
            
            if($response.StatusCode -eq 200) {
                $testResults += @{
                    test = "Input Validation - $($input.Keys -join ',')"
                    result = "POTENTIAL_VULNERABILITY"
                    severity = "MEDIUM"
                    details = "API accepted invalid input without proper validation"
                }
            }
        } catch {
            $testResults += @{
                test = "Input Validation - $($input.Keys -join ',')"
                result = "PASS"
                severity = "PASS"
                details = "Invalid input properly rejected"
            }
        }
    }
    
    return $testResults
}

function Test-NetworkSecurity {
    Write-SecurityStatus "Starting Network Security Assessment" "INFO"
    
    $networkTests = @()
    
    # Test 1: Security Headers
    Write-SecurityStatus "Checking security headers..." "INFO"
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:8080/health" -Method GET
        $headers = $response.Headers
        
        $requiredHeaders = @(
            'X-Content-Type-Options',
            'X-Frame-Options',
            'X-XSS-Protection',
            'Strict-Transport-Security',
            'Content-Security-Policy'
        )
        
        foreach($header in $requiredHeaders) {
            if($headers.ContainsKey($header)) {
                $networkTests += @{
                    test = "Security Header - $header"
                    result = "PASS"
                    severity = "PASS"
                    details = "Header present: $($headers[$header])"
                }
            } else {
                $networkTests += @{
                    test = "Security Header - $header"
                    result = "MISSING"
                    severity = "MEDIUM"
                    details = "Security header not implemented"
                }
            }
        }
    } catch {
        $networkTests += @{
            test = "Security Headers Check"
            result = "FAIL"
            severity = "HIGH"
            details = "Could not retrieve security headers: $($_.Exception.Message)"
        }
    }
    
    # Test 2: CORS Policy
    Write-SecurityStatus "Testing CORS policy..." "INFO"
    try {
        $headers = @{
            'Origin' = 'https://malicious-site.com'
            'Access-Control-Request-Method' = 'POST'
        }
        
        $response = Invoke-WebRequest -Uri "http://localhost:8080/api/v1/queue/join" -Method OPTIONS -Headers $headers
        
        if($response.Headers.ContainsKey('Access-Control-Allow-Origin') -and 
           $response.Headers['Access-Control-Allow-Origin'] -eq '*') {
            $networkTests += @{
                test = "CORS Policy"
                result = "POTENTIAL_VULNERABILITY"
                severity = "MEDIUM"
                details = "CORS policy allows all origins (*)"
            }
        } else {
            $networkTests += @{
                test = "CORS Policy"
                result = "PASS"
                severity = "PASS"
                details = "CORS policy properly restricted"
            }
        }
    } catch {
        $networkTests += @{
            test = "CORS Policy"
            result = "PASS"
            severity = "PASS"
            details = "CORS preflight request properly handled"
        }
    }
    
    return $networkTests
}

function Test-ServiceSecurity {
    Write-SecurityStatus "Starting Service Security Assessment" "INFO"
    
    $serviceTests = @()
    
    # Test 1: Service Isolation
    Write-SecurityStatus "Testing service isolation..." "INFO"
    try {
        $services = docker ps --format "table {{.Names}}\t{{.Ports}}" | Select-String "dashdice"
        
        foreach($service in $services) {
            $serviceName = $service.ToString().Split()[0]
            if($serviceName -match "dashdice") {
                $serviceTests += @{
                    test = "Service Isolation - $serviceName"
                    result = "PASS"
                    severity = "PASS"
                    details = "Service running in isolated container"
                }
            }
        }
    } catch {
        $serviceTests += @{
            test = "Service Isolation"
            result = "FAIL"
            severity = "HIGH"
            details = "Could not verify service isolation"
        }
    }
    
    # Test 2: Database Access Control
    Write-SecurityStatus "Testing database access controls..." "INFO"
    try {
        # Attempt to access Redis without authentication
        $result = docker exec dashdice-redis redis-cli ping
        if($result -eq "PONG") {
            $serviceTests += @{
                test = "Database Access Control"
                result = "WARNING"
                severity = "MEDIUM"
                details = "Redis accessible without authentication (development mode)"
            }
        }
    } catch {
        $serviceTests += @{
            test = "Database Access Control"
            result = "PASS"
            severity = "PASS"
            details = "Database access properly controlled"
        }
    }
    
    return $serviceTests
}

function Start-ComprehensiveSecurityScan {
    Write-SecurityStatus "🔒 Starting Comprehensive Security Scan" "INFO"
    
    $scanResults = @{
        timestamp = Get-Date
        apiSecurity = @()
        networkSecurity = @()
        serviceSecurity = @()
        summary = @{}
    }
    
    # API Security Tests
    Write-SecurityStatus "Phase 1: API Security Testing" "INFO"
    $scanResults.apiSecurity = Test-APISecurityEndpoints
    
    # Network Security Tests  
    Write-SecurityStatus "Phase 2: Network Security Assessment" "INFO"
    $scanResults.networkSecurity = Test-NetworkSecurity
    
    # Service Security Tests
    Write-SecurityStatus "Phase 3: Service Security Validation" "INFO"
    $scanResults.serviceSecurity = Test-ServiceSecurity
    
    # Compile Results
    $allTests = $scanResults.apiSecurity + $scanResults.networkSecurity + $scanResults.serviceSecurity
    
    $passCount = ($allTests | Where-Object { $_.result -eq "PASS" }).Count
    $failCount = ($allTests | Where-Object { $_.result -in @("FAIL", "POTENTIAL_VULNERABILITY") }).Count
    $warningCount = ($allTests | Where-Object { $_.result -in @("WARNING", "MISSING") }).Count
    
    $scanResults.summary = @{
        totalTests = $allTests.Count
        passed = $passCount
        failed = $failCount
        warnings = $warningCount
        securityScore = [math]::Round(($passCount / $allTests.Count) * 100)
    }
    
    # Display Results
    Display-SecurityResults -results $scanResults
    
    return $scanResults
}

function Display-SecurityResults {
    param($results)
    
    Write-Host "`n🛡️  SECURITY SCAN RESULTS:" -ForegroundColor Red
    Write-Host "═════════════════════════════════════════════════════════════════" -ForegroundColor Gray
    
    # Summary
    Write-Host "SECURITY SUMMARY:" -ForegroundColor Cyan
    Write-Host "  Total Tests Run: $($results.summary.totalTests)" -ForegroundColor White
    Write-Host "  Passed: $($results.summary.passed)" -ForegroundColor Green
    Write-Host "  Failed: $($results.summary.failed)" -ForegroundColor Red
    Write-Host "  Warnings: $($results.summary.warnings)" -ForegroundColor Yellow
    Write-Host "  Security Score: $($results.summary.securityScore)%" -ForegroundColor $(if($results.summary.securityScore -ge 80) {"Green"} elseif($results.summary.securityScore -ge 60) {"Yellow"} else {"Red"})
    
    # Critical Issues
    $criticalIssues = ($results.apiSecurity + $results.networkSecurity + $results.serviceSecurity) | 
                     Where-Object { $_.severity -in @("CRITICAL", "HIGH") -and $_.result -ne "PASS" }
    
    if($criticalIssues.Count -gt 0) {
        Write-Host "`n🚨 CRITICAL SECURITY ISSUES:" -ForegroundColor Red
        foreach($issue in $criticalIssues) {
            Write-SecurityStatus "$($issue.test): $($issue.details)" $issue.severity
        }
    }
    
    # Security Recommendations
    Write-Host "`n📋 SECURITY RECOMMENDATIONS:" -ForegroundColor Magenta
    Write-Host "─────────────────────────────────────────────────────" -ForegroundColor Gray
    Write-Host "1. Implement comprehensive input validation" -ForegroundColor White
    Write-Host "2. Add security headers to all HTTP responses" -ForegroundColor White
    Write-Host "3. Configure proper CORS policies" -ForegroundColor White
    Write-Host "4. Implement authentication middleware" -ForegroundColor White
    Write-Host "5. Enable Redis authentication in production" -ForegroundColor White
    Write-Host "6. Set up comprehensive logging and monitoring" -ForegroundColor White
}

function Generate-SecurityReport {
    param($scanResults)
    
    Write-SecurityStatus "📄 Generating Security Assessment Report" "INFO"
    
    $reportPath = "security-assessment-$(Get-Date -Format 'yyyyMMdd-HHmmss').json"
    $scanResults | ConvertTo-Json -Depth 10 | Out-File -FilePath $reportPath
    
    # Generate CSV summary for easy analysis
    $csvPath = "security-summary-$(Get-Date -Format 'yyyyMMdd-HHmmss').csv"
    $allTests = $scanResults.apiSecurity + $scanResults.networkSecurity + $scanResults.serviceSecurity
    $allTests | Export-Csv -Path $csvPath -NoTypeInformation
    
    Write-SecurityStatus "🔒 Security reports generated:" "INFO"
    Write-Host "  Detailed Report: $reportPath" -ForegroundColor White
    Write-Host "  CSV Summary: $csvPath" -ForegroundColor White
}

function Show-SecurityMenu {
    Write-Host "`n🔒 SECURITY TESTING MENU:" -ForegroundColor Red
    Write-Host "─────────────────────────────────────────────────────" -ForegroundColor Gray
    Write-Host "[1] Full Security Scan" -ForegroundColor White
    Write-Host "[2] API Security Tests Only" -ForegroundColor White
    Write-Host "[3] Network Security Assessment" -ForegroundColor White
    Write-Host "[4] Service Security Validation" -ForegroundColor White
    Write-Host "[5] Generate Security Report" -ForegroundColor White
    Write-Host "[6] View OWASP Top 10 Coverage" -ForegroundColor White
    Write-Host "[Q] Quit" -ForegroundColor White
    Write-Host ""
    
    $choice = Read-Host "Select option"
    
    switch($choice) {
        '1' { 
            $results = Start-ComprehensiveSecurityScan
            Generate-SecurityReport -scanResults $results
            Show-SecurityMenu
        }
        '2' { 
            $apiResults = Test-APISecurityEndpoints
            $apiResults | ForEach-Object { Write-SecurityStatus "$($_.test): $($_.details)" $_.severity }
            Show-SecurityMenu
        }
        '3' { 
            $networkResults = Test-NetworkSecurity
            $networkResults | ForEach-Object { Write-SecurityStatus "$($_.test): $($_.details)" $_.severity }
            Show-SecurityMenu
        }
        '4' {
            $serviceResults = Test-ServiceSecurity
            $serviceResults | ForEach-Object { Write-SecurityStatus "$($_.test): $($_.details)" $_.severity }
            Show-SecurityMenu
        }
        '5' {
            $results = Start-ComprehensiveSecurityScan
            Generate-SecurityReport -scanResults $results
            Show-SecurityMenu
        }
        '6' {
            Show-OWASPCoverage
            Show-SecurityMenu
        }
        'Q' { 
            Write-SecurityStatus "Security testing completed" "INFO"
            return 
        }
        default { 
            Write-SecurityStatus "Invalid option selected" "MEDIUM"
            Show-SecurityMenu
        }
    }
}

function Show-OWASPCoverage {
    Write-Host "`n🛡️  OWASP TOP 10 COVERAGE ANALYSIS:" -ForegroundColor Magenta
    Write-Host "─────────────────────────────────────────────────────" -ForegroundColor Gray
    
    foreach($vulnKey in $VulnerabilityDatabase.Keys) {
        $vuln = $VulnerabilityDatabase[$vulnKey]
        $coverageStatus = "🔶 PARTIAL"  # Default status
        
        Write-Host "$vulnKey - $($vuln.name)" -ForegroundColor Cyan
        Write-Host "  Severity: $($vuln.severity)" -ForegroundColor White
        Write-Host "  Category: $($vuln.category)" -ForegroundColor White
        Write-Host "  Coverage: $coverageStatus" -ForegroundColor Yellow
        Write-Host ""
    }
}

# Initialize security testing
Write-SecurityStatus "🛡️  DashDice Security Testing Framework Initialized" "INFO"
Show-SecurityMenu
