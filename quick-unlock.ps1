# Quick unlock Hero1 abilities in production
$body = @{
    username = "Hero1"
    secret = "unlock-abilities-admin-2025"
} | ConvertTo-Json

Invoke-RestMethod -Uri "https://dashdice.gg/api/admin/unlock-abilities" -Method POST -Body $body -ContentType "application/json"