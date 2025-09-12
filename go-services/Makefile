# DashDice Go Services Makefile

.PHONY: build test clean docker-build docker-push run-local deps

# Variables
REGISTRY_URL ?= ghcr.io/lukeatkinz
VERSION ?= latest
SERVICES = api-gateway match-service queue-service presence-service notification-service

# Default target
all: deps test build

# Install dependencies
deps:
	go mod download
	go mod tidy

# Run tests
test:
	go test -v ./...

# Run tests with coverage
test-coverage:
	go test -v -coverprofile=coverage.out ./...
	go tool cover -html=coverage.out -o coverage.html

# Build all services locally
build:
	@for service in $(SERVICES); do \
		echo "Building $$service..."; \
		CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o ./bin/$$service ./$$service/main.go; \
	done

# Build Docker images
docker-build:
	@chmod +x ./scripts/build-all.sh
	@REGISTRY_URL=$(REGISTRY_URL) ./scripts/build-all.sh

# Push Docker images
docker-push: docker-build
	@for service in $(SERVICES); do \
		echo "Pushing $$service..."; \
		docker push $(REGISTRY_URL)/dashdice/$$service:$(VERSION); \
	done

# Run services locally for development
run-local:
	@echo "Starting Redis locally..."
	@docker run -d --name dashdice-redis -p 6379:6379 redis:7-alpine || true
	@echo "Services will connect to local Redis at localhost:6379"

# Clean build artifacts
clean:
	rm -rf ./bin
	docker rmi -f $(shell docker images -q dashdice/* 2>/dev/null) 2>/dev/null || true

# Development commands
dev-api-gateway:
	go run ./api-gateway/main.go

dev-match-service:
	go run ./match-service/main.go

dev-queue-service:
	go run ./queue-service/main.go

# Kubernetes deployment
k8s-deploy-dev:
	kubectl apply -f k8s/development/

k8s-deploy-staging:
	kubectl apply -f k8s/staging/

k8s-deploy-prod:
	kubectl apply -f k8s/production/

# Database migrations
migrate-up:
	go run ./scripts/migrate.go up

migrate-down:
	go run ./scripts/migrate.go down

# Load testing
load-test:
	k6 run tests/load/matchmaking.js

# Integration tests
integration-test:
	go test -tags=integration ./tests/integration/...
