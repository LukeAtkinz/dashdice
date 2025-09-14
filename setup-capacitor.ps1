#!/usr/bin/env powershell
# Capacitor Setup Script for DashDice Mobile App

Write-Host "🚀 Setting up Capacitor for DashDice Native Apps" -ForegroundColor Green
Write-Host "This will add iOS and Android app generation capability" -ForegroundColor Yellow
Write-Host ""

# Check if we're in the right directory
if (!(Test-Path "package.json")) {
    Write-Host "❌ Error: Must be run from DashDice root directory" -ForegroundColor Red
    exit 1
}

# Step 1: Install Capacitor packages
Write-Host "📦 Installing Capacitor packages..." -ForegroundColor Cyan
npm install @capacitor/core @capacitor/cli
npm install @capacitor/ios @capacitor/android
npm install @capacitor/status-bar @capacitor/splash-screen
npm install @capacitor/haptics @capacitor/share

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error installing Capacitor packages" -ForegroundColor Red
    exit 1
}

# Step 2: Initialize Capacitor
Write-Host "🔧 Initializing Capacitor..." -ForegroundColor Cyan
npx cap init "DashDice" "com.dashdice.app"

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error initializing Capacitor" -ForegroundColor Red
    exit 1
}

# Step 3: Build web assets
Write-Host "🏗️ Building web assets..." -ForegroundColor Cyan
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error building web assets" -ForegroundColor Red
    exit 1
}

# Step 4: Add platforms
Write-Host "📱 Adding iOS platform..." -ForegroundColor Cyan
npx cap add ios

Write-Host "🤖 Adding Android platform..." -ForegroundColor Cyan
npx cap add android

# Step 5: Sync assets
Write-Host "🔄 Syncing web assets to native projects..." -ForegroundColor Cyan
npx cap sync

Write-Host ""
Write-Host "✅ Capacitor setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next steps:" -ForegroundColor Yellow
Write-Host "  1. Test iOS app: npx cap run ios" -ForegroundColor White
Write-Host "  2. Test Android app: npx cap run android" -ForegroundColor White
Write-Host "  3. Open in Xcode: npx cap open ios" -ForegroundColor White
Write-Host "  4. Open in Android Studio: npx cap open android" -ForegroundColor White
Write-Host ""
Write-Host "📱 Your DashDice mobile apps are ready for development!" -ForegroundColor Green
