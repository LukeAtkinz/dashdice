# PowerShell script to unlock all abilities for Hero1 in production
Write-Host "🚀 Unlocking all abilities for Hero1 in production..." -ForegroundColor Green

$body = @{
    username = "Hero1"
    secret = "unlock-abilities-admin-2025"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "https://dashdice.gg/api/admin/unlock-abilities" -Method POST -Body $body -ContentType "application/json"
    
    Write-Host "✅ Success!" -ForegroundColor Green
    Write-Host "Response:" -ForegroundColor Yellow
    $response | ConvertTo-Json -Depth 3
    
    Write-Host ""
    Write-Host "🎮 Now you can test abilities in production at: https://dashdice.gg" -ForegroundColor Cyan
    Write-Host "👤 Login as Hero1 to see all unlocked abilities in matches!" -ForegroundColor Cyan
    
} catch {
    Write-Host "❌ Error unlocking abilities:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $errorResponse = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($errorResponse)
        $errorBody = $reader.ReadToEnd()
        Write-Host "Error details: $errorBody" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Press any key to continue..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")