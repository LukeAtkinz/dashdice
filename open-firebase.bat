@echo off
echo 🚀 Opening Firebase Console for Bot Import...
echo.
echo 📋 Steps to import bots:
echo 1. Create collection: bot_profiles
echo 2. Add document: Use bot UID as document ID
echo 3. Import JSON: Copy from firebase-import folder
echo.
echo 🎯 Quick test: Import just 1 bot to start!
echo.
pause
start https://console.firebase.google.com/project/dashdice-d1b86/firestore/data
