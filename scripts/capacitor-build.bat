@echo off
echo 🚀 Building DashDice for Capacitor...
echo 📱 Configuring for static export...

set CAPACITOR_BUILD=true

echo 🔧 Running Next.js build...
npm run build

echo ✅ Build complete! Output directory: out
echo 📋 Verifying build artifacts...

if exist "out" (
    echo ✅ Static files generated successfully
    echo 📁 Contents of out directory:
    dir out
) else (
    echo ❌ Error: out directory not found
    exit /b 1
)

echo 🎉 Capacitor build ready!
