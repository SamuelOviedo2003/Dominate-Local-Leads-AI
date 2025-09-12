# 🚀 Production Deployment Checklist

## Pre-Deployment Configuration

### 1. Environment Variables
Ensure these environment variables are set in your production deployment platform:

#### Required Application Variables
```bash
# Application Configuration
NODE_ENV=production
NEXT_PUBLIC_SITE_URL=https://dominatelocalleadsai.sliplane.app
NEXT_TELEMETRY_DISABLED=1

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url_here
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=your_supabase_anon_key_here

# Security
NEXTAUTH_SECRET=your_secure_random_string_here
NEXTAUTH_URL=https://dominatelocalleadsai.sliplane.app

# Logging and Monitoring
LOG_LEVEL=info
ENABLE_PERFORMANCE_MONITORING=true
```

#### Docker-Specific Variables (if using Docker)
```bash
DOCKER_CONTAINER=true
PERFORMANCE_LOG_STDOUT=true
DISABLE_PERFORMANCE_FILE_LOGGING=false
```

### 2. Supabase Dashboard Configuration

#### Authentication URL Configuration
- [ ] **Site URL**: `https://dominatelocalleadsai.sliplane.app`
- [ ] **Redirect URLs** include:
  - `https://dominatelocalleadsai.sliplane.app/auth/reset-password`
  - `https://dominatelocalleadsai.sliplane.app`
- [ ] **PKCE Flow** is enabled
- [ ] **Email Templates** use `{{ .SiteURL }}` variable (not hardcoded URLs)

#### Security Settings
- [ ] Row Level Security (RLS) is enabled on all tables
- [ ] API keys are properly rotated and secure
- [ ] Rate limiting is configured appropriately

### 3. Docker Configuration

#### Docker Compose Production
- [ ] `docker-compose.prod.yml` includes `NEXT_PUBLIC_SITE_URL` environment variable
- [ ] Resource limits are appropriate for production workload
- [ ] Logging configuration is set up for production monitoring
- [ ] Security options are enabled (`no-new-privileges:true`)
- [ ] Read-only filesystem with appropriate temp directories

#### Dockerfile
- [ ] Multi-stage build optimizes image size
- [ ] Security updates are applied
- [ ] Non-root user is used for running the application
- [ ] Health checks are configured

## Deployment Process

### 1. Pre-Deployment Testing
- [ ] Run `npm run build` locally to verify build succeeds
- [ ] Test Docker build: `docker-compose -f docker-compose.yml -f docker-compose.prod.yml build`
- [ ] Run security scan on Docker image
- [ ] Verify all environment variables are properly set

### 2. Deployment Steps
- [ ] Deploy to staging environment first (if available)
- [ ] Test forgot password functionality in staging
- [ ] Verify all URLs use production domain
- [ ] Monitor application logs during deployment
- [ ] Perform smoke tests after deployment

### 3. Post-Deployment Verification

#### Functional Testing
- [ ] **Password Reset Flow**:
  - [ ] Send test password reset email
  - [ ] Verify email contains production URLs
  - [ ] Verify error redirects use production domain
  - [ ] Test expired link behavior
- [ ] **Authentication Flow**:
  - [ ] Test user login/logout
  - [ ] Verify session persistence
  - [ ] Test authentication redirects
- [ ] **Application Health**:
  - [ ] Check application startup logs
  - [ ] Verify database connectivity
  - [ ] Test API endpoints

#### URL Verification Checklist
- [ ] No localhost URLs in production logs
- [ ] Error pages redirect to production domain
- [ ] Email links use production domain
- [ ] JavaScript console shows no localhost references
- [ ] All authentication flows use HTTPS

#### Security Verification
- [ ] HTTPS is enforced (no HTTP traffic)
- [ ] Security headers are present
- [ ] Rate limiting is working
- [ ] CORS is properly configured
- [ ] Database connections are secure

## Monitoring and Maintenance

### 1. Post-Deployment Monitoring
- [ ] Set up application performance monitoring
- [ ] Configure error alerting
- [ ] Monitor authentication success rates
- [ ] Track password reset completion rates

### 2. Regular Maintenance
- [ ] Review and rotate API keys quarterly
- [ ] Update dependencies regularly
- [ ] Monitor security advisories
- [ ] Review and optimize database queries

### 3. Troubleshooting Guide

#### Common Issues and Solutions
| Issue | Symptoms | Solution |
|-------|----------|----------|
| Localhost URLs in production | Error redirects to localhost:3000 | Update Supabase Dashboard Site URL |
| Password reset emails not working | Users don't receive emails | Check Supabase email settings and templates |
| Environment variables not loading | Application uses fallback values | Verify deployment platform environment configuration |
| SSL certificate issues | Mixed content warnings | Ensure all resources use HTTPS |

#### Log Analysis
- [ ] Application logs show correct Site URL
- [ ] No environment variable warnings
- [ ] Supabase authentication events are logged
- [ ] Performance metrics are within expected ranges

## Emergency Rollback Plan

### 1. Immediate Actions
- [ ] Revert to previous stable deployment
- [ ] Verify rollback functionality
- [ ] Notify users of any service interruption

### 2. Root Cause Analysis
- [ ] Review deployment logs
- [ ] Identify configuration differences
- [ ] Document lessons learned
- [ ] Update checklist with new findings

---

## Sign-off

**Deployment Date**: ___________  
**Deployed By**: ___________  
**Verified By**: ___________  

**All checklist items completed**: ☐ Yes ☐ No  
**Ready for production traffic**: ☐ Yes ☐ No  

**Notes**:
_________________________________________________
_________________________________________________
_________________________________________________