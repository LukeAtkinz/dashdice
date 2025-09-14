#!/usr/bin/env powershell
# Build script for Capacitor mobile apps

Write-Host "🔧 Building DashDice for mobile apps..." -ForegroundColor Green

# Set environment variable for Capacitor build
$env:CAPACITOR_BUILD = "true"

# Build with export configuration
Write-Host "📦 Building Next.js for static export..." -ForegroundColor Cyan
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed" -ForegroundColor Red
    exit 1
}

# Check if out directory exists and has index.html
if (Test-Path "out/index.html") {
    Write-Host "✅ Static export successful - index.html found" -ForegroundColor Green
} else {
    Write-Host "❌ Static export failed - no index.html found" -ForegroundColor Red
    exit 1
}

Write-Host "🎉 Mobile app build complete!" -ForegroundColor Green
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  npx cap add ios" -ForegroundColor White
Write-Host "  npx cap add android" -ForegroundColor White
Write-Host "  npx cap sync" -ForegroundColor White
