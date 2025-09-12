#!/bin/bash

# DashDice Go Services Deployment Script
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
ENVIRONMENT="development"
BUILD_SERVICES="true"
RUN_TESTS="false"
DEPLOY_MONITORING="false"

# Help function
show_help() {
    echo "DashDice Go Services Deployment Script"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -e, --environment ENV    Set environment (development/staging/production)"
    echo "  --no-build              Skip building services"
    echo "  --with-tests            Run tests before deployment"
    echo "  --with-monitoring       Deploy monitoring stack (Prometheus/Grafana)"
    echo "  -h, --help              Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                                    # Deploy development environment"
    echo "  $0 -e staging --with-tests           # Deploy staging with tests"
    echo "  $0 -e production --with-monitoring   # Deploy production with monitoring"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        --no-build)
            BUILD_SERVICES="false"
            shift
            ;;
        --with-tests)
            RUN_TESTS="true"
            shift
            ;;
        --with-monitoring)
            DEPLOY_MONITORING="true"
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            show_help
            exit 1
            ;;
    esac
done

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed"
        exit 1
    fi
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        log_error "Docker Compose is not installed"
        exit 1
    fi
    
    # Check if .env file exists
    if [ ! -f .env ]; then
        log_warning ".env file not found. Using environment variables..."
    fi
    
    # Check Firebase service account key
    if [ ! -f serviceAccountKey.json ]; then
        log_error "Firebase service account key (serviceAccountKey.json) not found"
        log_info "Please download your Firebase service account key and save it as serviceAccountKey.json"
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

# Setup environment
setup_environment() {
    log_info "Setting up environment for: $ENVIRONMENT"
    
    # Create necessary directories
    mkdir -p logs
    mkdir -p data/redis
    mkdir -p data/postgres
    
    # Set environment-specific variables
    case $ENVIRONMENT in
        development)
            export GIN_MODE=debug
            export LOG_LEVEL=debug
            ;;
        staging)
            export GIN_MODE=release
            export LOG_LEVEL=info
            ;;
        production)
            export GIN_MODE=release
            export LOG_LEVEL=warn
            ;;
        *)
            log_error "Invalid environment: $ENVIRONMENT"
            exit 1
            ;;
    esac
    
    log_success "Environment setup completed"
}

# Run tests
run_tests() {
    if [ "$RUN_TESTS" = "true" ]; then
        log_info "Running tests..."
        
        # Unit tests
        go test ./... -v -cover -race
        
        if [ $? -ne 0 ]; then
            log_error "Tests failed"
            exit 1
        fi
        
        log_success "All tests passed"
    fi
}

# Build services
build_services() {
    if [ "$BUILD_SERVICES" = "true" ]; then
        log_info "Building services..."
        
        # Build all service images
        docker-compose build --parallel
        
        if [ $? -ne 0 ]; then
            log_error "Build failed"
            exit 1
        fi
        
        log_success "Services built successfully"
    fi
}

# Deploy infrastructure
deploy_infrastructure() {
    log_info "Deploying infrastructure services..."
    
    # Start infrastructure services first
    docker-compose up -d redis postgres
    
    # Wait for services to be ready
    log_info "Waiting for infrastructure services to be ready..."
    sleep 10
    
    # Check Redis health
    if ! docker-compose exec -T redis redis-cli ping > /dev/null 2>&1; then
        log_error "Redis is not ready"
        exit 1
    fi
    
    # Check PostgreSQL health
    if ! docker-compose exec -T postgres pg_isready -U dashdice > /dev/null 2>&1; then
        log_error "PostgreSQL is not ready"
        exit 1
    fi
    
    log_success "Infrastructure services deployed successfully"
}

# Deploy microservices
deploy_microservices() {
    log_info "Deploying microservices..."
    
    # Define deployment order
    local services=("presence-service" "notification-service" "queue-service" "match-service" "api-gateway")
    
    # Deploy services one by one with health checks
    for service in "${services[@]}"; do
        log_info "Deploying $service..."
        docker-compose up -d $service
        
        # Wait for service to be healthy
        local retries=0
        local max_retries=30
        while [ $retries -lt $max_retries ]; do
            if docker-compose ps $service | grep -q "healthy\|Up"; then
                log_success "$service is ready"
                break
            fi
            sleep 2
            retries=$((retries + 1))
        done
        
        if [ $retries -eq $max_retries ]; then
            log_error "$service failed to start properly"
            docker-compose logs $service
            exit 1
        fi
    done
    
    log_success "All microservices deployed successfully"
}

# Deploy monitoring stack
deploy_monitoring() {
    if [ "$DEPLOY_MONITORING" = "true" ]; then
        log_info "Deploying monitoring stack..."
        
        # Create monitoring directories
        mkdir -p deployments/prometheus
        mkdir -p deployments/grafana/dashboards
        mkdir -p deployments/grafana/datasources
        
        # Create basic Prometheus config if it doesn't exist
        if [ ! -f deployments/prometheus/prometheus.yml ]; then
            cat > deployments/prometheus/prometheus.yml << EOF
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'dashdice-services'
    static_configs:
      - targets: ['api-gateway:8080', 'match-service:8081', 'queue-service:8082', 'presence-service:8083', 'notification-service:8084']
    metrics_path: /metrics
    scrape_interval: 5s

  - job_name: 'redis'
    static_configs:
      - targets: ['redis:6379']

  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres:5432']
EOF
        fi
        
        # Start monitoring services
        docker-compose up -d prometheus grafana
        
        log_success "Monitoring stack deployed successfully"
        log_info "Prometheus: http://localhost:9090"
        log_info "Grafana: http://localhost:3000 (admin/admin)"
    fi
}

# Health check
health_check() {
    log_info "Performing health checks..."
    
    local services=("api-gateway:8080" "match-service:8081" "queue-service:8082" "presence-service:8083" "notification-service:8084")
    
    for service in "${services[@]}"; do
        local name=$(echo $service | cut -d':' -f1)
        local port=$(echo $service | cut -d':' -f2)
        
        if curl -f -s "http://localhost:$port/health" > /dev/null; then
            log_success "$name health check passed"
        else
            log_error "$name health check failed"
            docker-compose logs $name
        fi
    done
}

# Cleanup function
cleanup() {
    log_info "Cleaning up..."
    docker-compose down --remove-orphans
}

# Main deployment flow
main() {
    log_info "Starting DashDice Go Services deployment..."
    log_info "Environment: $ENVIRONMENT"
    log_info "Build services: $BUILD_SERVICES"
    log_info "Run tests: $RUN_TESTS"
    log_info "Deploy monitoring: $DEPLOY_MONITORING"
    
    # Trap cleanup on exit
    trap cleanup EXIT
    
    check_prerequisites
    setup_environment
    run_tests
    build_services
    deploy_infrastructure
    deploy_microservices
    deploy_monitoring
    health_check
    
    # Remove trap since we're successful
    trap - EXIT
    
    log_success "Deployment completed successfully!"
    echo ""
    log_info "Service URLs:"
    echo "  API Gateway:        http://localhost:8080"
    echo "  Match Service:      http://localhost:8081"
    echo "  Queue Service:      http://localhost:8082"
    echo "  Presence Service:   http://localhost:8083"
    echo "  Notification Svc:   http://localhost:8084"
    
    if [ "$DEPLOY_MONITORING" = "true" ]; then
        echo "  Prometheus:         http://localhost:9090"
        echo "  Grafana:            http://localhost:3000"
    fi
    
    echo ""
    log_info "To view logs: docker-compose logs -f [service-name]"
    log_info "To stop services: docker-compose down"
}

# Run main function
main "$@"
