# Build script for all services
#!/bin/bash

set -e

echo "Building DashDice Go Services..."

# Build API Gateway
echo "Building API Gateway..."
docker build -t dashdice/api-gateway:latest -f api-gateway/Dockerfile .

# Build Match Service  
echo "Building Match Service..."
docker build -t dashdice/match-service:latest -f match-service/Dockerfile .

# Build Queue Service
echo "Building Queue Service..."
docker build -t dashdice/queue-service:latest -f queue-service/Dockerfile .

# Build Presence Service
echo "Building Presence Service..."
docker build -t dashdice/presence-service:latest -f presence-service/Dockerfile .

# Build Notification Service
echo "Building Notification Service..."
docker build -t dashdice/notification-service:latest -f notification-service/Dockerfile .

echo "All services built successfully!"

# Tag for registry if REGISTRY_URL is set
if [ ! -z "$REGISTRY_URL" ]; then
    echo "Tagging images for registry: $REGISTRY_URL"
    
    docker tag dashdice/api-gateway:latest $REGISTRY_URL/dashdice/api-gateway:latest
    docker tag dashdice/match-service:latest $REGISTRY_URL/dashdice/match-service:latest
    docker tag dashdice/queue-service:latest $REGISTRY_URL/dashdice/queue-service:latest
    docker tag dashdice/presence-service:latest $REGISTRY_URL/dashdice/presence-service:latest
    docker tag dashdice/notification-service:latest $REGISTRY_URL/dashdice/notification-service:latest
    
    echo "Images tagged for registry!"
fi
