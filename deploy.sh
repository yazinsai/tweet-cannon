#!/bin/bash

# Tweet Cannon - Dokku Deployment Script
# This script automates the deployment process to a Dokku server

set -e

# Configuration
APP_NAME="tweet-cannon"
DOKKU_HOST="${DOKKU_HOST:-your-server.com}"
DOKKU_USER="${DOKKU_USER:-dokku}"
GIT_REMOTE="dokku"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in a git repository
if [ ! -d ".git" ]; then
    log_error "This script must be run from the root of a git repository"
    exit 1
fi

# Check if Dokku remote exists
if ! git remote get-url $GIT_REMOTE >/dev/null 2>&1; then
    log_info "Adding Dokku git remote..."
    git remote add $GIT_REMOTE $DOKKU_USER@$DOKKU_HOST:$APP_NAME
    log_success "Dokku remote added"
else
    log_info "Dokku remote already exists"
fi

# Ensure we're on the main branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ] && [ "$CURRENT_BRANCH" != "master" ]; then
    log_warning "You're not on the main/master branch. Current branch: $CURRENT_BRANCH"
    read -p "Do you want to continue? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "Deployment cancelled"
        exit 0
    fi
fi

# Check for uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
    log_warning "You have uncommitted changes"
    read -p "Do you want to continue? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "Deployment cancelled"
        exit 0
    fi
fi

# Build and test locally first (optional)
if command -v docker &> /dev/null; then
    log_info "Testing Docker build locally..."
    if docker build -t $APP_NAME-test . >/dev/null 2>&1; then
        log_success "Local Docker build successful"
        docker rmi $APP_NAME-test >/dev/null 2>&1
    else
        log_error "Local Docker build failed"
        exit 1
    fi
else
    log_warning "Docker not found, skipping local build test"
fi

# Deploy to Dokku
log_info "Deploying to Dokku..."
log_info "Remote: $DOKKU_USER@$DOKKU_HOST:$APP_NAME"

if git push $GIT_REMOTE $CURRENT_BRANCH:main; then
    log_success "Deployment successful!"
    log_info "Your app should be available at: https://$APP_NAME.$DOKKU_HOST"
else
    log_error "Deployment failed"
    exit 1
fi

# Optional: Open the deployed app
if command -v open &> /dev/null; then
    read -p "Open the deployed app in your browser? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        open "https://$APP_NAME.$DOKKU_HOST"
    fi
fi

log_success "Deployment complete!"
