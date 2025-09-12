# DashDice Go Services Integration - Complete Setup Guide

## 🎯 Integration Overview

The DashDice platform now supports both **Firebase-based** and **Go microservices** backends with seamless switching and hybrid operation. This integration provides:

- **Enhanced Performance**: Go services for high-performance matchmaking and real-time operations
- **Scalability**: Microservices architecture for better resource management
- **Reliability**: Automatic fallback to Firebase when Go services are unavailable
- **Real-time Updates**: WebSocket connections for live game updates

## 🔧 Setup Instructions

### 1. Start Go Services

Use the management script to start all Go microservices:

```powershell
# Navigate to project root
cd "c:\Users\david\Documents\dashdice"

# Run the Go services manager
.\go-services-manager.ps1 -Action setup    # Initial setup
.\go-services-manager.ps1 -Action start    # Start services
.\go-services-manager.ps1 -Action status   # Check status
```

### 2. Verify Services are Running

The following services should be available:

- **API Gateway**: `http://localhost:8080`
- **Match Service**: `http://localhost:8081`
- **Queue Service**: `http://localhost:8082`
- **Presence Service**: `http://localhost:8083`
- **Notification Service**: `http://localhost:8084`
- **Redis**: `localhost:6379`
- **PostgreSQL**: `localhost:5432`

### 3. Start Frontend with Integration

```bash
# In the main project directory
npm run dev
```

The frontend will automatically detect and connect to Go services. If services are unavailable, it will fallback to Firebase-only mode.

## 🧪 Testing the Integration

### Integration Test Component

A comprehensive test component is available at `/src/components/test/GoServicesIntegrationTest.tsx`. This component:

1. **Health Check**: Tests if Go services are responding
2. **Authentication**: Verifies Firebase token with Go services
3. **User Profile**: Fetches user data from Go services
4. **Queue Service**: Tests matchmaking queue functionality
5. **WebSocket**: Establishes real-time connection

### Manual Testing

1. **Log into the app** with your Firebase account
2. **Navigate to Settings** or add the test component to any page
3. **Run the integration test** to verify all services are working
4. **Check the browser console** for detailed logs

## 🔄 How the Integration Works

### Authentication Flow
```
Frontend → Firebase Auth → ID Token → Go Services → Firebase Admin SDK → Verification
```

### Matchmaking Flow
```
1. User joins queue
2. Frontend checks Go services availability
3. If available: Uses Go queue service with WebSocket updates
4. If unavailable: Falls back to Firebase realtime database
5. Match found: Returns match details to frontend
```

### API Client Architecture
```typescript
// New API client automatically handles:
- Firebase Auth token caching and refresh
- Request authentication headers
- Error handling and retries
- WebSocket connection management
```

## 📁 Key Integration Files

### Backend (Go Services)
- `go-services/shared/middleware/firebase_auth.go` - Firebase auth middleware
- `go-services/shared/models/user.go` - User context model
- `go-services/api-gateway/main.go` - Updated with Firebase integration

### Frontend (Next.js)
- `src/services/apiClientNew.ts` - Go services API client
- `src/services/enhancedMatchmakingService.ts` - Hybrid matchmaking service
- `src/components/test/GoServicesIntegrationTest.tsx` - Integration test component

### Configuration
- `go-services/.env` - Go services environment variables
- `.env.local` - Frontend environment variables
- `go-services-manager.ps1` - Service management script

## 🔍 Environment Variables

### Frontend (.env.local)
```bash
# Go Services Integration
NEXT_PUBLIC_API_GATEWAY_URL=http://localhost:8080/api/v1
NEXT_PUBLIC_WEBSOCKET_URL=ws://localhost:8080/api/v1/realtime/ws
API_GATEWAY_URL=http://localhost:8080
QUEUE_SERVICE_URL=http://localhost:8082
WEBSOCKET_PORT=8085

# Firebase (existing)
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
# ... other Firebase config
```

### Go Services (go-services/.env)
```bash
# Firebase Integration
FIREBASE_CREDENTIALS_PATH=./serviceAccountKey.json
FIREBASE_PROJECT_ID=dashdice-d1b86
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@dashdice-d1b86.iam.gserviceaccount.com

# Service URLs
API_GATEWAY_URL=http://api-gateway:8080
MATCH_SERVICE_URL=http://match-service:8081
QUEUE_SERVICE_URL=http://queue-service:8082
# ... other services
```

## 🚀 Using the Integration

### In Components
```typescript
import DashDiceAPI from '@/services/apiClientNew';
import EnhancedMatchmakingService from '@/services/enhancedMatchmakingService';

// Check service health
const isHealthy = await DashDiceAPI.healthCheck();

// Join matchmaking queue (auto-routes to best service)
const queueId = await EnhancedMatchmakingService.joinQueue({
  gameMode: 'quickfire',
  preferredMode: 'hybrid', // 'firebase', 'goservices', or 'hybrid'
  skillLevel: 1200
});

// Create WebSocket connection
const ws = await DashDiceAPI.createWebSocketConnection();
```

### Automatic Fallback
```typescript
// The system automatically handles service availability:
// 1. Tries Go services first (if preferredMode allows)
// 2. Falls back to Firebase if Go services unavailable
// 3. Provides consistent API regardless of backend
```

## 🛠 Troubleshooting

### Common Issues

1. **Go services not starting**: 
   - Check Docker Desktop is running
   - Verify `serviceAccountKey.json` exists in `go-services/`
   - Check ports 8080-8084 are available

2. **Authentication failing**:
   - Ensure Firebase credentials are correct in both `.env` files
   - Check that the user is logged into the frontend
   - Verify Firebase project ID matches in all configs

3. **WebSocket connection issues**:
   - Check if port 8080 is accessible
   - Verify API Gateway is running and healthy
   - Look for CORS issues in browser console

### Debugging Commands

```powershell
# Check service logs
.\go-services-manager.ps1 -Action logs

# Check service health
curl http://localhost:8080/health

# Test API Gateway directly
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:8080/api/v1/users/me
```

## 📊 Monitoring and Logs

### Go Services Logs
```powershell
# View live logs from all services
.\go-services-manager.ps1 -Action logs
```

### Frontend Integration Logs
- Open browser DevTools → Console
- Look for messages prefixed with:
  - `🔗 API Request:` - API calls to Go services
  - `✅ API Response:` - Successful responses
  - `❌ API Error:` - Error responses
  - `🔌 WebSocket:` - WebSocket events

## 🎮 What's Next

With the integration complete, you can now:

1. **Scale up Go services** using Docker Swarm or Kubernetes
2. **Add more microservices** for specific game features
3. **Implement advanced matchmaking** with ELO ratings and skill-based matching
4. **Add real-time features** using WebSocket connections
5. **Monitor performance** with the built-in health checks and metrics

The integration provides a solid foundation for expanding DashDice into a high-performance, scalable gaming platform! 🎲
