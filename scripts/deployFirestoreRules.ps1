# Deploy Firestore Rules PowerShell Script
# This script deploys the updated Firestore security rules

Write-Host "🔒 Deploying updated Firestore security rules..." -ForegroundColor Cyan
Write-Host ""

# Check if Firebase CLI is installed
try {
    firebase --version | Out-Null
} catch {
    Write-Host "❌ Firebase CLI not found. Please install it first:" -ForegroundColor Red
    Write-Host "npm install -g firebase-tools" -ForegroundColor Yellow
    exit 1
}

# Check if user is logged in
try {
    firebase projects:list | Out-Null
} catch {
    Write-Host "🔐 Please log in to Firebase first:" -ForegroundColor Red
    Write-Host "firebase login" -ForegroundColor Yellow
    exit 1
}

Write-Host "📋 Current Firestore rules will be updated with:" -ForegroundColor Green
Write-Host "  ✅ Achievement collections (achievementDefinitions, userAchievements, achievementProgress)" -ForegroundColor Green
Write-Host "  ✅ Achievement notifications and metrics collections" -ForegroundColor Green
Write-Host "  ✅ Friend request and friends collections" -ForegroundColor Green
Write-Host "  ✅ Daily/hourly metrics for achievement tracking" -ForegroundColor Green
Write-Host ""

# Deploy the rules
Write-Host "🚀 Deploying rules..." -ForegroundColor Cyan
firebase deploy --only firestore:rules

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Firestore rules deployed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "🎯 This should fix the following issues:" -ForegroundColor Green
    Write-Host "  • Achievement initialization permission errors" -ForegroundColor Green
    Write-Host "  • Friend request reception problems" -ForegroundColor Green
    Write-Host "  • Achievement progress tracking" -ForegroundColor Green
    Write-Host ""
    Write-Host "🔄 Please refresh your app to see the changes take effect." -ForegroundColor Yellow
} else {
    Write-Host ""
    Write-Host "❌ Failed to deploy Firestore rules." -ForegroundColor Red
    Write-Host "Please check your Firebase project configuration and try again." -ForegroundColor Yellow
    exit 1
}
