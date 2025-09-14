#!/usr/bin/env powershell
# Mobile App Build Script - Handles API route exclusions for static export

Write-Host "🔧 Preparing DashDice for mobile app build..." -ForegroundColor Green

# Temporarily rename API routes that can't be statically exported
$apiRoutes = @(
    "src/app/api/debug",
    "src/app/api/auth/verify", 
    "src/app/api/game",
    "src/app/api/health",
    "src/app/api/matchmaking",
    "src/app/api/moderate-image",
    "src/app/api/proxy",
    "src/app/api/websocket",
    "src/app/api/game-modes"
)

Write-Host "📋 Temporarily excluding API routes for static export..." -ForegroundColor Cyan

foreach ($route in $apiRoutes) {
    if (Test-Path $route) {
        $tempName = "$route.temp"
        if (Test-Path $tempName) {
            Remove-Item $tempName -Recurse -Force
        }
        Move-Item $route $tempName
        Write-Host "  ✓ Excluded: $route" -ForegroundColor Yellow
    }
}

Write-Host "📦 Building static export..." -ForegroundColor Cyan
npm run build

$buildSuccess = $LASTEXITCODE -eq 0

Write-Host "📋 Restoring API routes..." -ForegroundColor Cyan

foreach ($route in $apiRoutes) {
    $tempName = "$route.temp"
    if (Test-Path $tempName) {
        if (Test-Path $route) {
            Remove-Item $route -Recurse -Force
        }
        Move-Item $tempName $route
        Write-Host "  ✓ Restored: $route" -ForegroundColor Green
    }
}

if ($buildSuccess) {
    if (Test-Path "out/index.html") {
        Write-Host "✅ Mobile build successful!" -ForegroundColor Green
        Write-Host "📁 Static files generated in 'out' directory" -ForegroundColor Green
        
        # Copy essential files for mobile
        Copy-Item "public/manifest.json" "out/manifest.json" -Force
        Copy-Item "public/styles" "out/styles" -Recurse -Force
        
        Write-Host "📱 Ready for Capacitor!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Next steps:" -ForegroundColor Yellow
        Write-Host "  npx cap add ios" -ForegroundColor White
        Write-Host "  npx cap add android" -ForegroundColor White
        Write-Host "  npx cap sync" -ForegroundColor White
    } else {
        Write-Host "❌ Build failed - no index.html found" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "❌ Build failed" -ForegroundColor Red
    exit 1
}
