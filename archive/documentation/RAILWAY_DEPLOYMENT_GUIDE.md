# 🚀 Railway Go Backend Deployment Guide

## Why Railway?

Railway is perfect for Go microservices because it:
- ✅ **Native Go support** - No serverless function limitations
- ✅ **Zero configuration** - Just connect your GitHub and deploy
- ✅ **Managed infrastructure** - No VPS management needed
- ✅ **Automatic HTTPS** - Custom domains with SSL
- ✅ **Environment variables** - Easy configuration management
- ✅ **Real-time logs** - Built-in monitoring and debugging

## Quick Deployment Steps

### 1. Set Up Railway Account
1. Go to [railway.app](https://railway.app)
2. Sign in with your GitHub account
3. Connect your `dashdice` repository

### 2. Create Railway Project
```bash
# Install Railway CLI (optional)
npm install -g @railway/cli

# Or use the web interface
```

### 3. Deploy Go Backend
1. In Railway dashboard, click "New Project"
2. Select "Deploy from GitHub repo"
3. Choose your `dashdice` repository
4. Set root directory to `api-backend`
5. Railway will auto-detect Go and deploy

### 4. Configure Environment Variables
Set these in Railway dashboard:
- `PORT=8080` (Railway provides this automatically)
- `GO_BACKEND_URL=https://your-railway-app.railway.app`

### 5. Update Frontend
In your main Vercel project, set:
```bash
vercel env add GO_BACKEND_URL production
# Enter: https://your-railway-app.railway.app
```

## Configuration Files

### Create railway.json (optional)
```json
{
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "go run ."
  }
}
```

### Create Dockerfile (optional)
```dockerfile
FROM golang:1.21-alpine AS builder
WORKDIR /app
COPY go.* ./
RUN go mod download
COPY . .
RUN go build -o main .

FROM alpine:latest
RUN apk --no-cache add ca-certificates
WORKDIR /root/
COPY --from=builder /app/main .
EXPOSE 8080
CMD ["./main"]
```

## Benefits vs Vercel Functions

| Feature | Railway | Vercel Functions |
|---------|---------|------------------|
| Go Support | ✅ Native | ⚠️ Limited |
| WebSockets | ✅ Full Support | ❌ No Support |
| Long Running | ✅ Always On | ❌ 10s Timeout |
| Database | ✅ Built-in PostgreSQL | ⚠️ External Only |
| Pricing | ✅ $5/month flat | ⚠️ Per-execution |
| Debugging | ✅ Real-time logs | ⚠️ Limited |

## Next Steps

1. **Deploy on Railway** (5 minutes)
2. **Get your Railway URL** (e.g., `https://dashdice-api-production.up.railway.app`)
3. **Update GO_BACKEND_URL** in your Vercel frontend
4. **Test the integration** - Your proxy will automatically switch to Railway

Railway handles all the infrastructure complexity while giving you the full power of Go microservices! 🚂
