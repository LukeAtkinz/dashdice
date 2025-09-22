# DashDice Matchmaking System - Complete Documentation

## 🎯 Executive Summary

DashDice is a comprehensive real-time matchmaking system built with modern microservices architecture, featuring instant WebSocket communication, scalable Go services, Firebase authentication, Redis caching, and production-ready monitoring. The system is fully integrated with Vercel for serverless deployment and includes advanced CI/CD pipelines for seamless updates.

## 🏗️ System Architecture

### Core Components
- **Frontend**: Next.js 14 with TypeScript, deployed on Vercel
- **Backend**: 5 Go microservices (API Gateway, Match, Queue, Presence, Notification)
- **Real-time**: WebSocket server for instant player communication
- **Database**: Redis for caching, PostgreSQL for persistence
- **Authentication**: Firebase Admin SDK with JWT validation
- **Monitoring**: Prometheus, Grafana, ELK Stack, Jaeger tracing

### Service Architecture
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Vercel App    │    │   WebSocket      │    │   Load Balancer │
│   (Frontend)    │◄──►│   Server         │◄──►│   (HAProxy)     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                        │                        │
         ▼                        ▼                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                     API Gateway (Port 8080)                     │
└─────────────────────────────────────────────────────────────────┘
         │
    ┌────┼─────┬─────────────┬─────────────┬─────────────┐
    ▼    ▼     ▼             ▼             ▼             ▼
┌───────┐ ┌────────┐ ┌─────────────┐ ┌────────────┐ ┌────────────────┐
│ Match │ │ Queue  │ │  Presence   │ │    Redis   │ │  Notification  │
│ 8081  │ │  8082  │ │    8083     │ │    6379    │ │      8084      │
└───────┘ └────────┘ └─────────────┘ └────────────┘ └────────────────┘
```

## 🚀 Quick Start Guide

### Prerequisites
- Docker & Docker Compose
- Node.js 18+
- Go 1.21+
- Firebase project with service account
- Git

### 1. Clone and Setup
```bash
git clone https://github.com/your-username/dashdice.git
cd dashdice

# Copy environment template
cp .env.example .env.local

# Install dependencies
npm install
```

### 2. Configure Environment
Edit `.env.local` with your configurations:
```bash
# Firebase Configuration
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_KEY\n-----END PRIVATE KEY-----"
FIREBASE_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com

# Database URLs
REDIS_URL=redis://localhost:6379
API_GATEWAY_URL=http://localhost:8080
WEBSOCKET_PORT=8085
```

### 3. Start All Services
```bash
# Start backend services
cd go-services && docker-compose up -d

# Start monitoring (optional)
cd ../monitoring && docker-compose -f docker-compose.monitoring.yml up -d

# Start frontend
cd .. && npm run dev
```

### 4. Verify Installation
```bash
# Run comprehensive integration tests
powershell -File integration-check-simple.ps1

# Test WebSocket functionality
powershell -File test-websocket.ps1

# Load test the system
powershell -File advanced-load-testing.ps1
```

## 📋 Deployment Guides

### Vercel Deployment

#### Prerequisites
- Vercel account and CLI installed
- Environment variables configured in Vercel dashboard

#### Automatic Deployment (Recommended)
```bash
# Push to main branch triggers automatic deployment via GitHub Actions
git push origin main
```

#### Manual Deployment
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy to staging
npm run deploy:staging

# Deploy to production
npm run deploy:production
```

#### Environment Variables Setup
In Vercel Dashboard → Project → Settings → Environment Variables:

**Production:**
- `api_url` = `https://api.dashdice.com`
- `websocket_url` = `wss://ws.dashdice.com`
- `redis_url` = `redis://production-redis:6379`
- `firebase_project_id` = `dashdice-production`
- `firebase_private_key` = `-----BEGIN PRIVATE KEY-----...`
- `firebase_client_email` = `firebase-adminsdk-...@project.iam.gserviceaccount.com`

### Docker Production Deployment

#### Using Docker Compose
```bash
# Production deployment
cd go-services
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# With monitoring
cd ../monitoring
docker-compose -f docker-compose.monitoring.yml up -d
```

