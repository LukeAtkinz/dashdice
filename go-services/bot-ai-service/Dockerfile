FROM golang:1.21-alpine AS builder

WORKDIR /app

# Copy go mod files
COPY go.mod go.sum ./
RUN go mod download

# Copy shared modules
COPY shared/ ./shared/

# Copy bot-ai-service source
COPY bot-ai-service/ ./bot-ai-service/

# Build the service
WORKDIR /app/bot-ai-service
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o bot-ai-service .

FROM alpine:latest

RUN apk --no-cache add ca-certificates tzdata
WORKDIR /root/

# Copy the binary from builder
COPY --from=builder /app/bot-ai-service/bot-ai-service .

# Create directory for service account key
RUN mkdir -p /app

# Expose port
EXPOSE 8085

# Run the service
CMD ["./bot-ai-service"]
