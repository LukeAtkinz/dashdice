# DashDice Go Microservices

A robust, scalable microservices architecture for the DashDice gaming platform built with Go, featuring real-time matchmaking, game management, user presence tracking, and push notifications.

## 🏗️ Architecture Overview

This system consists of 5 core microservices that work together to provide a comprehensive gaming backend:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   API Gateway   │────│  Match Service  │────│  Queue Service  │
│     :8080       │    │      :8081      │    │      :8082      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │              ┌─────────────────┐    ┌─────────────────┐
         └──────────────│ Presence Service│────│Notification Svc │
                        │      :8083      │    │      :8084      │
                        └─────────────────┘    └─────────────────┘
```

## 🚀 Services

### 1. API Gateway (:8080)
- **Purpose**: Entry point for all client requests
- **Features**: 
  - Request routing and load balancing
  - Authentication and authorization
  - Rate limiting and request validation
  - CORS handling and middleware pipeline
  - Health checks and service discovery

### 2. Match Service (:8081)
- **Purpose**: Core game logic and match management
- **Features**:
  - Match creation and lifecycle management
  - Multi-game mode support (Classic, Blitz, Tournament, Custom)
  - Real-time game state synchronization
  - Turn-based game logic with automatic progression
  - Match statistics and analytics

### 3. Queue Service (:8082)
- **Purpose**: Intelligent matchmaking and player queuing
- **Features**:
  - ELO-based skill matching algorithms
  - Multi-queue support with priority handling
  - Advanced matchmaking with quality scoring
  - Queue statistics and analytics
  - Timeout and retry mechanisms

### 4. Presence Service (:8083)
- **Purpose**: Real-time user presence and WebSocket management
- **Features**:
  - WebSocket connection management with rooms
  - User presence tracking (online, offline, in-game)
  - Real-time message broadcasting
  - Connection lifecycle management
  - Presence analytics and statistics

### 5. Notification Service (:8084)
- **Purpose**: Multi-channel notification delivery
- **Features**:
  - Push notifications (FCM, APNS, WebPush)
  - Email notifications with templates
  - In-app notification management
  - Bulk and broadcast messaging
  - Delivery tracking and analytics

## 🛠️ Technology Stack

- **Language**: Go 1.21+
- **Web Framework**: Gin
- **Databases**: 
  - Redis (caching, real-time data)
  - PostgreSQL (analytics, statistics)
  - Firebase Firestore (primary database)
  - Firebase Realtime Database (real-time features)
- **Monitoring**: 
  - Prometheus (metrics)
  - Grafana (dashboards)
  - Jaeger (distributed tracing)
- **Infrastructure**: Docker, Docker Compose

## 📋 Prerequisites

- Go 1.21 or higher
- Docker and Docker Compose
- Firebase project with service account key
- Redis server
- PostgreSQL database (optional, included in Docker Compose)

## 🚀 Quick Start

### 1. Clone and Setup
```bash
git clone <repository-url>
cd dashdice/go-services

# Copy environment configuration
cp .env.example .env

# Edit .env with your configuration
nano .env
```

### 2. Firebase Setup
```bash
# Place your Firebase service account key
cp /path/to/your/serviceAccountKey.json ./serviceAccountKey.json
```

### 3. Start Services with Docker Compose
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Check service health
curl http://localhost:8080/health
```

### 4. Development Mode
```bash
# Start individual services for development
cd api-gateway && go run main.go &
cd match-service && go run main.go engine.go &
cd queue-service && go run main.go matchmaker.go &
cd presence-service && go run main.go websocket.go presence.go &
cd notification-service && go run main.go engine.go &
```

## 📡 API Documentation

### API Gateway Endpoints
```
GET    /health                    # Health check
GET    /ready                     # Readiness check
POST   /api/v1/auth/login         # User authentication
GET    /api/v1/users/profile      # User profile
```

### Match Service Endpoints
```
POST   /api/v1/matches            # Create match
GET    /api/v1/matches/:id        # Get match details
POST   /api/v1/matches/:id/join   # Join match
POST   /api/v1/matches/:id/action # Perform game action
DELETE /api/v1/matches/:id        # End match
```

### Queue Service Endpoints
```
POST   /api/v1/queue/join         # Join matchmaking queue
DELETE /api/v1/queue/leave        # Leave queue
GET    /api/v1/queue/status       # Get queue status
GET    /api/v1/queue/stats        # Queue statistics
```

### Presence Service Endpoints
```
GET    /api/v1/presence/:user_id  # Get user presence
PUT    /api/v1/presence           # Update presence
GET    /api/v1/presence/online    # Get online users
WS     /ws                        # WebSocket connection
```

### Notification Service Endpoints
```
POST   /api/v1/notifications/send      # Send notification
POST   /api/v1/notifications/bulk     # Bulk notifications
POST   /api/v1/notifications/broadcast # Broadcast notification
GET    /api/v1/users/:id/notifications # Get user notifications
```

