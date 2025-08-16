# Deployment Guide for Dominate Local Leads AI

## Overview

This guide provides comprehensive instructions for deploying the Next.js 14 lead management application using Docker in production environments.

## Prerequisites

- Docker Engine 20.10.0 or higher
- Docker Compose 2.0.0 or higher
- Node.js 20.18.0 or higher (for local development)
- Access to Supabase project credentials

## Quick Start

### 1. Environment Setup

```bash
# Copy environment template
cp .env.production.template .env.production

# Edit with your actual values
nano .env.production
```

### 2. Build and Run

```bash
# Build the Docker image
docker build -t dominate-leads-ai:latest .

# Run the container
docker run -d \
  --name dominate-leads-app \
  -p 3000:3000 \
  --env-file .env.production \
  dominate-leads-ai:latest
```

## Production Deployment

### Docker Build Options

#### Standard Build
```bash
docker build -t dominate-leads-ai:latest .
```

#### Build with Specific Environment Variables
```bash
docker build \
  --build-arg NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key \
  -t dominate-leads-ai:latest .
```

#### Multi-platform Build
```bash
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t dominate-leads-ai:latest \
  --push .
```

### Container Orchestration

#### Docker Compose
```bash
# Development/Testing
docker-compose up -d

# Production (with specific environment)
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

#### Kubernetes Deployment
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: dominate-leads-ai
spec:
  replicas: 3
  selector:
    matchLabels:
      app: dominate-leads-ai
  template:
    metadata:
      labels:
        app: dominate-leads-ai
    spec:
      containers:
      - name: app
        image: dominate-leads-ai:latest
        ports:
        - containerPort: 3000
        env:
        - name: NEXT_PUBLIC_SUPABASE_URL
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: supabase-url
        - name: NEXT_PUBLIC_SUPABASE_ANON_KEY
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: supabase-anon-key
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
```

## Environment Configuration

### Required Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | `https://abc123.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |
| `NODE_ENV` | Node environment | `production` |

### Optional Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Application port | `3000` |
| `HOSTNAME` | Bind hostname | `0.0.0.0` |
| `NEXT_TELEMETRY_DISABLED` | Disable Next.js telemetry | `1` |

## Security Considerations

### Container Security
- Application runs as non-root user (`nextjs:nodejs`)
- Minimal Alpine Linux base image
- Security headers configured in Next.js
- No secrets baked into the image

### Network Security
- Nginx reverse proxy with rate limiting
- HTTPS termination (configure SSL certificates)
- Security headers (CSP, HSTS, X-Frame-Options)

### Production Hardening
```bash
# Run with security options
docker run -d \
  --name dominate-leads-app \
  --security-opt=no-new-privileges:true \
  --cap-drop=ALL \
  --read-only \
  --tmpfs /tmp:rw,noexec,nosuid,size=100m \
  -p 3000:3000 \
  dominate-leads-ai:latest
```

## Monitoring and Health Checks

### Health Check Endpoint
```bash
# Check application health
curl http://localhost:3000/api/health
```

### Container Health
```bash
# Check container status
docker ps --filter name=dominate-leads-app

# View logs
docker logs dominate-leads-app

# Execute health check manually
docker exec dominate-leads-app wget --spider -q http://localhost:3000/api/health
```

### Metrics and Logging
- Application logs available via `docker logs`
- Health check endpoint at `/api/health`
- Performance metrics logged internally
- Consider integrating with monitoring solutions (Prometheus, Grafana)

## Scaling and Performance

### Horizontal Scaling
```bash
# Scale with Docker Compose
docker-compose up -d --scale nextjs-app=3

# Scale with Kubernetes
kubectl scale deployment dominate-leads-ai --replicas=5
```

### Performance Optimizations
- Next.js standalone output reduces image size by ~85%
- Multi-stage build separates build and runtime dependencies
- Nginx reverse proxy for static file serving
- Gzip compression enabled
- Image optimization with Sharp

## Troubleshooting

### Common Issues

#### Build Failures
```bash
# Clear Docker cache
docker builder prune -a

# Build with verbose output
docker build --progress=plain -t dominate-leads-ai:latest .
```

#### Runtime Issues
```bash
# Check logs
docker logs dominate-leads-app

# Interactive debugging
docker exec -it dominate-leads-app sh

# Check health endpoint
curl -v http://localhost:3000/api/health
```

#### Environment Variable Issues
```bash
# Verify environment variables
docker exec dominate-leads-app env | grep NEXT_PUBLIC

# Test with explicit variables
docker run --rm \
  -e NEXT_PUBLIC_SUPABASE_URL=your-url \
  -e NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key \
  dominate-leads-ai:latest
```

## Deployment Platforms

### Generic Container Platforms
This Dockerfile is compatible with:
- Docker Swarm
- Kubernetes
- Amazon ECS
- Google Cloud Run
- Azure Container Instances
- DigitalOcean App Platform
- Railway
- Render
- Fly.io

### Platform-Specific Considerations

#### Railway
```bash
# Deploy to Railway
railway login
railway link
railway up
```

#### Render
- Use Dockerfile deployment
- Set environment variables in dashboard
- Configure health check endpoint

#### Fly.io
```bash
# Initialize and deploy
fly launch
fly deploy
```

## Branch Strategy

### Main Branch (Production)
Clean branch containing only:
- Application source code (`src/`)
- Configuration files (`package.json`, `next.config.js`, etc.)
- Docker deployment files (`Dockerfile`, `docker-compose.yml`)
- Essential documentation (`README.md`, `DEPLOYMENT.md`)

### Master Branch (Pre-production)
May contain additional development artifacts for testing.

## File Cleanup for Production

### Files to Remove from Main Branch
```bash
# Remove development documentation
rm CLAUDE.md INITIAL.md COLOR_EXTRACTION_OPTIMIZATION_IMPLEMENTATION.md
rm DYNAMIC_COLOR_SYSTEM_GUIDE.md ENHANCEMENT_FILES_DOCUMENTATION.md
rm IDEAL_FILE_STRUCTURE.md README-ENVIRONMENT.md

# Remove development artifacts
rm performance-metrics.log
rm -rf .playwright-mcp/
rm database-cache-implementation.ts
rm enhanced-business-switching.ts
rm enhanced-rate-limiting.ts
rm server-color-extraction.ts

# Remove migration files (move to separate deployment process)
rm -rf migrations/
```

### Files to Keep
- All files in `src/` directory
- `package.json` and `package-lock.json`
- `next.config.js`, `tsconfig.json`, `tailwind.config.js`
- `public/` directory contents
- Docker configuration files
- Essential deployment documentation

## Maintenance

### Regular Updates
```bash
# Update base image
docker pull node:20.18.0-alpine3.20

# Rebuild with latest security updates
docker build --no-cache -t dominate-leads-ai:latest .

# Update dependencies
npm audit fix
```

### Backup Strategy
- Database backups through Supabase
- Application state is stateless
- Configuration stored in environment variables
- Regular image backups to container registry

## Support

For deployment issues:
1. Check the health endpoint `/api/health`
2. Review container logs
3. Verify environment variables
4. Test local Docker build
5. Consult platform-specific documentation