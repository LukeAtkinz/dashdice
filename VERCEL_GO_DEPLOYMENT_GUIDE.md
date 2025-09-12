# 🚀 Vercel Go Backend Deployment Guide

## Overview

This guide will help you deploy the Go backend as serverless functions on Vercel, eliminating the need for VPS management while providing a reliable production API.

## Prerequisites

1. **Vercel CLI installed**:
   ```bash
   npm install -g vercel
   ```

2. **Vercel account** and logged in:
   ```bash
   vercel login
   ```

## Deployment Steps

### 1. Deploy Go Backend to Vercel

Navigate to the api-backend directory and deploy:

```bash
cd api-backend
vercel --prod
```

Vercel will:
- Build each Go file as a serverless function
- Configure routing based on `vercel.json`
- Provide you with a deployment URL (e.g., `https://dashdice-api-backend.vercel.app`)

### 2. Update Environment Variables

In your main Next.js project, set the `GO_BACKEND_URL` environment variable:

```bash
# In your main project root
vercel env add GO_BACKEND_URL production
# Enter your Vercel Go backend URL when prompted
```

### 3. Redeploy Frontend

Deploy your updated frontend:

```bash
vercel --prod
```

## Configuration Details

### API Endpoints Available

- ✅ `GET /health` - Health check
- ✅ `GET /api/v1/matches` - Get active matches
- ✅ `POST /api/v1/queue/join` - Join matchmaking queue
- ✅ `POST /api/v1/queue/leave` - Leave matchmaking queue  
- ✅ `GET /api/v1/queue/status` - Get queue status

### CORS Configuration

All endpoints include proper CORS headers:
- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS`
- `Access-Control-Allow-Headers: Content-Type, Authorization`

### Automatic Fallback

The frontend is configured to:
1. Try Go backend first (via proxy)
2. Fall back to Firebase if Go backend is unavailable
3. Log all backend switching for debugging

## Testing Your Deployment

1. **Test health endpoint**:
   ```bash
   curl https://your-deployment.vercel.app/health
   ```

2. **Test through proxy**:
   ```bash
   curl https://www.dashdice.gg/api/proxy/matches
   ```

3. **Check logs**:
   - Browser console will show "✅ Go backend is available"
   - No more "User marked offline" spam (fixed heartbeat timing)

## Benefits of This Approach

- ✅ **No VPS management** - Vercel handles scaling and uptime
- ✅ **Global CDN** - Fast response times worldwide
- ✅ **Automatic HTTPS** - SSL certificates managed by Vercel
- ✅ **Built-in monitoring** - Function logs and metrics
- ✅ **Firebase fallback** - Zero downtime during deployments
- ✅ **Cost effective** - Pay only for function execution time

## Troubleshooting

### If deployment fails:
1. Check `go.mod` is present and valid
2. Ensure all Go files export a `Handler` function
3. Verify `vercel.json` syntax

### If backend is unavailable:
1. Check Vercel function logs
2. Verify environment variables are set
3. Test health endpoint directly

### If CORS errors persist:
1. Confirm `GO_BACKEND_URL` is set correctly
2. Check proxy routes are working
3. Verify Vercel headers configuration

## Next Steps

Once deployed successfully:
1. Monitor function performance in Vercel dashboard
2. Set up alerts for function failures
3. Consider upgrading to Vercel Pro for better performance limits

Your Go backend will now be running as serverless functions on Vercel! 🎉
