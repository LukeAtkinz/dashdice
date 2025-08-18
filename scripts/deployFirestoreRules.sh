#!/bin/bash

# Deploy Firestore Rules Script
# This script deploys the updated Firestore security rules

echo "🔒 Deploying updated Firestore security rules..."
echo ""

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI not found. Please install it first:"
    echo "npm install -g firebase-tools"
    exit 1
fi

# Check if user is logged in
if ! firebase projects:list &> /dev/null; then
    echo "🔐 Please log in to Firebase first:"
    echo "firebase login"
    exit 1
fi

echo "📋 Current Firestore rules will be updated with:"
echo "  ✅ Achievement collections (achievementDefinitions, userAchievements, achievementProgress)"
echo "  ✅ Achievement notifications and metrics collections"
echo "  ✅ Friend request and friends collections"
echo "  ✅ Daily/hourly metrics for achievement tracking"
echo ""

# Deploy the rules
echo "🚀 Deploying rules..."
firebase deploy --only firestore:rules

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Firestore rules deployed successfully!"
    echo ""
    echo "🎯 This should fix the following issues:"
    echo "  • Achievement initialization permission errors"
    echo "  • Friend request reception problems"
    echo "  • Achievement progress tracking"
    echo ""
    echo "🔄 Please refresh your app to see the changes take effect."
else
    echo ""
    echo "❌ Failed to deploy Firestore rules."
    echo "Please check your Firebase project configuration and try again."
    exit 1
fi
