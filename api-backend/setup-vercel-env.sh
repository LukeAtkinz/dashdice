#!/bin/bash

# Vercel Environment Setup Script
# Run this after deploying to Vercel to set up environment variables

echo "🚀 Setting up Vercel environment variables..."

# Set the GO_BACKEND_URL to point to the Vercel deployment
# Replace 'your-project-name' with your actual Vercel project name
VERCEL_PROJECT_NAME="dashdice-api-backend"

echo "Setting GO_BACKEND_URL environment variable..."
vercel env add GO_BACKEND_URL production <<< "https://$VERCEL_PROJECT_NAME.vercel.app"

echo "✅ Environment variables configured!"
echo ""
echo "Next steps:"
echo "1. Deploy your Go backend: cd api-backend && vercel --prod"
echo "2. Get your deployment URL from Vercel"
echo "3. Update GO_BACKEND_URL with your actual deployment URL:"
echo "   vercel env add GO_BACKEND_URL production"
echo "4. Redeploy your Next.js app: vercel --prod"
echo ""
echo "Your Go backend will be available at: https://$VERCEL_PROJECT_NAME.vercel.app"
