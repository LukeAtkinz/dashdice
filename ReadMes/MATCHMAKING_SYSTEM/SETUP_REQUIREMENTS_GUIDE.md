# DashDice Hybrid Matchmaking System - Setup Requirements & Account Creation Guide

## 📋 Overview

This document outlines every account, service, API key, and setup step you need to complete BEFORE implementing the hybrid matchmaking system. This is your complete checklist for getting all external dependencies ready.

**Purpose**: Ensure you have all necessary accounts, credentials, and access before development begins
**Target**: Project owners and administrators setting up the infrastructure
**Timeline**: Complete this setup 1-2 weeks before development starts

---

## 🏢 Cloud Infrastructure Accounts

### 1. Google Cloud Platform (GCP) Account
**Status**: ⚠️ REQUIRED - Enhanced setup needed

**What you need to do:**
```bash
# 1. Upgrade to a paid GCP account if not already done
# 2. Enable required APIs
# 3. Set up billing alerts
# 4. Configure project organization
```

**Setup Steps:**
1. **Create/Upgrade GCP Account**
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - If using free tier, upgrade to paid account for production workloads
   - Set up billing account and payment method
   - Configure billing alerts for cost control

2. **Create Production Project**
   - Create new project: `dashdice-production`
   - Enable required APIs:
     ```bash
     gcloud services enable container.googleapis.com
     gcloud services enable compute.googleapis.com
     gcloud services enable storage.googleapis.com
     gcloud services enable monitoring.googleapis.com
     gcloud services enable logging.googleapis.com
     gcloud services enable cloudresourcemanager.googleapis.com
     ```

3. **Set up IAM and Permissions**
   - Create service account for Kubernetes: `dashdice-k8s-admin`
   - Grant roles: `Kubernetes Engine Admin`, `Compute Admin`, `Storage Admin`
   - Download service account key JSON file
   - Create service account for applications: `dashdice-app-service`
   - Grant roles: `Firebase Admin`, `Cloud Storage User`, `Monitoring Metric Writer`

4. **Configure Resource Quotas**
   - Request quota increases for:
     - CPUs: 200+ cores
     - Memory: 800+ GB
     - Persistent disks: 10+ TB
     - IP addresses: 50+ external IPs

**Estimated Cost**: $500-2000/month depending on usage

---

### 2. Firebase Account & Project Setup
**Status**: ✅ PARTIALLY COMPLETE - Need production project

**What you need to do:**
```bash
# 1. Create production Firebase project separate from development
# 2. Configure authentication providers
# 3. Set up Firestore production database
# 4. Configure Firebase Cloud Messaging
# 5. Generate service account keys
```

