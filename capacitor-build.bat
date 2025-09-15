@echo off
REM Windows batch script for Capacitor builds
echo Building DashDice for Capacitor (mobile)...

REM Set environment variable for static export
set CAPACITOR_BUILD=true

REM Run Next.js build with static export
call npm run build

REM Sync with Capacitor
call npx cap sync

echo ✅ Capacitor build complete! Files ready in 'out' directory.
echo 📱 You can now run: npx cap open ios or npx cap open android
