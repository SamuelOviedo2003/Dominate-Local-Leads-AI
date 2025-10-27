# Supabase Email Configuration Guide

## Issue

Email verification links are using `localhost:3000` instead of the production URL `https://dominatelocalleadsai.sliplane.app`.

## Root Cause

Supabase email templates are configured with a default redirect URL that points to `localhost:3000`. This must be updated in the Supabase Dashboard.

## Security Note: Access Token in URL

**Is it secure?**

✅ **YES** - The access token appearing in the confirmation URL is expected Supabase behavior and is secure:

1. **One-time use**: Tokens are single-use and expire quickly (typically 1 hour)
2. **HTTPS only**: Tokens are transmitted over encrypted HTTPS
3. **Properly handled**: Your `/auth/confirm` route exchanges the token for a secure cookie-based session
4. **Cleaned from URL**: After confirmation, users are redirected to a clean URL without the token

The token is never stored in the URL history because it's immediately processed and redirected.

## Solution

### Step 1: Update Supabase Site URL

1. Go to **Supabase Dashboard**: https://supabase.com/dashboard
2. Select your project
3. Navigate to **Settings** → **API**
4. Find **Site URL** section
5. Update to: `https://dominatelocalleadsai.sliplane.app`
6. Click **Save**

### Step 2: Update Email Templates

#### Option A: Automatic Configuration (Recommended)

The email templates should automatically use the Site URL you set in Step 1. Verify by:

1. Go to **Authentication** → **Email Templates**
2. Check the **Confirm signup** template
3. Look for `{{ .ConfirmationURL }}` - this should now use your production URL

#### Option B: Manual Template Update (If needed)

If templates still show localhost, update them manually:

1. Go to **Authentication** → **Email Templates**
2. Select **Confirm signup** template
3. Find the confirmation URL line (usually looks like):
   ```html
   <a href="{{ .ConfirmationURL }}">Confirm your email</a>
   ```
4. If it's hardcoded to localhost, replace with:
   ```html
   <a href="https://dominatelocalleadsai.sliplane.app/auth/confirm?token_hash={{ .TokenHash }}&type=email">Confirm your email</a>
   ```
5. Click **Save**

#### Templates to Update

Update these email templates if they use localhost:

1. **Confirm signup** - For new user registrations
2. **Invite user** - For admin-invited users
3. **Magic link** - For passwordless login (if used)
4. **Change email address** - For email change confirmations

### Step 3: Update Redirect URLs in Supabase

1. Go to **Authentication** → **URL Configuration**
2. Update **Redirect URLs**:
   - Add: `https://dominatelocalleadsai.sliplane.app/**`
   - Add: `https://dominatelocalleadsai.sliplane.app/auth/confirm`
   - Add: `https://dominatelocalleadsai.sliplane.app/dashboard`
3. **Remove** any localhost URLs for production (keep them for local development if needed)
4. Click **Save**

### Step 4: Update Environment Variables (Already Done ✓)

Your `.env.local` already has the correct configuration:

```env
NEXT_PUBLIC_SITE_URL=https://dominatelocalleadsai.sliplane.app
```

This ensures the application code uses the correct URL when calling Supabase APIs.

### Step 5: Test Email Verification

1. **Resend verification email** using the super admin panel
2. **Check your inbox** for the new email
3. **Verify the link** should now show:
   ```
   https://dominatelocalleadsai.sliplane.app/auth/confirm?token_hash=...&type=email
   ```
4. **Click the link** - Should redirect to dashboard after successful confirmation
5. **Check browser** - URL should be clean (no tokens) after redirect

## Troubleshooting

### Issue: Email still shows localhost

**Solution**:
- Clear Supabase dashboard cache (hard refresh with Cmd+Shift+R or Ctrl+Shift+R)
- Wait 5 minutes for Supabase to propagate changes
- Double-check Site URL in Settings → API
- Verify Redirect URLs include your production domain

### Issue: "Safari can't connect to the server"

**Cause**: The email template is still using `localhost:3000`

**Solution**:
- Follow Step 1 and Step 2 above to update Site URL and email templates
- Test with a new email verification request

### Issue: Token visible in URL after confirmation

**Expected**: The token appears briefly during redirect (1-2 seconds)

**If persists**: Check that `/auth/confirm` route is properly redirecting to `/dashboard` or `/login`

### Issue: "Invalid or expired confirmation link"

**Causes**:
1. Token has expired (tokens expire after 1 hour)
2. Token was already used (one-time use)
3. Email template format is incorrect

**Solution**:
- Resend verification email from admin panel
- Ensure email template uses `{{ .ConfirmationURL }}` or correct format
- Check Supabase logs for specific error

## Production Checklist

Before going live, verify:

- [ ] Site URL set to production domain in Supabase Dashboard
- [ ] All email templates use `{{ .ConfirmationURL }}` or production domain
- [ ] Redirect URLs include all production URLs
- [ ] Environment variable `NEXT_PUBLIC_SITE_URL` is correct
- [ ] Test email verification end-to-end in production
- [ ] Verify tokens are cleared from URL after confirmation
- [ ] Check that HTTPS is enforced (no HTTP redirects)

## Environment-Specific Configuration

### Development (localhost:3000)
```env
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

**Supabase Dashboard**:
- Redirect URLs: `http://localhost:3000/**`

### Production (Sliplane)
```env
NEXT_PUBLIC_SITE_URL=https://dominatelocalleadsai.sliplane.app
```

**Supabase Dashboard**:
- Redirect URLs: `https://dominatelocalleadsai.sliplane.app/**`

### Multiple Environments

If you have staging and production:

1. **Use separate Supabase projects** for each environment (recommended)
2. **OR** add multiple redirect URLs in single project:
   - `https://staging.dominatelocalleadsai.sliplane.app/**`
   - `https://dominatelocalleadsai.sliplane.app/**`

## Security Best Practices

1. **HTTPS Only**: Never use HTTP in production redirect URLs
2. **Specific Paths**: Use specific paths instead of wildcards when possible
3. **Token Handling**: Never log or store access tokens
4. **Cookie-Based Auth**: After confirmation, use secure cookies (already implemented)
5. **Token Expiry**: Keep default 1-hour expiry for security

## Related Documentation

- [Supabase Email Templates](https://supabase.com/docs/guides/auth/auth-email-templates)
- [Supabase URL Configuration](https://supabase.com/docs/guides/auth/redirect-urls)
- [Auth Confirmation Route](../src/app/auth/confirm/route.ts)

## Support

If issues persist:
1. Check Supabase logs in Dashboard → Logs → Auth
2. Check browser console for errors
3. Verify network requests in browser DevTools
4. Test with different browsers
5. Contact Supabase support if needed
