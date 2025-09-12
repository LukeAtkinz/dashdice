#!/bin/bash

# DashDice Go Services - Production Deployment Script
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DOMAIN="api.dashdice.gg"
EMAIL=""
BACKUP_DIR="/opt/dashdice/backups"
APP_DIR="/opt/dashdice"

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
check_root() {
    if [[ $EUID -eq 0 ]]; then
        log_error "This script should not be run as root for security reasons"
        exit 1
    fi
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install Docker first."
        log_info "Visit: https://docs.docker.com/engine/install/"
        exit 1
    fi
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        log_error "Docker Compose is not installed"
        exit 1
    fi
    
    # Check if user is in docker group
    if ! groups | grep -q docker; then
        log_error "Current user is not in docker group"
        log_info "Run: sudo usermod -aG docker $USER"
        log_info "Then logout and login again"
        exit 1
    fi
    
    log_info "✅ All prerequisites met"
}

# Setup firewall
setup_firewall() {
    log_info "Setting up firewall..."
    
    if command -v ufw &> /dev/null; then
        sudo ufw --force enable
        sudo ufw default deny incoming
        sudo ufw default allow outgoing
        sudo ufw allow ssh
        sudo ufw allow 80/tcp
        sudo ufw allow 443/tcp
        log_info "✅ UFW firewall configured"
    else
        log_warn "UFW not found. Please configure firewall manually:"
        log_warn "- Allow SSH (22)"
        log_warn "- Allow HTTP (80)"
        log_warn "- Allow HTTPS (443)"
        log_warn "- Block all other incoming traffic"
    fi
}

# Create application directory
setup_directories() {
    log_info "Setting up directories..."
    
    sudo mkdir -p $APP_DIR
    sudo mkdir -p $BACKUP_DIR
    sudo mkdir -p /var/log/dashdice
    
    # Set ownership
    sudo chown -R $USER:$USER $APP_DIR
    sudo chown -R $USER:$USER $BACKUP_DIR
    
    log_info "✅ Directories created"
}

# Generate secure passwords
generate_passwords() {
    log_info "Generating secure passwords..."
    
    if [[ ! -f "$APP_DIR/.env.production" ]]; then
        cp .env.production.example "$APP_DIR/.env.production"
        
        # Generate random passwords
        POSTGRES_PASSWORD=$(openssl rand -base64 32)
        REDIS_PASSWORD=$(openssl rand -base64 32)
        JWT_SECRET=$(openssl rand -base64 64)
        
        # Update .env file
        sed -i "s/CHANGE_ME_SECURE_PASSWORD/$POSTGRES_PASSWORD/g" "$APP_DIR/.env.production"
        sed -i "s/CHANGE_ME_SECURE_REDIS_PASSWORD/$REDIS_PASSWORD/g" "$APP_DIR/.env.production"
        sed -i "s/CHANGE_ME_TO_VERY_LONG_SECURE_JWT_SECRET_KEY_AT_LEAST_64_CHARACTERS/$JWT_SECRET/g" "$APP_DIR/.env.production"
        
        log_info "✅ Secure passwords generated and saved to .env.production"
        log_warn "IMPORTANT: Backup the .env.production file securely!"
    else
        log_info "✅ Production environment file already exists"
    fi
}

# Setup SSL certificate
setup_ssl() {
    log_info "Setting up SSL certificate for $DOMAIN..."
    
    if [[ -z "$EMAIL" ]]; then
        read -p "Enter your email for SSL certificate: " EMAIL
    fi
    
    # Update docker-compose with email
    sed -i "s/your-email@example.com/$EMAIL/g" docker-compose.production.yml
    
    # Create webroot directory
    mkdir -p nginx/webroot
    
    log_info "✅ SSL setup prepared"
}

# Deploy services
deploy_services() {
    log_info "Deploying DashDice Go services..."
    
    # Copy files to app directory
    cp -r . $APP_DIR/
    cd $APP_DIR
    
    # Stop existing services
    docker-compose -f docker-compose.production.yml down || true
    
    # Pull latest images
    docker-compose -f docker-compose.production.yml pull
    
    # Build services
    log_info "Building services..."
    docker-compose -f docker-compose.production.yml build --no-cache
    
    # Start services
    log_info "Starting services..."
    docker-compose -f docker-compose.production.yml up -d
    
    log_info "✅ Services deployed"
}

