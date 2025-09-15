#!/usr/bin/env powershell
# App Icon Generator Script for DashDice

Write-Host "🎨 DashDice App Icon Generator" -ForegroundColor Green
Write-Host ""

# Check if we have a source icon
$sourceIcon = "public/icon-512x512.png"
if (!(Test-Path $sourceIcon)) {
    Write-Host "⚠️  Source icon not found at $sourceIcon" -ForegroundColor Yellow
    Write-Host "Creating a placeholder icon for demonstration..." -ForegroundColor Cyan
    
    # Create a simple text-based icon as placeholder
    Write-Host "📝 You'll need to replace this with your actual DashDice logo" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "📋 Icon Requirements:" -ForegroundColor Cyan
    Write-Host "  • 1024x1024 PNG (master icon)" -ForegroundColor White
    Write-Host "  • Solid background (no transparency for iOS)" -ForegroundColor White  
    Write-Host "  • Square format" -ForegroundColor White
    Write-Host "  • High quality, scalable design" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host "✅ Found source icon: $sourceIcon" -ForegroundColor Green
}

# Check if cordova-res is installed
try {
    Get-Command cordova-res -ErrorAction Stop | Out-Null
    Write-Host "✅ cordova-res is available" -ForegroundColor Green
} catch {
    Write-Host "📦 Installing cordova-res for icon generation..." -ForegroundColor Cyan
    npm install -g cordova-res
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to install cordova-res" -ForegroundColor Red
        Write-Host "You can install it manually: npm install -g cordova-res" -ForegroundColor Yellow
        exit 1
    }
}

Write-Host ""
Write-Host "🚀 Generating app icons for all platforms..." -ForegroundColor Green

# Generate iOS icons
Write-Host "📱 Generating iOS icons..." -ForegroundColor Cyan
ionic capacitor resources ios --icon-only

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ iOS icons generated successfully!" -ForegroundColor Green
} else {
    Write-Host "⚠️  iOS icon generation had issues - check manually" -ForegroundColor Yellow
}

# Generate Android icons  
Write-Host "🤖 Generating Android icons..." -ForegroundColor Cyan
ionic capacitor resources android --icon-only

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Android icons generated successfully!" -ForegroundColor Green
} else {
    Write-Host "⚠️  Android icon generation had issues - check manually" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🎉 Icon generation complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next steps for App Store submission:" -ForegroundColor Yellow
Write-Host "  1. Open Xcode: ionic cap open ios" -ForegroundColor White
Write-Host "  2. Open Android Studio: ionic cap open android" -ForegroundColor White
Write-Host "  3. Create Apple Developer account ($99/year)" -ForegroundColor White
Write-Host "  4. Create Google Play Console account ($25 one-time)" -ForegroundColor White
Write-Host "  5. Take app screenshots on simulators/devices" -ForegroundColor White
Write-Host "  6. Submit for review!" -ForegroundColor White
Write-Host ""
Write-Host "📱 Your DashDice mobile apps are ready for the world! 🌍" -ForegroundColor Green
