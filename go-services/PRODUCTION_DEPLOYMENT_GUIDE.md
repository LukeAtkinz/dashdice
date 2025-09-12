# 🚀 DashDice Go Services - Railway Production Deployment Guide

## Overview
This guide covers the **current working setup** using Railway for Go backend deployment and Vercel for frontend hosting.

## ✅ Current Architecture (Working)

### **Frontend**: Vercel
- **URL**: `https://www.dashdice.gg`
- **Technology**: Next.js 14 with App Router
- **Deployment**: `npx vercel --prod`

### **Backend**: Railway
- **URL**: `https://dashdice-production.up.railway.app`
- **Technology**: Go services with Docker
- **Deployment**: `railway up`

### **Database/Auth**: Firebase (Fallback)
- **Purpose**: User data, authentication, fallback system
- **Status**: Automatic fallback when Go backend unavailable

## 🚀 Quick Deployment Commands

### **Deploy Go Backend to Railway:**
```bash
cd go-services
railway up
```

### **Deploy Frontend to Vercel:**
```bash
npx vercel --prod
```

### **Verify Deployment:**
```bash
# Test Railway backend directly
curl https://dashdice-production.up.railway.app/health

# Test through Vercel proxy
curl https://www.dashdice.gg/api/proxy/matches

# Test match creation
curl -X POST https://www.dashdice.gg/api/proxy/matches \
  -H "Content-Type: application/json" \
  -d '{"gameMode":"quickfire","userId":"test"}'
```

## 📋 Prerequisites

### 1. Required Tools
- **Railway CLI**: `npm install -g @railway/cli`
- **Vercel CLI**: `npm install -g vercel`
- **Docker Desktop**: Required for Railway builds
- **Node.js**: For frontend development

### 2. Environment Setup
- **Railway Project**: Connected to `respectful-alignment`
- **Vercel Environment**: `GO_BACKEND_URL=https://dashdice-production.up.railway.app`
- **Firebase Config**: Already configured for fallback

## ⚙️ Current Configuration

### **Railway Backend**
- **Docker Build**: Multi-stage Dockerfile (`golang:1.21-alpine → alpine:latest`)
- **Port**: 8080 (auto-configured by Railway)
- **Environment**: Production-ready Go HTTP server
- **CORS**: Configured for cross-origin requests

### **Vercel Frontend** 
- **Environment Variables**:
  ```
  GO_BACKEND_URL=https://dashdice-production.up.railway.app
  ```
- **Proxy Routes**: `/api/proxy/*` → Railway backend
- **Fallback**: Automatic Firebase failover

### **API Endpoints Working**
```
✅ GET  /health                    - Health check
✅ GET  /api/v1/matches           - Get matches  
✅ POST /api/v1/matches           - Create match
✅ POST /api/v1/queue/join        - Join queue
✅ POST /api/v1/queue/leave       - Leave queue
✅ GET  /api/v1/queue/status      - Queue status
```

## 🔄 Deployment Workflow

### **When you run these commands:**

1. **`railway up`** (in `/go-services`)
   - Builds Docker image using `Dockerfile`
   - Deploys to Railway infrastructure  
   - Updates `https://dashdice-production.up.railway.app`

2. **`npx vercel --prod`** (in root directory)
   - Builds Next.js application
   - Deploys to Vercel edge network
   - Updates `https://www.dashdice.gg`
   - Uses `GO_BACKEND_URL` to connect to Railway

## ✅ **Result**: Go Services Handle Matchmaking

When both are deployed:
- ✅ **Users visit**: `https://www.dashdice.gg` (Vercel)
- ✅ **API calls route to**: Railway Go backend via proxy
- ✅ **Matchmaking powered by**: Go services on Railway  
- ✅ **Firebase used for**: Authentication, user data, fallback only

## 📊 Monitoring & Maintenance

### **Railway Monitoring**
```bash
# Check deployment status
railway status

# View logs
railway logs

# Check service health
curl https://dashdice-production.up.railway.app/health
```

### **Vercel Monitoring**  
```bash
# Check deployment
npx vercel inspect --prod

# View function logs
npx vercel logs
```

### **System Health Checks**
```bash
# Test full pipeline
curl https://www.dashdice.gg/api/proxy/health

# Test match creation
curl -X POST https://www.dashdice.gg/api/proxy/matches \
  -H "Content-Type: application/json" \
  -d '{"gameMode":"quickfire"}'
```

## 🔧 Troubleshooting

### **Railway Issues**
```bash
# Check build logs
railway logs --follow

# Restart service  
railway up --force

# Check environment variables
railway variables
```

### **Vercel Issues**
```bash
# Check environment variables
npx vercel env ls

# Redeploy
npx vercel --prod --force

# Check function logs
npx vercel logs --follow
```

### **API Connection Issues**
1. **Test Railway directly**: `curl https://dashdice-production.up.railway.app/health`
2. **Test Vercel proxy**: `curl https://www.dashdice.gg/api/proxy/matches`  
3. **Check environment**: Ensure `GO_BACKEND_URL` is set correctly

---

## ✅ **SUCCESS SUMMARY**

Your DashDice application is now running with:

### **🌐 Production URLs**
- **User Access**: `https://www.dashdice.gg` (Vercel)
- **API Backend**: `https://dashdice-production.up.railway.app` (Railway)

### **🚀 Deployment Commands**
```bash
# Update Go backend
cd go-services && railway up

# Update frontend  
npx vercel --prod
```

### **🔄 System Architecture**
```
Users → Vercel (Frontend) → Railway (Go Backend) → Firebase (Fallback)
```

### **🎮 Matchmaking Status**
✅ **Go Services Active**: Match creation, queue management, game logic  
✅ **Firebase Fallback**: Authentication, user data, emergency backup  
✅ **Zero Downtime**: Automatic failover ensures reliability  

**Your system is now fully operational with Go services handling matchmaking!** 🎉
