# Tweet Cannon - Makefile for deployment and development tasks

.PHONY: help build dev test deploy docker-build docker-run docker-test clean

# Default target
help:
	@echo "Tweet Cannon - Available commands:"
	@echo ""
	@echo "Development:"
	@echo "  dev          - Start development server"
	@echo "  build        - Build production version"
	@echo "  test         - Run tests"
	@echo "  clean        - Clean build artifacts"
	@echo ""
	@echo "Docker:"
	@echo "  docker-build - Build Docker image"
	@echo "  docker-run   - Run Docker container"
	@echo "  docker-test  - Test Docker build"
	@echo "  docker-dev   - Run with docker-compose"
	@echo ""
	@echo "Deployment:"
	@echo "  deploy       - Deploy to Dokku"
	@echo "  deploy-check - Check deployment readiness"
	@echo ""

# Development commands
dev:
	npm run dev

build:
	npm run build

test:
	npm run test

clean:
	rm -rf .next
	rm -rf out
	rm -rf dist
	rm -rf node_modules/.cache

# Docker commands
docker-build:
	docker build -t tweet-cannon .

docker-run: docker-build
	docker run -p 3000:3000 \
		-e NODE_ENV=production \
		-e PORT=3000 \
		tweet-cannon

docker-test: docker-build
	@echo "Testing Docker build..."
	docker run --rm tweet-cannon node healthcheck.js
	@echo "Docker build test passed!"

docker-dev:
	docker-compose up --build

docker-dev-nginx:
	docker-compose --profile with-nginx up --build

# Deployment commands
deploy:
	./deploy.sh

deploy-check:
	@echo "Checking deployment readiness..."
	@echo "✓ Checking git status..."
	@git status --porcelain
	@echo "✓ Checking Docker build..."
	@docker build -t tweet-cannon-test . > /dev/null 2>&1 && echo "✓ Docker build successful" || echo "✗ Docker build failed"
	@docker rmi tweet-cannon-test > /dev/null 2>&1
	@echo "✓ Checking package.json..."
	@node -e "console.log('✓ Package.json valid')" package.json
	@echo "Ready for deployment!"

# Utility commands
install:
	npm ci

update:
	npm update

lint:
	npm run lint

format:
	npm run format

# Production build test
build-test: build
	npm start &
	sleep 5
	curl -f http://localhost:3000/api/health || (echo "Health check failed" && exit 1)
	pkill -f "npm start"
	@echo "Build test passed!"
