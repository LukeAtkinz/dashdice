@echo off
REM Firebase Index Deployment Script for Windows
echo 🔥 Deploying Firebase Firestore indexes...

REM Check if Firebase CLI is installed
firebase --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Firebase CLI not found. Installing...
    npm install -g firebase-tools
)

REM Deploy indexes
echo 📊 Deploying Firestore indexes...
firebase deploy --only firestore:indexes

REM Deploy security rules
echo 🔒 Deploying Firestore security rules...
firebase deploy --only firestore:rules

echo ✅ Firebase deployment complete!
echo.
echo 🎯 Index URLs for manual creation:
echo 1. Friend Requests: https://console.firebase.google.com/v1/r/project/dashdice-d1b86/firestore/indexes?create_composite=ClVwcm9qZWN0cy9kYXNoZGljZS1kMWI4Ni9kYXRhYmFzZXMvKGRlZmF1bHQpL2NvbGxlY3Rpb25Hcm91cHMvZnJpZW5kUmVxdWVzdHMvaW5kZXhlcy9fEAEaCgoGc3RhdHVzEAEaDAoIdG9Vc2VySWQQARoNCgljcmVhdGVkQXQQAhoMCghfX25hbWVfXxAC
echo 2. Game Invitations: https://console.firebase.google.com/v1/r/project/dashdice-d1b86/firestore/indexes?create_composite=ClZwcm9qZWN0cy9kYXNoZGljZS1kMWI4Ni9kYXRhYmFzZXMvKGRlZmF1bHQpL2NvbGxlY3Rpb25Hcm91cHMvZ2FtZUludml0YXRpb25zL2luZGV4ZXMvXxABGgoKBnN0YXR1cxABGgwKCHRvVXNlcklkEAEaDQoJY3JlYXRlZEF0EAIaDAoIX19uYW1lX18QAg
echo 3. Achievement Definitions: https://console.firebase.google.com/v1/r/project/dashdice-d1b86/firestore/indexes?create_composite=Cl1wcm9qZWN0cy9kYXNoZGljZS1kMWI4Ni9kYXRhYmFzZXMvKGRlZmF1bHQpL2NvbGxlY3Rpb25Hcm91cHMvYWNoaWV2ZW1lbnREZWZpbml0aW9ucy9pbmRleGVzL18QARoMCghpc0FjdGl2ZRABGgwKCGNhdGVnb3J5EAEaCQoFb3JkZXIQARoMCghfX25hbWVfXhAB
echo 4. User Achievements: https://console.firebase.google.com/v1/r/project/dashdice-d1b86/firestore/indexes?create_composite=Cldwcm9qZWN0cy9kYXNoZGljZS1kMWI4Ni9kYXRhYmFzZXMvKGRlZmF1bHQpL2NvbGxlY3Rpb25Hcm91cHMvdXNlckFjaGlldmVtZW50cy9pbmRleGVzL18QARoKCgZ1c2VySWQQARoPCgtjb21wbGV0ZWRBdBACGgwKCF9fbmFtZV9fEAI
echo.
echo 📱 Visit these URLs in your browser to create indexes manually if CLI deployment fails.
pause