**Setup Steps:**
1. **Create Production Firebase Project**
   - Go to [Firebase Console](https://console.firebase.google.com)
   - Create new project: `dashdice-production`
   - Link to your GCP project created above
   - Enable Google Analytics for the project

2. **Configure Authentication**
   - Enable Sign-in methods:
     - Email/Password ✅
     - Google Sign-in ✅
     - Anonymous sign-in (for guests)
   - Configure OAuth consent screen
   - Set up authorized domains for production

3. **Set up Firestore Database**
   - Create Firestore database in production mode
   - Choose region: `us-central1` (or closest to your users)
   - Configure security rules for production
   - Set up indexes for complex queries
   - Enable backups and point-in-time recovery

4. **Configure Firebase Cloud Messaging (FCM)**
   - Enable FCM in Firebase console
   - Generate FCM server key for Go services
   - Configure FCM for web push notifications
   - Set up FCM for mobile apps (if applicable)

5. **Generate Service Account Keys**
   - Go to Project Settings > Service Accounts
   - Generate new private key for `Firebase Admin SDK`
   - Download JSON key file (keep secure!)
   - Create separate keys for different environments

**Required Files to Download:**
- `dashdice-production-firebase-adminsdk.json`
- `firebase-config.js` (for frontend)
- FCM server key (for notifications)

---

### 3. Kubernetes Hosting Provider
**Status**: 🔄 CHOOSE ONE OPTION

**Option A: Google Kubernetes Engine (GKE) - Recommended**

**Setup Steps:**
1. **Enable GKE in your GCP project**
   ```bash
   gcloud services enable container.googleapis.com
   ```

2. **Create production cluster**
   ```bash
   gcloud container clusters create dashdice-production \
     --zone=us-central1-a \
     --machine-type=n1-standard-4 \
     --num-nodes=3 \
     --enable-autoscaling \
     --min-nodes=2 \
     --max-nodes=20 \
     --enable-autorepair \
     --enable-autoupgrade
   ```

3. **Configure kubectl access**
   ```bash
   gcloud container clusters get-credentials dashdice-production --zone=us-central1-a
   ```

**Estimated Cost**: $300-1500/month

**Option B: Amazon EKS (Alternative)**

**Setup Steps:**
1. **Create AWS Account** (if not already have one)
2. **Set up EKS cluster using eksctl**
3. **Configure IAM roles and policies**
4. **Set up VPC and networking**

**Option C: Azure AKS (Alternative)**

**Setup Steps:**
1. **Create Azure Account**
2. **Set up AKS cluster**
3. **Configure resource groups**
4. **Set up networking and security**

---

### 4. Redis Cloud Account
**Status**: 🆕 NEW REQUIRED

**What you need to do:**
```bash
# 1. Create Redis Cloud account
# 2. Set up production Redis cluster
# 3. Configure high availability
# 4. Get connection credentials
```

**Setup Steps:**
1. **Create Redis Cloud Account**
   - Go to [Redis Cloud](https://redis.com/redis-enterprise-cloud/)
   - Sign up for account (free tier available for development)
   - Verify email and complete account setup

2. **Create Production Redis Database**
   - Choose plan: **Fixed** plan with 1GB+ memory
   - Select region: Same as your Kubernetes cluster
   - Enable **High Availability** (important for production)
   - Configure **Redis modules** if needed (RedisJSON, RedisSearch)

3. **Configure Security**
   - Set up **password authentication**
   - Configure **IP whitelist** for your Kubernetes cluster
   - Enable **TLS encryption** for connections
   - Set up **VPC peering** if using GKE (optional but recommended)

4. **Get Connection Details**
   - Redis endpoint URL
   - Port number
   - Password
   - SSL/TLS configuration

**Required Information to Save:**
```
Redis Host: redis-12345.c1.us-central1-1.gce.cloud.redislabs.com
Redis Port: 12345
Redis Password: [SECURE_PASSWORD]
SSL Required: Yes
```

**Estimated Cost**: $50-500/month depending on memory and throughput needs

---

### 5. Domain and SSL Setup
**Status**: 🔄 DOMAIN DEPENDENT

**What you need to do:**
```bash
# 1. Register domain or use existing
# 2. Set up DNS management
# 3. Configure SSL certificates
# 4. Set up CDN (optional)
```

**Setup Steps:**
1. **Domain Registration**
   - If you don't have `dashdice.com`, register it through:
     - Google Domains
     - Namecheap
     - GoDaddy
     - Cloudflare Registrar

2. **DNS Management Setup**
   - **Option A: Cloudflare DNS** (Recommended)
     - Create Cloudflare account
     - Add your domain to Cloudflare
     - Update nameservers at your registrar
     - Enable proxy for main domains
     
   - **Option B: Google Cloud DNS**
     - Set up Cloud DNS in GCP
     - Configure DNS zones
     - Update nameservers

3. **SSL Certificate Setup**
   - **Option A: Cloudflare SSL** (Easy)
     - Enable "Full (Strict)" SSL in Cloudflare
     - Certificates managed automatically
     
   - **Option B: Let's Encrypt with cert-manager**
     - Install cert-manager in Kubernetes
     - Configure automatic certificate renewal

4. **Required DNS Records Setup**
   ```
   A     api.dashdice.com         → [Load Balancer IP]
   A     api-us-east.dashdice.com → [US East LB IP] 
   A     api-us-west.dashdice.com → [US West LB IP]
   A     api-eu-west.dashdice.com → [EU West LB IP]
   A     api-asia.dashdice.com    → [Asia LB IP]
   CNAME ws.dashdice.com          → api.dashdice.com
   ```

**Estimated Cost**: $10-50/year for domain + $0-20/month for DNS/CDN

---

## 🔑 API Keys and Service Accounts

### 1. Firebase Service Account Keys
**Required Files:**
```
1. firebase-adminsdk-production.json
   - Used by Go services for Firestore access
   - Used for FCM push notifications
   - Needs Firebase Admin privileges

2. firebase-config.js  
   - Used by Next.js frontend
   - Contains public Firebase configuration
   - Safe to include in client-side code
```

**Generation Steps:**
1. Go to Firebase Console → Project Settings → Service Accounts
2. Click "Generate New Private Key"
3. Download and securely store the JSON file
4. Add to Kubernetes as a secret

### 2. Google Cloud Service Account Keys
**Required Keys:**
```
1. dashdice-k8s-admin.json
   - Kubernetes cluster management
   - Used by CI/CD pipeline
   - Needs GKE Admin rights

2. dashdice-monitoring.json  
   - Monitoring and logging
   - Used by monitoring services
   - Needs Monitoring Metric Writer rights
```

### 3. Redis Connection Credentials
**Required Information:**
```
REDIS_HOST=redis-xxxxx.cloud.redislabs.com
REDIS_PORT=12345
REDIS_PASSWORD=your_secure_password_here
REDIS_TLS=true
```

### 4. Third-Party Service Keys (Optional but Recommended)

**Monitoring Services:**
- **DataDog API Key** (recommended for advanced monitoring)
- **New Relic License Key** (alternative monitoring)
- **Sentry DSN** (error tracking)

**Communication Services:**
- **SendGrid API Key** (email notifications)
- **Twilio Account SID + Auth Token** (SMS notifications - optional)

---

## 🛠️ Development Tool Setup

### 1. Local Development Environment

**Required Tools:**
```bash
# 1. Install Go (version 1.21+)
# Download from: https://golang.org/dl/

# 2. Install Docker Desktop
# Download from: https://www.docker.com/products/docker-desktop

# 3. Install kubectl
# Download from: https://kubernetes.io/docs/tasks/tools/

# 4. Install Helm
# Download from: https://helm.sh/docs/intro/install/

# 5. Install gcloud CLI
# Download from: https://cloud.google.com/sdk/docs/install
```

**Setup Steps:**
1. **Configure gcloud CLI**
   ```bash
   gcloud auth login
   gcloud config set project dashdice-production
   gcloud container clusters get-credentials dashdice-production --zone=us-central1-a
   ```

2. **Verify Kubernetes access**
   ```bash
   kubectl get nodes
   kubectl get namespaces
   ```

3. **Install development dependencies**
   ```bash
   # Redis CLI for testing
   brew install redis  # macOS
   # or
   sudo apt-get install redis-tools  # Ubuntu

   # k6 for load testing  
   brew install k6  # macOS
   # or
   sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
   echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
   sudo apt-get update
   sudo apt-get install k6
   ```

### 2. CI/CD Pipeline Setup

**GitHub Actions Setup (if using GitHub):**
1. **Create GitHub repository secrets:**
   ```
   GCP_SERVICE_ACCOUNT_KEY: [base64 encoded service account JSON]
   FIREBASE_SERVICE_ACCOUNT: [base64 encoded Firebase service account JSON]
   REDIS_HOST: [your Redis host]
   REDIS_PASSWORD: [your Redis password]
   DOCKER_REGISTRY_TOKEN: [for pushing container images]
   ```

2. **Set up container registry:**
   - Enable Google Container Registry or GitHub Container Registry
   - Configure authentication for pushing images

**Alternative CI/CD Options:**
- **GitLab CI/CD**: Set up GitLab repository and configure variables
- **CircleCI**: Configure CircleCI project with environment variables  
- **Azure DevOps**: Set up Azure DevOps project and pipelines

---

## 💾 Database Setup Requirements

### 1. Production Firestore Setup

**Configuration Checklist:**
- [ ] **Security Rules**: Configure production-ready security rules
- [ ] **Indexes**: Set up composite indexes for complex queries
- [ ] **Backup**: Enable daily backups with point-in-time recovery
- [ ] **Monitoring**: Set up Firestore monitoring and alerting
- [ ] **Regions**: Configure in same region as Kubernetes cluster

**Required Security Rules Update:**
```javascript
// Update firestore.rules for production
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Add production-specific rules
    // Enable stricter validation
    // Add rate limiting
  }
}
```

### 2. Redis Production Configuration

**Required Configuration:**
```bash
# Redis configuration for production
maxmemory-policy: allkeys-lru
timeout: 300
tcp-keepalive: 60
maxclients: 10000

# Persistence configuration  
save: 900 1
save: 300 10  
save: 60 10000
```

### 3. Firebase Realtime Database Setup

**Configuration Steps:**
1. **Enable Realtime Database** in Firebase Console
2. **Configure Security Rules** for presence data
3. **Set up regional database** (if needed for performance)
4. **Configure backup and monitoring**

---

## 🔐 Security Configuration Requirements

### 1. Kubernetes Security Setup

**Required Configurations:**
```bash
# 1. Set up Pod Security Policies
kubectl apply -f pod-security-policy.yaml

# 2. Configure Network Policies
kubectl apply -f network-policies.yaml

# 3. Set up RBAC
kubectl apply -f rbac-config.yaml

# 4. Configure secrets encryption
kubectl apply -f secret-encryption-config.yaml
```

### 2. Secret Management Setup

**Tools to Set Up:**
1. **Kubernetes Secrets** (basic)
2. **Google Secret Manager** (recommended)
   - Enable Secret Manager API
   - Create secrets for all sensitive data
   - Configure workload identity for access

3. **Alternative**: HashiCorp Vault
   - Install Vault in Kubernetes
   - Configure authentication and policies

### 3. SSL/TLS Configuration

**Certificate Management:**
```bash
# Install cert-manager for automatic SSL
kubectl apply -f https://github.com/jetstack/cert-manager/releases/download/v1.12.0/cert-manager.yaml

# Configure Let's Encrypt issuer
kubectl apply -f letsencrypt-issuer.yaml
```

---

## 📊 Monitoring and Logging Setup

### 1. Monitoring Stack Setup

**Option A: Google Cloud Monitoring (Recommended)**
- **Enable**: Monitoring API in GCP
- **Configure**: GKE monitoring addon
- **Set up**: Custom dashboards and alerting

**Option B: Prometheus + Grafana Stack**
```bash
# Install Prometheus Operator
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm install prometheus prometheus-community/kube-prometheus-stack --namespace monitoring --create-namespace
```

### 2. Logging Configuration

**Google Cloud Logging Setup:**
```bash
# Enable logging
gcloud services enable logging.googleapis.com

# Configure log retention
gcloud logging sinks create dashdice-logs \
  storage.googleapis.com/dashdice-logs-bucket \
  --log-filter='resource.type="k8s_container"'
```

### 3. Error Tracking Setup

**Recommended: Sentry**
1. Create Sentry account at [sentry.io](https://sentry.io)
2. Create new project for DashDice
3. Get DSN for Go applications
4. Configure error reporting in all services

---

## 💰 Cost Estimation and Budgeting

### Monthly Cost Estimates

| Service Category | Low Estimate | High Estimate | Notes |
|-----------------|--------------|---------------|--------|
| **Kubernetes Cluster** | $300 | $1,500 | Based on node count and instance types |
| **Redis Cloud** | $50 | $500 | Depends on memory and throughput |
| **Firebase/Firestore** | $50 | $300 | Based on reads/writes/storage |
| **Load Balancers** | $20 | $100 | Per region deployment |
| **Storage & Backups** | $20 | $100 | Database backups and file storage |
| **Monitoring Tools** | $0 | $200 | Third-party monitoring if used |
| **Domain & SSL** | $2 | $10 | Domain registration and CDN |
| **Bandwidth** | $50 | $500 | Data transfer costs |
| **Total Monthly** | **$492** | **$3,210** | Scales with usage |

### Cost Optimization Tips

1. **Start Small**: Begin with minimum viable infrastructure
2. **Use Preemptible Instances**: 70% cost savings for non-critical workloads  
3. **Right-size Resources**: Monitor usage and adjust instance sizes
4. **Use Reserved Instances**: Long-term savings for predictable workloads
5. **Implement Auto-scaling**: Scale down during low usage periods

---

## ✅ Pre-Implementation Checklist

### Accounts and Services
- [ ] **GCP Account** - Upgraded to paid, billing configured
- [ ] **Firebase Production Project** - Created and configured
- [ ] **Redis Cloud Account** - Production database created  
- [ ] **Kubernetes Cluster** - Created and accessible
- [ ] **Domain Registration** - DNS and SSL configured
- [ ] **Container Registry** - Set up for Docker images

### API Keys and Credentials  
- [ ] **Firebase Service Account Key** - Generated and secured
- [ ] **GCP Service Account Keys** - Created for different purposes
- [ ] **Redis Connection Details** - Host, port, password obtained
- [ ] **Third-party API Keys** - Monitoring, error tracking, etc.

### Development Environment
- [ ] **Local Tools Installed** - Go, Docker, kubectl, helm, gcloud
- [ ] **Kubernetes Access** - kubectl configured and working
- [ ] **Development Secrets** - Local .env files configured  
- [ ] **CI/CD Pipeline** - GitHub Actions or alternative configured

### Security and Compliance
- [ ] **Security Policies** - Pod security, network policies defined
- [ ] **Secret Management** - Kubernetes secrets or external vault
- [ ] **SSL Certificates** - Automatic certificate management configured
- [ ] **Backup Strategies** - Database backup and recovery plans

### Monitoring and Operations
- [ ] **Monitoring Stack** - Prometheus/Grafana or GCP monitoring
- [ ] **Logging Configuration** - Centralized logging set up
- [ ] **Error Tracking** - Sentry or similar service configured
- [ ] **Alerting Rules** - Critical system alerts configured

### Budget and Cost Control
- [ ] **Budget Alerts** - GCP billing alerts configured
- [ ] **Cost Monitoring** - Regular cost review process established
- [ ] **Resource Quotas** - Kubernetes resource limits configured
- [ ] **Auto-scaling Limits** - Maximum scaling limits set

---

## 🚨 Critical Security Reminders

### Never Store in Code Repository
```bash
# Never commit these files:
serviceAccountKey.json
firebase-adminsdk-*.json
.env files with real credentials
kubectl config files
SSL private keys
```

### Secure Credential Storage
1. **Use Kubernetes Secrets** for application credentials
2. **Use Google Secret Manager** for enhanced security
3. **Rotate credentials regularly** (every 90 days)
4. **Use least-privilege access** for all service accounts
5. **Enable audit logging** for all credential access

### Access Control
1. **Implement 2FA** on all admin accounts
2. **Use service accounts** instead of personal accounts for automation
3. **Regular access reviews** - Remove unused accounts and permissions
4. **Separate dev/staging/production** environments completely

---

## 📞 Support and Escalation

### When You Need Help

| Issue Type | Contact | Response Time |
|-----------|---------|---------------|
| **GCP Issues** | Google Cloud Support | 2-24 hours |
| **Firebase Issues** | Firebase Support | 24-48 hours |
| **Redis Cloud Issues** | Redis Support | 4-8 hours |
| **Kubernetes Issues** | Community Forums | Varies |
| **Emergency Outages** | All vendor support | 1-4 hours |

### Documentation Resources
- **GCP Documentation**: [cloud.google.com/docs](https://cloud.google.com/docs)
- **Firebase Documentation**: [firebase.google.com/docs](https://firebase.google.com/docs)
- **Kubernetes Documentation**: [kubernetes.io/docs](https://kubernetes.io/docs)
- **Redis Documentation**: [redis.io/documentation](https://redis.io/documentation)

---

## 🎯 Success Criteria

### Setup Complete When:
- [ ] All services accessible and responding to health checks
- [ ] Authentication working end-to-end
- [ ] Database connections established and tested
- [ ] Monitoring and alerting functional
- [ ] CI/CD pipeline successfully deploying test applications
- [ ] All security measures implemented and tested
- [ ] Cost monitoring and budgets active
- [ ] Team trained on new infrastructure

**Timeline**: Allow 2-3 weeks for complete setup if starting from scratch, 1 week if you have existing GCP/Firebase setup.

**Next Step**: Once this checklist is 100% complete, you're ready to begin the implementation phase using the Implementation Prompts Guide! 🚀
