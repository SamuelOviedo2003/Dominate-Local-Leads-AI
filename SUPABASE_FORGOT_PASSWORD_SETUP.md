# Supabase Forgot Password Configuration Guide

This document outlines the required Supabase Dashboard configuration for the complete forgot password feature implementation.

## Overview

The forgot password feature implements a secure PKCE-based flow with:
- Neutral success messages to prevent account enumeration
- Modern `exchangeCodeForSession` approach
- Direct redirect to password reset page
- Comprehensive error handling and security measures

## Required Supabase Dashboard Configuration

### 1. Authentication Settings

Navigate to **Authentication > Settings** in your Supabase Dashboard:

#### Site URL Configuration
```
Site URL: https://dominatelocalleadsai.sliplane.app
```
- **Development**: `http://localhost:3001`
- **Staging**: `https://your-staging-domain.com` (if applicable)
- **Production**: `https://dominatelocalleadsai.sliplane.app`

**Important**: Use exact URLs without trailing slashes.

#### Redirect URLs Configuration
Add the following to **Redirect URLs** (one per line):

**Development:**
```
http://localhost:3001/auth/reset-password
```

**Staging:**
```
https://your-staging-domain.com/auth/reset-password
```

**Production:**
```
https://dominatelocalleadsai.sliplane.app/auth/reset-password
```

**Security Notes:**
- Never use wildcards in production (`*` is insecure)
- Each environment should have its exact reset URL listed
- URLs must match exactly what's configured in your application

### 2. Email Templates

Navigate to **Authentication > Email Templates**:

#### Password Recovery Email Template

**Subject**: `Reset your password`

**Body** (recommended):
```html
<h2>Reset your password</h2>
<p>Hi there,</p>
<p>You requested to reset your password for your account. Click the link below to choose a new password:</p>
<p><a href="{{ .ConfirmationURL }}">Reset your password</a></p>
<p>This link will expire in 1 hour for security reasons.</p>
<p>If you didn't request this password reset, you can safely ignore this email.</p>
<p>Best regards,<br>Your App Team</p>
```

**Key Points:**
- The `{{ .ConfirmationURL }}` will automatically point to your configured redirect URL
- Email template should be user-friendly and include security messaging
- Consider customizing with your branding

### 3. Security Settings

#### Rate Limiting
- **Password Reset Rate Limit**: Consider enabling rate limiting for password reset requests
- **Email Rate Limit**: Ensure reasonable limits to prevent spam

#### Session Configuration
- **JWT Expiry**: Set appropriate JWT token expiry (default: 1 hour)
- **Refresh Token**: Configure refresh token settings as needed

### 4. Environment Variables

Ensure these environment variables are set in your application:

```bash
# Required - Your Supabase project URL
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co

# Required - Your Supabase anon key
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Critical - Your application's base URL (used for email redirects)
NEXT_PUBLIC_SITE_URL=https://dominatelocalleadsai.sliplane.app
```

**Production Checklist:**
- [ ] `NEXT_PUBLIC_SITE_URL` matches your production domain
- [ ] No `localhost` references in production environment variables
- [ ] All URLs use HTTPS in production

## Implementation Flow

### 1. User Requests Password Reset
1. User enters email on `/forgot-password` page
2. System calls `supabase.auth.resetPasswordForEmail(email, { redirectTo: '/auth/reset-password' })`
3. Neutral success message shown regardless of email existence

### 2. Email Link Processing
1. User clicks link in email
2. Supabase redirects to: `https://dominatelocalleadsai.sliplane.app/auth/reset-password?code=recovery_code`
3. Application extracts code and exchanges for session using `exchangeCodeForSession(code)`

### 3. Password Update
1. User enters new password with strength validation
2. System calls `supabase.auth.updateUser({ password: newPassword })`
3. Success redirects to dashboard with active session

## Security Features Implemented

### Account Enumeration Prevention
- Same success message for all email addresses
- No different behavior for existing vs non-existing accounts
- Errors logged server-side without exposing to users

### Code Security
- Uses modern PKCE flow with `exchangeCodeForSession`
- Proper session handling after code exchange
- Expired/used code detection with appropriate error messages

### Input Validation
- Client and server-side email validation
- Password strength requirements (minimum 50% strength score)
- Password confirmation matching

### Error Handling
- Graceful handling of expired links
- Proper redirect flows for various error states
- Comprehensive logging for debugging

## Testing Checklist

Before deploying to production:

- [ ] Password reset email received with correct redirect URL
- [ ] Email link successfully opens reset password page
- [ ] Code exchange creates valid session
- [ ] Password update works and redirects to dashboard
- [ ] Expired links show appropriate error message
- [ ] Used links cannot be reused
- [ ] Rate limiting works as expected
- [ ] All error states have user-friendly messages

## Deployment Notes

### Supabase Dashboard Updates

**CRITICAL FOR PRODUCTION DEPLOYMENT:**

1. **Update Site URL**:
   - Navigate to Authentication → Settings in Supabase Dashboard
   - Change Site URL from development to: `https://dominatelocalleadsai.sliplane.app`

2. **Add Production Redirect URL**:
   - In Authentication → Settings → Redirect URLs section
   - Add: `https://dominatelocalleadsai.sliplane.app/auth/reset-password`
   - **Important**: Keep the development URL `http://localhost:3001/auth/reset-password` for local testing

3. **Verify Redirect URLs Configuration**:
   - Your Redirect URLs should include both:
     - `http://localhost:3001/auth/reset-password` (for development)
     - `https://dominatelocalleadsai.sliplane.app/auth/reset-password` (for production)
   - **Do not remove the development URL** - both can coexist safely

4. **Test Email Generation**:
   - Send a test password reset email in production
   - Verify the email contains the correct production URL
   - Confirm the link opens the reset page successfully

### Application Deployment
1. Set `NEXT_PUBLIC_SITE_URL` to production domain
2. Ensure no hardcoded localhost references
3. Test complete flow in production environment
4. Monitor logs for any configuration issues

## Troubleshooting

### Common Issues

**Email not received:**
- Check Supabase email delivery settings
- Verify SMTP configuration if using custom provider
- Check spam folders

**"Invalid redirect URL" error:**
- Ensure redirect URL is exactly listed in Supabase Dashboard
- Verify no typos or extra characters in URLs
- Check that HTTPS is used in production

**Code exchange fails:**
- Verify code parameter is present in URL
- Check that link hasn't expired (default: 1 hour)
- Ensure link hasn't been used already

**Session not created:**
- Check browser developer tools for errors
- Verify Supabase client configuration
- Ensure cookies are enabled

## Support

If you encounter issues:
1. Check browser developer console for client errors
2. Review server logs for detailed error messages
3. Verify Supabase Dashboard configuration matches this guide
4. Test with a fresh email link to eliminate cached issues

---

**Last Updated**: $(date +'%Y-%m-%d')
**Implementation Version**: 1.0.0