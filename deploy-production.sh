#!/bin/bash

# 🚀 DashDice Production Deployment Script
# This script deploys from staging (development branch) to production (main branch)

echo "🎲 DashDice Production Deployment Starting..."
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if we're on development branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "development" ]; then
    echo -e "${RED}❌ Error: You must be on the 'development' branch to deploy to production${NC}"
    echo -e "${YELLOW}Current branch: $CURRENT_BRANCH${NC}"
    echo -e "${BLUE}Run: git checkout development${NC}"
    exit 1
fi

# Check for uncommitted changes
if ! git diff-index --quiet HEAD --; then
    echo -e "${RED}❌ Error: You have uncommitted changes${NC}"
    echo -e "${BLUE}Commit your changes first: git add . && git commit -m 'Your message'${NC}"
    exit 1
fi

# Pull latest changes from development
echo -e "${BLUE}📥 Pulling latest changes from development...${NC}"
git pull origin development

# Switch to main branch
echo -e "${BLUE}🔀 Switching to main branch...${NC}"
git checkout main

# Pull latest main
git pull origin main

# Merge development into main
echo -e "${BLUE}🔄 Merging development into main...${NC}"
if git merge development; then
    echo -e "${GREEN}✅ Merge successful${NC}"
else
    echo -e "${RED}❌ Merge failed - resolve conflicts manually${NC}"
    exit 1
fi

# Push to production
echo -e "${BLUE}🚀 Deploying to production...${NC}"
if git push origin main; then
    echo -e "${GREEN}✅ Production deployment initiated!${NC}"
    echo ""
    echo "🎯 Deployment Status:"
    echo "📍 Vercel: Will auto-deploy to https://dashdice.gg"
    echo "🚂 Railway: Will auto-deploy backend services"
    echo "🔥 Firebase: Manual deployment required (see README)"
    echo ""
    echo -e "${YELLOW}⏱️  Deployment typically takes 2-5 minutes${NC}"
    echo -e "${BLUE}🔗 Monitor: https://vercel.com/lukeAtkinz/dashdice${NC}"
else
    echo -e "${RED}❌ Push to production failed${NC}"
    exit 1
fi

# Switch back to development
echo -e "${BLUE}🔄 Switching back to development branch...${NC}"
git checkout development

echo ""
echo -e "${GREEN}🎉 Production deployment complete!${NC}"
echo -e "${BLUE}🔗 Live at: https://dashdice.gg${NC}"
echo ""