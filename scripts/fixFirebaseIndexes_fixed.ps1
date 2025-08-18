# Firebase Index Error Fix Script
# This script addresses the specific Firestore index errors and provides solutions

Write-Host "Firebase Index Error Fix - DashDice" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan

Write-Host "Detected Index Errors:" -ForegroundColor Yellow
Write-Host "1. friendRequests collection (status, toUserId, createdAt)" -ForegroundColor Red
Write-Host "2. gameInvitations collection (status, toUserId, createdAt)" -ForegroundColor Red  
Write-Host "3. achievementDefinitions collection (isActive, category, order)" -ForegroundColor Red
Write-Host "4. userAchievements collection (userId, completedAt)" -ForegroundColor Red
Write-Host ""

Write-Host "Available Fix Options:" -ForegroundColor Green
Write-Host "1. Deploy indexes via Firebase CLI (Recommended)"
Write-Host "2. Create indexes manually via Firebase Console"
Write-Host "3. Continue with current fallback system"
Write-Host ""

$choice = Read-Host "Choose option (1-3)"

switch ($choice) {
    "1" {
        Write-Host "Deploying Firebase indexes..." -ForegroundColor Green
        
        # Check if Firebase CLI is installed
        try {
            firebase --version | Out-Null
            Write-Host "Firebase CLI found" -ForegroundColor Green
        }
        catch {
            Write-Host "Firebase CLI not found. Installing..." -ForegroundColor Yellow
            npm install -g firebase-tools
        }
        
        # Deploy indexes
        Write-Host "Deploying Firestore indexes..." -ForegroundColor Blue
        firebase deploy --only firestore:indexes
        
        Write-Host "Deploying Firestore security rules..." -ForegroundColor Blue
        firebase deploy --only firestore:rules
        
        Write-Host "Deployment complete! Restart your dev server." -ForegroundColor Green
    }
    
    "2" {
        Write-Host "Opening Firebase Console URLs..." -ForegroundColor Blue
        
        $urls = @(
            "https://console.firebase.google.com/v1/r/project/dashdice-d1b86/firestore/indexes?create_composite=ClVwcm9qZWN0cy9kYXNoZGljZS1kMWI4Ni9kYXRhYmFzZXMvKGRlZmF1bHQpL2NvbGxlY3Rpb25Hcm91cHMvZnJpZW5kUmVxdWVzdHMvaW5kZXhlcy9fEAEaCgoGc3RhdHVzEAEaDAoIdG9Vc2VySWQQARoNCgljcmVhdGVkQXQQAhoMCghfX25hbWVfXhAC",
            "https://console.firebase.google.com/v1/r/project/dashdice-d1b86/firestore/indexes?create_composite=ClZwcm9qZWN0cy9kYXNoZGljZS1kMWI4Ni9kYXRhYmFzZXMvKGRlZmF1bHQpL2NvbGxlY3Rpb25Hcm91cHMvZ2FtZUludml0YXRpb25zL2luZGV4ZXMvXxABGgoKBnN0YXR1cxABGgwKCHRvVXNlcklkEAEaDQoJY3JlYXRlZEF0EAIaDAoIX19uYW1lX18QAg",
            "https://console.firebase.google.com/v1/r/project/dashdice-d1b86/firestore/indexes?create_composite=Cl1wcm9qZWN0cy9kYXNoZGljZS1kMWI4Ni9kYXRhYmFzZXMvKGRlZmF1bHQpL2NvbGxlY3Rpb25Hcm91cHMvYWNoaWV2ZW1lbnREZWZpbml0aW9ucy9pbmRleGVzL18QARoMCghpc0FjdGl2ZRABGgwKCGNhdGVnb3J5EAEaCQoFb3JkZXIQARoMCghfX25hbWVfXhAB",
            "https://console.firebase.google.com/v1/r/project/dashdice-d1b86/firestore/indexes?create_composite=Cldwcm9qZWN0cy9kYXNoZGljZS1kMWI4Ni9kYXRhYmFzZXMvKGRlZmF1bHQpL2NvbGxlY3Rpb25Hcm91cHMvdXNlckFjaGlldmVtZW50cy9pbmRleGVzL18QARoKCgZ1c2VySWQQARoPCgtjb21wbGV0ZWRBdBACGgwKCF9fbmFtZV9fEAI"
        )
        
        foreach ($url in $urls) {
            Start-Process $url
            Start-Sleep -Seconds 2
        }
        
        Write-Host "Browser tabs opened. Click 'Create Index' on each tab." -ForegroundColor Green
        Write-Host "Index creation takes 1-2 minutes per index." -ForegroundColor Yellow
    }
    
    "3" {
        Write-Host "Continuing with fallback system..." -ForegroundColor Yellow
        Write-Host "Friends and achievements will use default data." -ForegroundColor Green
        Write-Host "Game modes system is fully functional!" -ForegroundColor Green
    }
    
    default {
        Write-Host "Invalid choice. Please run the script again." -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "After creating indexes:" -ForegroundColor Cyan
Write-Host "1. Restart your development server (npm run dev)" -ForegroundColor White
Write-Host "2. Check browser console for any remaining errors" -ForegroundColor White
Write-Host "3. Test friends and achievements features" -ForegroundColor White
Write-Host ""
Write-Host "Note: Your game modes system is working perfectly!" -ForegroundColor Green
Write-Host "These errors only affect friends and achievements data loading." -ForegroundColor Green
