# Build stage
FROM golang:1.21-alpine AS builder

WORKDIR /app

# Copy go mod file
COPY go.mod ./

# Initialize the module if needed
RUN go mod tidy || echo "Module already initialized"

# Copy the entire source code including subdirectories
COPY . .

# Build the API Gateway application
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o main ./api-gateway

# Final stage
FROM alpine:latest

RUN apk --no-cache add ca-certificates
WORKDIR /root/

# Copy the binary from builder stage
COPY --from=builder /app/main .

# Expose port
EXPOSE 8080

# Run the binary
CMD ["./main"]
