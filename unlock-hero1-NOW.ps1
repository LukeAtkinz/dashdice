# Unlock Hero1 Abilities in Production
# Run this to immediately unlock all abilities for testing

Write-Host "🚀 Unlocking Hero1 abilities in production..." -ForegroundColor Green

$body = @{
    username = "Hero1"
    secret = "unlock-abilities-admin-2025"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "https://dashdice.gg/api/admin/unlock-abilities" -Method POST -Body $body -ContentType "application/json"
    
    Write-Host "✅ SUCCESS!" -ForegroundColor Green
    Write-Host "Hero1 now has access to all abilities in production!" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "🎮 Go test immediately at: https://dashdice.gg" -ForegroundColor Yellow
    Write-Host "👤 Login as Hero1 to see:" -ForegroundColor Yellow
    Write-Host "  • All 16 abilities unlocked" -ForegroundColor White
    Write-Host "  • Level 50 progression" -ForegroundColor White
    Write-Host "  • Ultimate loadout created" -ForegroundColor White
    Write-Host "  • Full matchmaking with abilities" -ForegroundColor White
    Write-Host ""
    Write-Host "📊 Response Details:" -ForegroundColor Magenta
    $response | ConvertTo-Json -Depth 3
    
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