#### Kubernetes Deployment
```bash
# Apply Kubernetes manifests
kubectl apply -f k8s-manifests/namespace.yml
kubectl apply -f k8s-manifests/configmaps/
kubectl apply -f k8s-manifests/deployments/
kubectl apply -f k8s-manifests/services/
kubectl apply -f k8s-manifests/ingress.yml
```

### Cloud Provider Deployment

#### AWS ECS
```bash
# Deploy using AWS CLI and ECS
aws ecs create-cluster --cluster-name dashdice-cluster
aws ecs register-task-definition --cli-input-json file://aws/task-definition.json
aws ecs create-service --cluster dashdice-cluster --service-name dashdice-app --task-definition dashdice:1 --desired-count 2
```

#### Google Cloud Run
```bash
# Deploy services to Cloud Run
gcloud run deploy api-gateway --source ./go-services/api-gateway --region us-central1
gcloud run deploy match-service --source ./go-services/match-service --region us-central1
# ... repeat for other services
```

## 🧪 Testing Guide

### Unit Tests
```bash
# Frontend tests
npm run test:unit

# Backend tests
cd go-services
for service in api-gateway match-service queue-service presence-service notification-service; do
    cd $service && go test ./... && cd ..
done
```

### Integration Tests
```bash
# Comprehensive system integration
powershell -File integration-check-simple.ps1 -Detailed -VerboseOutput

# WebSocket real-time communication
powershell -File test-websocket.ps1 -VerboseOutput

# Database and Redis functionality
powershell -File test-database.ps1
```

### Load Testing
```bash
# Basic load test (50 users, 2 minutes)
powershell -File advanced-load-testing.ps1 -ConcurrentUsers 50 -Duration 120

# Stress test with ramp-up
powershell -File advanced-load-testing.ps1 -TestType stress -MaxUsers 200 -RampUpTime 300

# WebSocket-specific load test
powershell -File advanced-load-testing.ps1 -TestType websocket -ConcurrentUsers 100
```

### End-to-End Testing
```bash
# Run full E2E test suite
npm run test:e2e

# Specific user flows
npx playwright test --grep "matchmaking flow"
npx playwright test --grep "real-time notifications"
```

## 📊 Monitoring & Observability

### Dashboard Access
- **Grafana**: http://localhost:3001 (admin/admin123)
- **Kibana**: http://localhost:5601
- **Prometheus**: http://localhost:9090
- **AlertManager**: http://localhost:9093
- **Jaeger**: http://localhost:16686

### Key Metrics to Monitor

#### System Metrics
- CPU usage > 85% (warning), > 95% (critical)
- Memory usage > 80% (warning), > 95% (critical)
- Disk space < 20% (warning), < 10% (critical)

#### Application Metrics
- Request rate (requests/second)
- Error rate < 5% (warning), < 15% (critical)
- Response time P95 < 2s (warning), P99 < 5s (critical)
- Service uptime > 99.5%

#### Business Metrics
- Match creation rate > 5/minute
- Queue wait time < 300s (warning), < 600s (critical)
- Match success rate > 90%
- Daily active users

#### WebSocket Metrics
- Active connections
- Connection rate
- Message throughput
- Connection drops

### Alert Configuration
Alerts are configured in `monitoring/prometheus/rules/alerts.yml` and sent via:
- **Slack**: #alerts-critical, #alerts-warning
- **Email**: oncall@dashdice.com, devops@dashdice.com
- **PagerDuty**: For critical alerts only

### Log Analysis
```bash
# View real-time logs
docker-compose -f monitoring/docker-compose.monitoring.yml logs -f

# Search logs in Kibana
# Navigate to http://localhost:5601 > Discover > Filter by service name

# Query Elasticsearch directly
curl "localhost:9200/_search?q=service:api-gateway AND level:ERROR"
```

## 🔧 Operational Procedures

### Daily Operations

#### Health Checks
```bash
# Quick system health check
powershell -File integration-check-simple.ps1

# Monitoring system health
powershell -File start-monitoring.ps1 -SkipServices
```

#### Log Rotation
```bash
# Rotate Docker logs
docker system prune -f
docker volume prune -f

# Archive old logs
tar -czf logs-$(date +%Y%m%d).tar.gz logs/
rm -rf logs/*.log
```

