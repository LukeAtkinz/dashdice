#!/bin/bash

# Railway deployment script that uses clean package.json
echo "🚂 Preparing Railway deployment..."

# Backup original package.json
cp package.json package.json.backup

# Use Railway-specific package.json (without Expo dependencies)
cp package.railway.json package.json

echo "✅ Using clean package.json for Railway deployment"
echo "📦 Installing dependencies with --legacy-peer-deps..."

# Install with legacy peer deps
npm install --legacy-peer-deps

echo "🏗️ Building application..."
npm run build

echo "🚀 Starting application..."
npm start