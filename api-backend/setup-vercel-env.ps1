# Vercel Environment Setup Script for Windows PowerShell
# Run this after deploying to Vercel to set up environment variables

Write-Host "🚀 Setting up Vercel environment variables..." -ForegroundColor Green

# Set the GO_BACKEND_URL to point to the Vercel deployment
# Replace 'your-project-name' with your actual Vercel project name
$VERCEL_PROJECT_NAME = "dashdice-api-backend"

Write-Host "Setting GO_BACKEND_URL environment variable..." -ForegroundColor Yellow

# Note: You'll need to run this interactively or update with your actual deployment URL
Write-Host "Run this command with your actual Vercel deployment URL:" -ForegroundColor Cyan
Write-Host "vercel env add GO_BACKEND_URL production" -ForegroundColor White
Write-Host "Enter: https://$VERCEL_PROJECT_NAME.vercel.app" -ForegroundColor White

Write-Host ""
Write-Host "✅ Setup script ready!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Deploy your Go backend: cd api-backend; vercel --prod" -ForegroundColor White
Write-Host "2. Get your deployment URL from Vercel" -ForegroundColor White
Write-Host "3. Update GO_BACKEND_URL with your actual deployment URL" -ForegroundColor White
Write-Host "4. Redeploy your Next.js app: vercel --prod" -ForegroundColor White
Write-Host ""
Write-Host "Your Go backend will be available at: https://$VERCEL_PROJECT_NAME.vercel.app" -ForegroundColor Green