### Scaling Procedures

#### Horizontal Scaling
```bash
# Scale specific services
docker-compose -f go-services/docker-compose.yml up -d --scale match-service=3 --scale queue-service=2

# Kubernetes scaling
kubectl scale deployment match-service --replicas=3
kubectl scale deployment queue-service --replicas=2
```

#### Vertical Scaling
```yaml
# Update docker-compose.yml
services:
  match-service:
    deploy:
      resources:
        limits:
          memory: 1G
          cpus: '1.0'
```

### Maintenance Windows

#### Planned Maintenance
```bash
# 1. Scale down gracefully
docker-compose -f go-services/docker-compose.yml down

# 2. Backup databases
docker run --rm -v postgres-data:/data -v $(pwd):/backup postgres:15-alpine tar czf /backup/postgres-backup-$(date +%Y%m%d).tar.gz /data

# 3. Update services
git pull origin main
docker-compose -f go-services/docker-compose.yml pull

# 4. Restart with zero downtime
docker-compose -f go-services/docker-compose.yml up -d --force-recreate --remove-orphans
```

#### Emergency Procedures
```bash
# Immediate service restart
docker-compose -f go-services/docker-compose.yml restart api-gateway

# Rollback deployment
docker-compose -f go-services/docker-compose.yml down
git checkout HEAD~1
docker-compose -f go-services/docker-compose.yml up -d

# Scale down problematic service
docker-compose -f go-services/docker-compose.yml up -d --scale problematic-service=0
```

## 🔒 Security Guide

### Authentication & Authorization
- **Firebase Authentication**: JWT token validation on all API calls
- **Service-to-Service**: Internal API keys and mutual TLS
- **Rate Limiting**: Implemented at API Gateway level
- **CORS**: Configured for specific origins only

### Data Protection
```bash
# Encrypt sensitive data in environment files
gpg --symmetric --cipher-algo AES256 .env.production

# Secure secrets in Kubernetes
kubectl create secret generic dashdice-secrets \
  --from-file=firebase-key=serviceAccountKey.json \
  --from-literal=redis-password=secure_password
```

### Network Security
- **VPC/Private Networks**: All services in isolated network
- **Firewall Rules**: Only necessary ports exposed
- **SSL/TLS**: All external communication encrypted
- **Internal Traffic**: Service mesh with encryption

### Security Monitoring
```bash
# Monitor authentication failures
curl "localhost:9200/_search?q=auth_failure AND timestamp:[now-1h TO now]"

# Check for suspicious activity
grep "403\|429\|500" logs/api-gateway.log | tail -100

# Security audit
npm audit
docker scan dashdice/api-gateway
```

## 🔥 Troubleshooting Guide

### Common Issues

#### Service Won't Start
```bash
# Check container logs
docker logs dashdice-api-gateway-1

# Check service dependencies
docker-compose -f go-services/docker-compose.yml ps

# Verify environment variables
docker exec dashdice-api-gateway-1 env | grep -E "REDIS|FIREBASE"
```

#### High Response Times
```bash
# Check resource usage
docker stats

# Analyze slow queries in logs
grep "slow query" logs/*.log

# Check database connections
redis-cli info clients
docker exec postgres-container psql -c "SELECT count(*) FROM pg_stat_activity;"
```

#### WebSocket Connection Issues
```bash
# Test WebSocket endpoint
wscat -c "ws://localhost:8085/ws/matchmaking?user_id=test"

# Check WebSocket server logs
docker logs dashdice-websocket-server-1

# Monitor connection metrics
curl http://localhost:3000/api/websocket
```

#### Memory Leaks
```bash
# Monitor memory usage over time
watch -n 5 'docker stats --no-stream'

# Generate heap dump (Go services)
curl http://localhost:8080/debug/pprof/heap > heap.prof
go tool pprof heap.prof

# Restart service if needed
docker-compose -f go-services/docker-compose.yml restart match-service
```

### Performance Optimization

