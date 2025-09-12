# API Gateway Dockerfile
FROM golang:1.21-alpine AS builder

# Install git for go mod operations
RUN apk add --no-cache git

WORKDIR /app

# Copy all source code first
COPY . .

# Download dependencies and create go.sum
RUN go mod tidy && go mod download

# Build the application
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o api-gateway ./api-gateway/

FROM alpine:latest
RUN apk --no-cache add ca-certificates
WORKDIR /root/

COPY --from=builder /app/api-gateway .

EXPOSE 8080
CMD ["./api-gateway"]
