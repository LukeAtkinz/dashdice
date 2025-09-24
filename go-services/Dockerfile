FROM golang:1.21-alpine

WORKDIR /app

# Copy source files
COPY . .

# Build the application
RUN go build -o main .

# Expose port
EXPOSE 8080

# Run the application
CMD ["./main"]
