#!/bin/bash

# Ionic Capacitor Build Script
# This sets the environment variable for static export and runs the build

echo "🚀 Building DashDice for Capacitor..."
echo "📱 Configuring for static export..."

export CAPACITOR_BUILD=true

echo "🔧 Running Next.js build..."
npm run build

echo "✅ Build complete! Output directory: out"
echo "📋 Verifying build artifacts..."

if [ -d "out" ]; then
    echo "✅ Static files generated successfully"
    echo "📁 Contents of out directory:"
    ls -la out/ | head -10
else
    echo "❌ Error: out directory not found"
    exit 1
fi

echo "🎉 Capacitor build ready!"
