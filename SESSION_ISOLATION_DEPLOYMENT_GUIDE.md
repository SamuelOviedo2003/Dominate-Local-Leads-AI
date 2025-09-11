# Session Isolation Deployment Guide

## Critical Session Bleeding Fix

This guide documents the comprehensive fix for the session bleeding vulnerability where User A's company switch affects User B's session in production.

## 🚨 Problem Analysis

### Root Cause
The session bleeding vulnerability was caused by:

1. **Global In-Memory Cache**: The `authCache` object in `auth-helpers.ts` was a global, shared object across all requests
2. **No Request Isolation**: All users shared the same cache entries using global keys
3. **Business Context Contamination**: Business switching updated global state affecting all users
4. **Missing Session Store**: No external session store for proper session isolation

### Impact
- User A switches companies → User B immediately sees User A's company context
- Session data contamination across different users
- Critical security vulnerability in production

## 🔧 Comprehensive Fix Implementation

### 1. Request-Scoped Authentication System
**File**: `src/lib/auth-helpers-isolated.ts`

- Replaced global `authCache` with React's `cache()` function for request-scoped isolation
- Each request gets its own isolated cache that cannot leak between users
- Proper session tracking with unique request IDs
- Enhanced monitoring and logging for session access

### 2. Redis Session Store
**File**: `src/lib/redis-session-store.ts`

- Distributed session management with Redis
- Atomic business switching with distributed locks
- Session validation and integrity checks
- Automatic cleanup and TTL management
- Production-ready connection handling

### 3. Session Security Middleware
**File**: `src/lib/session-security-middleware.ts`

- Real-time anomaly detection for session bleeding
- Browser fingerprinting for session validation
- IP address consistency checks
- Concurrent session monitoring
- Automatic security violation handling

### 4. Atomic Business Switching
**File**: `src/app/actions/business-switch-secure.ts`

- Distributed locking during business switches
- Transaction-like guarantees for business context changes
- Session isolation verification
- Performance monitoring and timing

### 5. Enhanced Session Monitoring
**Enhanced**: `src/lib/session-monitoring.ts`
**New**: `src/app/api/session/diagnostics/route.ts`

- Real-time session health monitoring
- Session bleeding detection algorithms
- Diagnostic API for production monitoring
- Development testing capabilities

## 🐳 Docker Configuration Updates

### Development Environment
**File**: `docker-compose.yml`

```yaml
services:
  redis:
    image: redis:7.2-alpine
    container_name: dominate-leads-redis
    ports:
      - "6379:6379"
    command: redis-server --appendonly yes --appendfsync everysec --maxmemory 256mb --maxmemory-policy allkeys-lru
    environment:
      - REDIS_PASSWORD=${REDIS_PASSWORD:-}
    volumes:
      - redis-data:/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 10s

  nextjs-app:
    environment:
      - REDIS_HOST=redis
      - REDIS_PORT=6379
      - REDIS_PASSWORD=${REDIS_PASSWORD:-}
      - REDIS_URL=redis://redis:6379
      - SESSION_STORE_TYPE=redis
      - SESSION_SECURITY_ENABLED=true
    depends_on:
      redis:
        condition: service_healthy
```

### Production Environment
**File**: `docker-compose.prod.yml`

- Production Redis configuration with persistence
- Resource limits and security options
- Logging and monitoring setup

## 📦 Package Dependencies

**File**: `package.json`

```json
{
  "dependencies": {
    "ioredis": "^5.4.1"
  },
  "devDependencies": {
    "@types/ioredis": "^5.0.0"
  }
}
```

## 🚀 Sliplane Deployment Instructions

### 1. Environment Variables Setup

Add these environment variables to your Sliplane project:

```bash
# Redis Configuration
REDIS_URL=redis://your-redis-host:6379
REDIS_PASSWORD=your-secure-password

# Session Security
SESSION_STORE_TYPE=redis
SESSION_SECURITY_ENABLED=true

# Monitoring (optional)
LOG_LEVEL=info
ENABLE_PERFORMANCE_MONITORING=true
```

### 2. Redis Service Setup

**Option A: Sliplane Redis Add-on (Recommended)**
```bash
# Add Redis add-on through Sliplane dashboard
# This provides managed Redis with automatic backups
```

**Option B: External Redis Service**
- Use Redis Labs, AWS ElastiCache, or similar
- Configure connection string in `REDIS_URL`

### 3. Deploy with Docker Compose

