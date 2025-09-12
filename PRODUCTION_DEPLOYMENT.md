# Production Deployment Guide

This guide provides step-by-step instructions for deploying the Dominate Local Leads AI application to production, with specific focus on Sliplane deployment and environment variable configuration.

## Critical Environment Variables

### Required for Forgot Password Functionality

The following environment variables are **CRITICAL** for the forgot password feature to work in production:

```bash
NEXT_PUBLIC_SITE_URL=https://dominatelocalleadsai.sliplane.app
```

### Complete Production Environment Variables

Based on the `.env.production.template`, ensure these variables are set in your production environment:

```bash
# =========================================
# Application Configuration (REQUIRED)
# =========================================
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
PORT=3000
HOSTNAME=0.0.0.0

# CRITICAL: Set this to your production domain URL
NEXT_PUBLIC_SITE_URL=https://dominatelocalleadsai.sliplane.app

# =========================================
# Supabase Configuration (REQUIRED)
# =========================================
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url_here
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=your_supabase_anon_key_here

# =========================================
# Security Configuration
# =========================================
NEXTAUTH_SECRET=your_secure_random_string_here
NEXTAUTH_URL=https://dominatelocalleadsai.sliplane.app
```

## Sliplane Deployment Steps

### 1. Set Environment Variables in Sliplane

1. Login to your Sliplane dashboard
2. Navigate to your project settings
3. Go to the "Environment Variables" section
4. Add the following variables:

```
NEXT_PUBLIC_SITE_URL=https://dominatelocalleadsai.sliplane.app
NEXT_PUBLIC_SUPABASE_URL=[your-supabase-url]
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=[your-supabase-anon-key]
NEXTAUTH_SECRET=[your-secure-random-string]
NEXTAUTH_URL=https://dominatelocalleadsai.sliplane.app
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
```

### 2. Verify Docker Build Configuration

The Dockerfile is configured to accept environment variables at build time and runtime. Ensure your Sliplane build configuration includes:

```dockerfile
# These are already configured in the Dockerfile
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY
```

### 3. Deploy and Verify

After setting environment variables:

1. Trigger a new deployment in Sliplane
2. Monitor the build logs for any environment variable warnings
3. Test the forgot password functionality immediately after deployment

## Troubleshooting Common Issues

### Issue 1: "Server configuration error. Please contact support."

**Cause**: `NEXT_PUBLIC_SITE_URL` is not set or contains localhost in production.

**Solution**: 
- Set `NEXT_PUBLIC_SITE_URL=https://dominatelocalleadsai.sliplane.app` in Sliplane environment variables
- Redeploy the application

### Issue 2: "AuthApiError: Invalid Refresh Token: Refresh Token Not Found"

**Cause**: Middleware was trying to authenticate users on public routes.

**Solution**: 
- This is fixed in the middleware update
- The `/forgot-password` route now bypasses authentication checks
- Refresh token errors are handled gracefully

### Issue 3: "NEXT_REDIRECT" errors in logs

**Cause**: Next.js redirects were being caught and logged as errors.

**Solution**: 
- Error handling has been improved to not log NEXT_REDIRECT as unexpected errors
- These are now recognized as normal Next.js behavior

## Fallback Mechanisms

The application now includes automatic fallbacks:

### Environment Variable Fallback
If `NEXT_PUBLIC_SITE_URL` is not set in production:
- The application will use `https://dominatelocalleadsai.sliplane.app` as a fallback
- Warning messages will be logged to help with debugging
- The functionality will continue to work

### Authentication Error Handling
- Invalid refresh tokens in middleware are handled gracefully
- Public routes (`/login`, `/signup`, `/auth`, `/forgot-password`) bypass authentication
- Users can access forgot password functionality without valid sessions

## Testing Checklist

After deployment, verify the following:

- [ ] Visit `https://dominatelocalleadsai.sliplane.app/forgot-password`
- [ ] Enter a valid email address
- [ ] Submit the form
- [ ] Verify no "Server configuration error" message appears
- [ ] Check that success message appears
- [ ] Monitor production logs for any remaining errors

## Security Considerations

1. **Environment Variables**: Never commit actual environment variable values to version control
2. **HTTPS Only**: Ensure all production URLs use HTTPS
3. **Secure Secrets**: Use strong, unique values for all secret environment variables
4. **Regular Rotation**: Rotate authentication keys and secrets regularly

## Support

If issues persist after following this guide:

1. Check Sliplane deployment logs for environment variable warnings
2. Verify all required environment variables are set in Sliplane
3. Ensure domain configuration matches the production URL
4. Monitor application logs for specific error messages