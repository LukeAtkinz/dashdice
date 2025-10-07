# 🚀 DashDice Deployment Guide

## 📋 Quick Deployment Checklist

### **Staging to Production Deployment** 

#### ✅ **Pre-Deployment Checklist**
- [ ] All features tested thoroughly on staging
- [ ] No critical bugs or errors in console  
- [ ] Database migrations tested (if any)
- [ ] All environment variables verified
- [ ] Team approval for production release

#### 🚀 **Single Command Production Deployment**
```bash
# Windows (PowerShell)
npm run deploy:production

# macOS/Linux (Bash)  
npm run deploy:production:bash
```

#### 📍 **What This Command Does**
1. ✅ Verifies you're on `development` branch
2. ✅ Checks for uncommitted changes
3. ✅ Pulls latest development changes
4. ✅ Switches to `main` branch
5. ✅ Merges `development` into `main`
6. ✅ Pushes to production (triggers auto-deployment)
7. ✅ Returns you to `development` branch

---

## 🌐 **Environment URLs**

| Environment | URL | Branch | Purpose |
|-------------|-----|--------|---------|
| **Local Dev** | `http://localhost:3000` | `development` | Development |
| **Staging** | `https://dashdice-git-development.vercel.app` | `development` | Testing |
| **Production** | `https://dashdice.gg` | `main` | Live users |

---

## 🔄 **Development Workflow**

### **Daily Development**
```bash
# Work on development branch
git checkout development

# Start local development
npm run dev

# Make changes, commit regularly
git add .
git commit -m "Add new feature"
git push origin development
```

### **Feature Development**
```bash
# Create feature branch from development
git checkout development
git checkout -b feature/new-game-mode

# Develop feature
npm run dev

# Push feature branch (creates preview URL)
git push origin feature/new-game-mode
# Preview at: https://dashdice-git-feature-new-game-mode.vercel.app

# Merge back to development when ready
git checkout development  
git merge feature/new-game-mode
git push origin development
```

### **Testing on Staging**
```bash
# Push to development triggers staging deployment
git push origin development

# Test on staging URL:
# https://dashdice-git-development.vercel.app
```

### **Production Release**
```bash
# After thorough testing on staging
npm run deploy:production
```

---

## 🚨 **Rollback Procedure**

If production has issues:

```bash
# Quick rollback to previous version
git checkout main
git revert HEAD
git push origin main

# Or rollback to specific commit
git reset --hard <previous-commit-hash>
git push --force origin main
```

---

## 🔧 **Manual Deployment Steps** 

If automated script fails:

```bash
# 1. Switch to development and pull latest
git checkout development
git pull origin development

# 2. Switch to main and merge
git checkout main  
git pull origin main
git merge development

# 3. Push to production
git push origin main

# 4. Return to development
git checkout development
```

---

## 🎯 **Deployment Status Monitoring**

After deployment, monitor:

- **Vercel Dashboard**: https://vercel.com/lukeAtkinz/dashdice
- **Railway Dashboard**: https://railway.app/dashboard  
- **Firebase Console**: https://console.firebase.google.com/
- **Live Site**: https://dashdice.gg

---

## ⚡ **Quick Commands Reference**

```bash
# Development
npm run dev                    # Start local development
npm run dev:staging           # Start with staging config

# Deployment  
npm run deploy:production     # Deploy to production (Windows)
npm run deploy:production:bash # Deploy to production (Mac/Linux)

# Building
npm run build                 # Production build
npm run build:staging         # Staging build
```

---

## 🆘 **Emergency Contacts**

If deployment fails:
1. Check Vercel dashboard for build errors
2. Check Railway dashboard for backend issues  
3. Verify environment variables in platforms
4. Contact team for database/Firebase issues

---

## 📝 **Notes**

- **Staging** automatically deploys from `development` branch
- **Production** automatically deploys from `main` branch  
- **Railway** auto-deploys backend services from both branches
- **Firebase** requires manual deployment for rules/functions
- All deployments trigger within 2-5 minutes of git push