## 🔧 Configuration

### Environment Variables
Key configuration options in `.env`:

```bash
# Core Configuration
ENVIRONMENT=development
LOG_LEVEL=debug
POSTGRES_PASSWORD=your_password
REDIS_URL=redis://localhost:6379

# Firebase
FIREBASE_CREDENTIALS_PATH=./serviceAccountKey.json
FIREBASE_PROJECT_ID=your-project-id

# Push Notifications
FCM_SERVER_KEY=your_fcm_key
APNS_KEY_ID=your_apns_key
VAPID_PUBLIC_KEY=your_vapid_key
```

### Service Configuration
Each service can be configured via environment variables or configuration files. See `.env.example` for all available options.

## 📊 Monitoring

### Health Checks
All services expose health check endpoints:
```bash
curl http://localhost:8080/health  # API Gateway
curl http://localhost:8081/health  # Match Service
curl http://localhost:8082/health  # Queue Service
curl http://localhost:8083/health  # Presence Service
curl http://localhost:8084/health  # Notification Service
```

### Metrics and Monitoring
- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3000 (admin:admin123)
- **Jaeger**: http://localhost:16686
- **Redis Insight**: http://localhost:8001

### Load Balancer Stats
- **HAProxy**: http://localhost:8404/stats

## 🧪 Testing

### Unit Tests
```bash
# Run tests for all services
make test

# Run tests for specific service
cd match-service && go test ./...
```

### Integration Tests
```bash
# Start test environment
docker-compose -f docker-compose.test.yml up -d

# Run integration tests
make test-integration
```

### Load Testing
```bash
# Install artillery
npm install -g artillery

# Run load tests
artillery run load-tests/matchmaking.yml
```

## 🚀 Deployment

### Docker Production
```bash
# Build production images
make build-production

# Deploy with production compose
docker-compose -f docker-compose.prod.yml up -d
```

### Kubernetes
```bash
# Apply Kubernetes manifests
kubectl apply -f k8s/

# Check deployment status
kubectl get pods -n dashdice
```

## 🔒 Security

### Authentication
- JWT-based authentication
- Service-to-service API keys
- Firebase Auth integration

### Authorization
- Role-based access control (RBAC)
- Resource-level permissions
- Admin endpoint protection

### Data Protection
- Input validation and sanitization
- SQL injection prevention
- Rate limiting and DDoS protection
- CORS configuration

## 📈 Performance

### Optimization Features
- Connection pooling for databases
- Redis caching for frequently accessed data
- Efficient WebSocket connection management
- Background job processing
- Request/response compression

### Scaling Recommendations
- Horizontal scaling of services
- Database read replicas
- CDN for static assets
- Load balancing across instances

## 🐛 Troubleshooting

### Common Issues

1. **Service won't start**
   ```bash
   # Check logs
   docker-compose logs service-name
   
   # Verify configuration
   docker-compose config
   ```

2. **Database connection issues**
   ```bash
   # Test database connectivity
   docker-compose exec postgres psql -U dashdice -d dashdice -c "SELECT 1"
   ```

3. **Redis connection issues**
   ```bash
   # Test Redis connectivity
   docker-compose exec redis redis-cli ping
   ```

4. **Firebase authentication issues**
   - Verify service account key is correctly placed
   - Check Firebase project permissions
   - Validate environment variables

### Debugging
```bash
# Enable debug logging
export LOG_LEVEL=debug

# Enable profiling
export ENABLE_PPROF=true

# View performance profiles
go tool pprof http://localhost:6060/debug/pprof/profile
```

## 📝 Development

### Adding New Endpoints
1. Define the endpoint in the appropriate service
2. Add request/response models
3. Implement the handler function
4. Add middleware as needed
5. Update API documentation

### Adding New Services
1. Create service directory structure
2. Implement main.go with HTTP server
3. Add business logic handlers
4. Configure database connections
5. Add to Docker Compose
6. Update API Gateway routing

### Database Migrations
```bash
# Create migration
migrate create -ext sql -dir migrations -seq add_new_table

# Run migrations
migrate -database "postgres://user:pass@host/db" -path migrations up
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

### Code Style
- Follow Go conventions and best practices
- Use `gofmt` for code formatting
- Add comprehensive tests for new features
- Update documentation for API changes

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Support

- **Documentation**: [Wiki](link-to-wiki)
- **Issues**: [GitHub Issues](link-to-issues)
- **Discussions**: [GitHub Discussions](link-to-discussions)
- **Email**: support@yourcompany.com

## 🗺️ Roadmap

- [ ] Add GraphQL API support
- [ ] Implement service mesh (Istio)
- [ ] Add more game modes
- [ ] Voice/video chat integration
- [ ] Mobile SDK development
- [ ] Advanced analytics dashboard

---

Built with ❤️ by the DashDice team
