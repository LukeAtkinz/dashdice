FROM golang:1.21-alpine AS builder

WORKDIR /app

# Copy source files
COPY . .

# Build the application
RUN go build -o main .

# Production image
FROM alpine:latest

# Install ca-certificates for HTTPS requests
RUN apk --no-cache add ca-certificates

WORKDIR /root/

# Copy the binary from builder
COPY --from=builder /app/main .

# Expose port
EXPOSE 8080

# Run the application
CMD ["./main"]