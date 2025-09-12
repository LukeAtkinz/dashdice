#!/bin/bash
echo "Rebuilding Queue Service with updated logic..."

# Stop existing service
docker stop dashdice-queue-service-v2 || true
docker rm dashdice-queue-service-v2 || true

# Create a simple build using existing working pattern
docker run --rm -v "$(pwd)":/workspace -w /workspace golang:1.21-alpine sh -c "
    cd /workspace/queue-service && 
    go mod tidy && 
    CGO_ENABLED=0 GOOS=linux go build -o queue-service-new .
"

# Create minimal image
cat > Dockerfile-temp << 'EOF'
FROM alpine:latest
RUN apk --no-cache add ca-certificates
WORKDIR /root/
COPY queue-service/queue-service-new ./queue-service
EXPOSE 8080
CMD ["./queue-service"]
EOF

docker build -f Dockerfile-temp -t go-services-queue-service-updated .
rm Dockerfile-temp

echo "Starting updated Queue Service..."
docker run -d --name dashdice-queue-service-updated \
  --network dashdice-network \
  -p 8082:8080 \
  -e REDIS_HOST=dashdice-redis \
  -e PORT=8080 \
  -e QUEUE_SERVICE_ADDR=0.0.0.0:8080 \
  -e USE_FIRESTORE=false \
  -e USE_REALTIME_DB=false \
  -e USE_REDIS=true \
  go-services-queue-service-updated

echo "Queue service rebuild complete!"