```bash
# Deploy to Sliplane with production configuration
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### 4. Verification Steps

1. **Check Redis Connection**:
   ```bash
   # Access your deployed container
   redis-cli -h your-redis-host -p 6379 ping
   # Should return: PONG
   ```

2. **Test Session Isolation**:
   ```bash
   # Run the comprehensive test suite
   node test-session-isolation-comprehensive.js
   ```

3. **Monitor Session Health**:
   ```bash
   # Access diagnostics endpoint (admin only)
   curl https://your-app.sliplane.app/api/session/diagnostics
   ```

## 🔍 Testing & Validation

### Local Testing
```bash
# Install dependencies
npm install

# Start services with Redis
docker-compose up -d

# Run session isolation tests
node test-session-isolation-comprehensive.js

# Access diagnostics
curl http://localhost:3000/api/session/diagnostics
```

### Production Testing
```bash
# Set production URL
export TEST_URL=https://your-app.sliplane.app

# Run comprehensive tests
node test-session-isolation-comprehensive.js
```

## 📊 Monitoring & Alerts

### Session Health Dashboard
- Access: `https://your-app.sliplane.app/api/session/diagnostics`
- Requires: Admin privileges (role = 0)
- Provides: Real-time session statistics and health metrics

### Key Metrics to Monitor
- Session isolation health score (target: >95%)
- Active sessions count
- Business switch success rate (target: >95%)
- Redis connection status
- Session anomaly alerts

### Alert Triggers
- Session bleeding detected
- Redis connection failures
- High failure rates in business switching
- Concurrent session limit exceeded

## 🔄 Migration Process

### Step 1: Backup Current State
```bash
# Backup current database
pg_dump your_database > backup_$(date +%Y%m%d).sql

# Backup environment configuration
cp .env.local .env.local.backup
```

### Step 2: Deploy New Code
```bash
# Deploy with new session isolation system
git push sliplane main
```

### Step 3: Configure Redis
```bash
# Add Redis service to Sliplane
# Update environment variables
# Restart application
```

### Step 4: Validate Fix
```bash
# Run comprehensive tests
# Monitor session diagnostics
# Verify no session bleeding
```

### Step 5: Monitor Production
```bash
# Set up monitoring alerts
# Track session health metrics
# Monitor for anomalies
```

## ⚠️ Rollback Plan

If issues occur during deployment:

### Step 1: Immediate Rollback
```bash
# Revert to previous deployment
git revert HEAD
git push sliplane main
```

### Step 2: Disable Redis
```bash
# Remove Redis environment variables
# Application will continue with degraded functionality
```

### Step 3: Restore Backup
```bash
# Restore database if needed
psql your_database < backup_$(date +%Y%m%d).sql
```

## 🎯 Success Criteria

The session isolation fix is successful when:

- ✅ No session bleeding detected in tests
- ✅ Business switching works atomically
- ✅ Redis session store is operational
- ✅ Session health score > 95%
- ✅ All monitoring systems active
- ✅ Performance impact < 5%

## 🚨 Critical Production Notes

### Redis Requirements
- **Memory**: At least 512MB for Redis
- **Persistence**: Enable AOF for data durability
- **Network**: Ensure Redis is accessible from app containers
- **Security**: Use strong Redis password
- **Monitoring**: Set up Redis health checks

### Performance Considerations
- **Cache TTL**: 30 seconds for fresh data, 5 minutes for stale
- **Connection Pooling**: Redis connection reuse
- **Lock Timeout**: 30 seconds for business switch locks
- **Cleanup**: Automatic cleanup every 5 minutes

### Security Hardening
- **Session Encryption**: All session data encrypted in Redis
- **IP Validation**: Consistent IP address checking
- **Anomaly Detection**: Real-time security monitoring
- **Rate Limiting**: Built-in rate limit protection

## 📞 Support & Troubleshooting

### Common Issues

**Redis Connection Failures**
```bash
# Check Redis connectivity
redis-cli -h host -p port ping

# Verify environment variables
echo $REDIS_URL
```

**Session Still Bleeding**
```bash
# Run diagnostics
curl /api/session/diagnostics

# Check for global cache usage
grep -r "authCache" src/
```

**Performance Issues**
```bash
# Monitor Redis memory usage
redis-cli info memory

# Check connection pool
redis-cli info clients
```

### Emergency Procedures

**Critical Session Bleeding**
1. Immediately disable Redis in production
2. Restart all application containers
3. Enable enhanced logging
4. Run emergency tests

**Redis Failure**
1. Application continues with degraded functionality
2. Business switching may be slower
3. Session persistence reduced
4. Plan Redis restoration

This comprehensive fix eliminates the session bleeding vulnerability and provides a robust, scalable session management system suitable for production deployment on Sliplane.