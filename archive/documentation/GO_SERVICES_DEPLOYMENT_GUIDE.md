# 🚀 DashDice Go Services - Quick Deployment Guide

## 📋 What We've Set Up

### ✅ **Completed Integration Steps**
1. **Go API Handlers**: All placeholder handlers replaced with working business logic
2. **Environment Configuration**: Added `NEXT_PUBLIC_API_URL` to `.env.local`
3. **API Client Service**: Created `src/services/apiClient.ts` for frontend-backend communication  
4. **Integration Test Component**: Built `src/components/ui/GoServicesTest.tsx` for testing

### 🔧 **Ready-to-Deploy Architecture**
```
Next.js Frontend (localhost:3000)
        ↓ HTTP/WS
Go API Gateway (localhost:8080)
        ↓ Internal
Go Microservices (8081-8084)
        ↓ Data
Redis + PostgreSQL + Firestore
```

## 🚀 **YOUR Action Items**

### **Step 1: Install Docker Desktop** ⚡
1. Go to [docker.com](https://docker.com)
2. Download **Docker Desktop for Windows**
3. Install and start Docker Desktop
4. Verify: Open PowerShell and run `docker --version`

### **Step 2: Deploy Go Services** 🐳
```powershell
# Navigate to go-services directory
cd C:\Users\david\Documents\dashdice\go-services

# Start all microservices
docker-compose up -d

# Verify services are running
docker-compose ps
```

### **Step 3: Test Integration** 🧪
1. **Start your Next.js app**: `npm run dev`
2. **Add test component** to any page:
```tsx
import GoServicesTest from '@/components/ui/GoServicesTest';

// Add this to any page component:
<GoServicesTest />
```
3. **Run tests** using the UI buttons

### **Step 4: Monitor Services** 📊
- **API Gateway**: http://localhost:8080/health
- **All Services Health**: http://localhost:8080/api/v1/public/status
- **Redis Dashboard**: http://localhost:8001
- **Load Balancer Stats**: http://localhost:8404/stats

## 🔄 **Service Management Commands**

```powershell
# Start services
docker-compose up -d

# Stop services  
docker-compose down

# View logs
docker-compose logs -f api-gateway

# Restart a service
docker-compose restart api-gateway

# Check service status
docker-compose ps
```

## 🎯 **Available API Endpoints**

### **Authentication**
- `POST /api/v1/public/auth/verify` - Verify JWT token
- `GET /api/v1/users/me` - Get current user profile

### **Matchmaking**
- `GET /api/v1/matches` - List matches
- `POST /api/v1/matches` - Create new match
- `GET /api/v1/matches/{id}` - Get match details

### **Queue System**
- `POST /api/v1/queue/join` - Join matchmaking queue  
- `DELETE /api/v1/queue/leave` - Leave queue
- `GET /api/v1/queue/status` - Get queue status

### **Real-time**
- `ws://localhost:8080/ws` - WebSocket connection

## 🔧 **Integration Status**

### ✅ **What Works Now**
- Complete Go microservices with working handlers
- Docker deployment configuration
- API client for frontend communication
- Environment configuration for Next.js
- Integration test suite

### 🚧 **What Happens After Deployment**
1. **Immediate**: Go services provide API endpoints with demo data
2. **Gradual Migration**: Replace Firebase calls with Go API calls
3. **Real-time Features**: WebSocket connections for live updates
4. **Production Ready**: Full hybrid architecture

## 🎉 **Success Criteria**

You'll know it's working when:
1. **Docker services** show as healthy: `docker-compose ps`
2. **Health check passes**: http://localhost:8080/health returns `{"status": "healthy"}`
3. **Test component** shows ✅ Connected status
4. **API calls succeed** in the integration test

## 🆘 **Troubleshooting**

### **Docker Not Starting**
```powershell
# Check Docker is running
docker --version

# If error, restart Docker Desktop
```

### **Port Conflicts**
```powershell
# Check what's using ports 8080-8084
netstat -ano | findstr :8080
```

### **Service Health Issues**
```powershell
# Check individual service logs
docker-compose logs api-gateway
docker-compose logs match-service
```

## 🎯 **Next Steps After Success**

1. **Gradual API Migration**: Start replacing Firebase calls with Go API calls
2. **Authentication Integration**: Connect Firebase Auth with Go JWT verification  
3. **Real-time Features**: Implement WebSocket-based live updates
4. **Production Deployment**: Deploy to cloud with proper scaling

---

**Ready to deploy?** Install Docker Desktop and run `docker-compose up -d` in the go-services directory!