# Wait for services to be healthy
wait_for_services() {
    log_info "Waiting for services to be healthy..."
    
    max_attempts=30
    attempt=0
    
    while [[ $attempt -lt $max_attempts ]]; do
        if docker exec dashdice-api-gateway wget -q --spider http://localhost:8080/health; then
            log_info "✅ API Gateway is healthy"
            break
        fi
        
        attempt=$((attempt + 1))
        log_info "Attempt $attempt/$max_attempts - waiting for API Gateway..."
        sleep 10
    done
    
    if [[ $attempt -eq $max_attempts ]]; then
        log_error "Services failed to start properly"
        docker-compose -f docker-compose.production.yml logs api-gateway
        exit 1
    fi
}

# Setup SSL certificate with Certbot
setup_ssl_certificate() {
    log_info "Obtaining SSL certificate..."
    
    # Initial certificate
    docker-compose -f docker-compose.production.yml run --rm certbot certonly \
        --webroot \
        --webroot-path=/var/www/html \
        --email $EMAIL \
        --agree-tos \
        --no-eff-email \
        -d $DOMAIN
    
    # Reload nginx
    docker-compose -f docker-compose.production.yml restart nginx
    
    log_info "✅ SSL certificate obtained"
}

# Setup automatic backups
setup_backups() {
    log_info "Setting up automatic backups..."
    
    # Create backup script
    cat > "$APP_DIR/backup.sh" << 'EOF'
#!/bin/bash
BACKUP_DIR="/opt/dashdice/backups"
DATE=$(date +%Y%m%d_%H%M%S)

# Backup database
docker exec dashdice-postgres pg_dump -U dashdice_prod dashdice_prod > "$BACKUP_DIR/db_backup_$DATE.sql"

# Backup redis
docker exec dashdice-redis redis-cli --rdb /data/dump.rdb
docker cp dashdice-redis:/data/dump.rdb "$BACKUP_DIR/redis_backup_$DATE.rdb"

# Cleanup old backups (keep last 7 days)
find "$BACKUP_DIR" -name "*.sql" -mtime +7 -delete
find "$BACKUP_DIR" -name "*.rdb" -mtime +7 -delete

echo "Backup completed: $DATE"
EOF

    chmod +x "$APP_DIR/backup.sh"
    
    # Add to crontab
    (crontab -l 2>/dev/null; echo "0 2 * * * $APP_DIR/backup.sh >> /var/log/dashdice/backup.log 2>&1") | crontab -
    
    log_info "✅ Daily backups configured for 2 AM"
}

# Setup monitoring
setup_monitoring() {
    log_info "Setting up monitoring..."
    
    # Create monitoring script
    cat > "$APP_DIR/monitor.sh" << 'EOF'
#!/bin/bash
# Simple health monitoring script

check_service() {
    if ! docker exec $1 wget -q --spider http://localhost:$2/health; then
        echo "$(date): Service $1 is down" >> /var/log/dashdice/monitor.log
        # Restart the service
        docker-compose -f docker-compose.production.yml restart $1
    fi
}

check_service dashdice-api-gateway 8080
check_service dashdice-match-service 8081
check_service dashdice-queue-service 8082
check_service dashdice-presence-service 8083
check_service dashdice-notification-service 8084
EOF

    chmod +x "$APP_DIR/monitor.sh"
    
    # Add to crontab (check every 5 minutes)
    (crontab -l 2>/dev/null; echo "*/5 * * * * $APP_DIR/monitor.sh") | crontab -
    
    log_info "✅ Health monitoring configured"
}

# Main deployment function
main() {
    log_info "🚀 Starting DashDice Go Services Production Deployment"
    log_info "Domain: $DOMAIN"
    
    check_root
    check_prerequisites
    setup_firewall
    setup_directories
    generate_passwords
    setup_ssl
    deploy_services
    wait_for_services
    setup_ssl_certificate
    setup_backups
    setup_monitoring
    
    log_info "🎉 Deployment completed successfully!"
    log_info ""
    log_info "Services are now running at:"
    log_info "  API: https://$DOMAIN"
    log_info "  Health: https://$DOMAIN/health"
    log_info ""
    log_info "Important files:"
    log_info "  Environment: $APP_DIR/.env.production"
    log_info "  Logs: /var/log/dashdice/"
    log_info "  Backups: $BACKUP_DIR"
    log_info ""
    log_info "Next steps:"
    log_info "1. Update DNS to point $DOMAIN to this server"
    log_info "2. Test the API endpoints"
    log_info "3. Monitor logs for any issues"
    log_info ""
    log_warn "IMPORTANT: Backup the .env.production file securely!"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --email)
            EMAIL="$2"
            shift 2
            ;;
        --domain)
            DOMAIN="$2"
            shift 2
            ;;
        -h|--help)
            echo "Usage: $0 [--email EMAIL] [--domain DOMAIN]"
            echo "Example: $0 --email admin@dashdice.gg --domain api.dashdice.gg"
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Run main deployment
main
