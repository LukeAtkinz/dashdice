# Unlock Hero1 abilities on local development server
$body = @{
    username = "Hero1"
    secret = "unlock-abilities-admin-2025"
} | ConvertTo-Json

Write-Host "🚀 Unlocking Hero1 abilities locally..." -ForegroundColor Green
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/admin/unlock-abilities" -Method POST -Body $body -ContentType "application/json"
    Write-Host "✅ SUCCESS! Hero1 abilities unlocked locally!" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 3
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}