#### Database Optimization
```bash
# Redis optimization
redis-cli CONFIG SET maxmemory-policy allkeys-lru
redis-cli CONFIG SET maxmemory 2gb

# PostgreSQL optimization
docker exec postgres-container psql -c "ANALYZE; VACUUM;"
```

#### Application Tuning
```bash
# Increase Go service resources
# Edit docker-compose.yml:
services:
  match-service:
    environment:
      - GOMAXPROCS=4
    deploy:
      resources:
        limits:
          memory: 2G
          cpus: '2.0'
```

### Disaster Recovery

#### Data Backup
```bash
# Automated backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)

# Backup Redis
docker exec redis-container redis-cli BGSAVE
docker cp redis-container:/data/dump.rdb backup/redis_$DATE.rdb

# Backup PostgreSQL
docker exec postgres-container pg_dump -U dashdice dashdice > backup/postgres_$DATE.sql
```

#### Recovery Procedures
```bash
# Restore Redis
docker cp backup/redis_latest.rdb redis-container:/data/dump.rdb
docker restart redis-container

# Restore PostgreSQL
docker exec -i postgres-container psql -U dashdice -d dashdice < backup/postgres_latest.sql
```

## 📈 Performance Benchmarks

### Expected Performance Metrics
- **API Response Time**: P95 < 200ms, P99 < 500ms
- **Match Creation**: 50+ matches/minute under normal load
- **WebSocket Connections**: 1000+ concurrent connections
- **Database Operations**: Redis < 10ms, PostgreSQL < 100ms
- **System Resource Usage**: CPU < 70%, Memory < 80%

### Load Testing Results
```bash
# Run standardized performance test
powershell -File advanced-load-testing.ps1 -TestType benchmark -Duration 300 -ConcurrentUsers 100

# Expected results:
# - 0 failed requests
# - Average response time < 150ms
# - WebSocket connections stable
# - No memory leaks detected
```

## 🔄 CI/CD Pipeline

### GitHub Actions Workflow
The automated pipeline includes:
1. **Code Quality**: ESLint, TypeScript checking, Go vet
2. **Security Scanning**: npm audit, Snyk, Trivy
3. **Testing**: Unit tests, integration tests, E2E tests
4. **Building**: Docker images, Next.js build
5. **Deployment**: Vercel (frontend), Container registry (backend)
6. **Post-Deploy**: Health checks, smoke tests, performance validation

### Pipeline Triggers
- **Push to main**: Deploy to staging
- **Push to production**: Deploy to production
- **Pull Request**: Run tests only
- **Manual Workflow**: Deploy to specified environment

### Environment Management
```bash
# View pipeline status
gh workflow list

# Trigger manual deployment
gh workflow run deploy.yml -f environment=staging -f run_tests=true

# Check deployment logs
gh run watch
```

## 🎯 Best Practices

### Development
- **Code Reviews**: All changes require peer review
- **Testing**: Minimum 80% test coverage
- **Documentation**: Update docs with every feature
- **Security**: Never commit secrets, use environment variables

### Operations
- **Monitoring**: Set up alerts for all critical metrics
- **Backups**: Automated daily backups with retention policy
- **Updates**: Regular security updates and dependency upgrades
- **Scaling**: Monitor trends and scale proactively

### Security
- **Secrets Management**: Use secure secret storage
- **Access Control**: Principle of least privilege
- **Network Security**: Isolate services in private networks
- **Audit Logs**: Log all administrative actions

## 📞 Support & Contacts

### Team Contacts
- **Development Team**: dev@dashdice.com
- **DevOps/Infrastructure**: devops@dashdice.com  
- **On-Call Support**: oncall@dashdice.com
- **Business Team**: business@dashdice.com

### Emergency Procedures
1. **Critical Issues**: Call on-call engineer immediately
2. **Service Outage**: Follow incident response playbook
3. **Security Incident**: Contact security team within 15 minutes
4. **Data Loss**: Activate disaster recovery procedures

### Documentation Updates
This documentation is maintained in the repository. To update:
1. Create feature branch
2. Update relevant sections
3. Test all procedures
4. Submit pull request
5. Deploy updates after approval

---

**Last Updated**: $(Get-Date -Format "yyyy-MM-dd")
**Version**: 1.0.0
**Maintained By**: DashDice Development Team
