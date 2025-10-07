# 🚀 DashDice Production Deployment Script (PowerShell)
# This script deploys from staging (development branch) to production (main branch)

Write-Host "🎲 DashDice Production Deployment Starting..." -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# Check if we're on development branch
$currentBranch = git branch --show-current
if ($currentBranch -ne "development") {
    Write-Host "❌ Error: You must be on the 'development' branch to deploy to production" -ForegroundColor Red
    Write-Host "Current branch: $currentBranch" -ForegroundColor Yellow
    Write-Host "Run: git checkout development" -ForegroundColor Blue
    exit 1
}

# Check for uncommitted changes
$gitStatus = git status --porcelain
if ($gitStatus) {
    Write-Host "❌ Error: You have uncommitted changes" -ForegroundColor Red
    Write-Host "Commit your changes first: git add . && git commit -m 'Your message'" -ForegroundColor Blue
    exit 1
}

# Pull latest changes from development
Write-Host "📥 Pulling latest changes from development..." -ForegroundColor Blue
git pull origin development

# Switch to main branch
Write-Host "🔀 Switching to main branch..." -ForegroundColor Blue
git checkout main

# Pull latest main
git pull origin main

# Merge development into main
Write-Host "🔄 Merging development into main..." -ForegroundColor Blue
git merge development
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Merge successful" -ForegroundColor Green
} else {
    Write-Host "❌ Merge failed - resolve conflicts manually" -ForegroundColor Red
    exit 1
}

# Push to production
Write-Host "🚀 Deploying to production..." -ForegroundColor Blue
git push origin main
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Production deployment initiated!" -ForegroundColor Green
    Write-Host ""
    Write-Host "🎯 Deployment Status:" -ForegroundColor Cyan
    Write-Host "📍 Vercel: Will auto-deploy to https://dashdice.gg"
    Write-Host "🚂 Railway: Will auto-deploy backend services"  
    Write-Host "🔥 Firebase: Manual deployment required (see README)"
    Write-Host ""
    Write-Host "⏱️  Deployment typically takes 2-5 minutes" -ForegroundColor Yellow
    Write-Host "🔗 Monitor: https://vercel.com/lukeAtkinz/dashdice" -ForegroundColor Blue
} else {
    Write-Host "❌ Push to production failed" -ForegroundColor Red
    exit 1
}

# Switch back to development
Write-Host "🔄 Switching back to development branch..." -ForegroundColor Blue
git checkout development

Write-Host ""
Write-Host "🎉 Production deployment complete!" -ForegroundColor Green
Write-Host "🔗 Live at: https://dashdice.gg" -ForegroundColor Blue
Write-Host ""