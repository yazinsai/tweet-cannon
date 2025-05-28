# Tweet Cannon - Deployment Guide

This guide covers deploying Tweet Cannon to various platforms, with a focus on Dokku deployment.

## 🚀 Quick Dokku Deployment

### Prerequisites

1. **Dokku Server**: A server with Dokku installed
2. **Domain**: A domain pointing to your Dokku server
3. **Git**: Local git repository with your code

### Automated Deployment

1. **Configure your deployment**:
   ```bash
   export DOKKU_HOST="your-server.com"
   export DOKKU_USER="dokku"
   ```

2. **Run the deployment script**:
   ```bash
   ./deploy.sh
   ```

The script will:
- Add the Dokku git remote
- Test the Docker build locally
- Deploy to your Dokku server
- Provide the app URL

### Manual Deployment

1. **Add Dokku remote**:
   ```bash
   git remote add dokku dokku@your-server.com:tweet-cannon
   ```

2. **Deploy**:
   ```bash
   git push dokku main
   ```

## 🐳 Docker Deployment

### Local Development

1. **Build and run with Docker Compose**:
   ```bash
   docker-compose up --build
   ```

2. **With Nginx (production-like)**:
   ```bash
   docker-compose --profile with-nginx up --build
   ```

### Production Docker

1. **Build the image**:
   ```bash
   docker build -t tweet-cannon .
   ```

2. **Run the container**:
   ```bash
   docker run -p 3000:3000 \
     -e NODE_ENV=production \
     -e PORT=3000 \
     tweet-cannon
   ```

## ⚙️ Dokku Configuration

### App Configuration

```bash
# Create the app
dokku apps:create tweet-cannon

# Set environment variables
dokku config:set tweet-cannon NODE_ENV=production
dokku config:set tweet-cannon PORT=3000

# Configure domains
dokku domains:add tweet-cannon your-domain.com
dokku domains:add tweet-cannon www.your-domain.com

# Enable SSL (Let's Encrypt)
dokku letsencrypt:enable tweet-cannon
```

### Resource Limits

```bash
# Set memory limits
dokku resource:limit tweet-cannon memory 512m

# Set CPU limits  
dokku resource:limit tweet-cannon cpu 0.5
```

### Health Checks

```bash
# Configure health checks
dokku checks:set tweet-cannon web /api/health
```

## 🔧 Environment Variables

Tweet Cannon uses client-side storage, so no server-side environment variables are required for basic functionality. However, you may want to set:

```bash
# Production optimizations
NODE_ENV=production
PORT=3000
HOSTNAME=0.0.0.0

# Optional: Analytics or monitoring
NEXT_TELEMETRY_DISABLED=1
```

## 📊 Monitoring

### Health Check Endpoint

The app includes a health check endpoint at `/api/health` that returns:

```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 3600,
  "environment": "production",
  "version": "1.0.0",
  "checks": {
    "memory": {
      "total": "128MB",
      "used": "64MB",
      "free": "64MB",
      "percentage": 50
    },
    "storage": {
      "available": true,
      "type": "server-side"
    }
  }
}
```

### Docker Health Checks

The Dockerfile includes built-in health checks that run every 30 seconds.

## 🔒 Security Considerations

### Headers

The app includes security headers:
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: origin-when-cross-origin`

### Rate Limiting

When using the included Nginx configuration:
- API endpoints: 10 requests/second
- General endpoints: 30 requests/second

### HTTPS

Always use HTTPS in production:

```bash
# Dokku with Let's Encrypt
dokku letsencrypt:enable tweet-cannon

# Or configure your own SSL certificates
dokku certs:add tweet-cannon < server.crt
```

## 🚨 Troubleshooting

### Common Issues

1. **Build Failures**:
   ```bash
   # Check Dokku logs
   dokku logs tweet-cannon
   
   # Rebuild
   dokku ps:rebuild tweet-cannon
   ```

2. **Memory Issues**:
   ```bash
   # Increase memory limit
   dokku resource:limit tweet-cannon memory 1g
   ```

3. **Port Issues**:
   ```bash
   # Check port configuration
   dokku config:get tweet-cannon PORT
   ```

### Logs

```bash
# View application logs
dokku logs tweet-cannon

# Follow logs in real-time
dokku logs tweet-cannon -t

# View specific number of lines
dokku logs tweet-cannon -n 100
```

## 📈 Scaling

### Horizontal Scaling

```bash
# Scale to multiple instances
dokku ps:scale tweet-cannon web=3
```

### Vertical Scaling

```bash
# Increase resources
dokku resource:limit tweet-cannon memory 1g cpu 1.0
```

## 🔄 Updates

### Rolling Updates

```bash
# Deploy new version
git push dokku main

# Zero-downtime deployment is automatic with Dokku
```

### Rollback

```bash
# List releases
dokku releases tweet-cannon

# Rollback to previous release
dokku releases:rollback tweet-cannon
```

## 📝 Notes

- Tweet Cannon uses client-side storage, so no database is required
- The app is stateless and can be easily scaled horizontally
- All user data is stored locally in the browser
- No server-side data persistence is needed
