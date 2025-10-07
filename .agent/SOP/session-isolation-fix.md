# SOP: Session Isolation Fix

## Problem Description

Users reported seeing incorrect usernames and business data across different browsers and devices. For example:
- User logs in as "mario" on Safari
- System displays username "oviedosamuel" instead
- Business data shows incorrect company information

## Symptoms

- Wrong username displayed in header dropdown
- Incorrect business context after login
- Business data mixing between users
- Session data persisting across different devices
- Authentication state showing wrong user information

## Root Cause Analysis

The system initially used shared cookie-based session storage (`sb-xxxx-auth-token` cookies) that could be accessed across different browser instances on the same machine. This led to:

1. **Shared Cookie Storage**: Multiple browser instances on same machine could share cookies
2. **No Device Isolation**: Sessions not properly isolated per device/browser
3. **Cache Contamination**: User data cached globally instead of request-scoped

## Solution Implemented

### 1. LocalStorage-Based Authentication (Initial Attempt)

**File Modified:** `/src/lib/supabase/client.ts`

Created custom LocalStorage adapter:
```typescript
class LocalStorageAdapter {
  private keyPrefix = 'sb-auth-token'

  async getItem(key: string): Promise<string | null> {
    return localStorage.getItem(`${this.keyPrefix}-${key}`)
  }

  async setItem(key: string, value: string): Promise<void> {
    localStorage.setItem(`${this.keyPrefix}-${key}`, value)
  }

  async removeItem(key: string): Promise<void> {
    localStorage.removeItem(`${this.keyPrefix}-${key}`)
  }
}
```

**Result:** Partial improvement but introduced cookie/localStorage conflicts.

### 2. Cookie-Based Authentication with Request-Scoped Caching (Final Solution)

**Critical Fix:** Reverted to cookie-based auth but implemented strict request-scoped caching.

**File Modified:** `/src/lib/auth-helpers-simple.ts`

```typescript
import { cache } from 'react'

// Request-scoped profile cache
export const getProfileCached = cache(async (userId: string) => {
  const supabase = await createServerClient()
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  return data
})
```

**Key Changes:**
- Used React's `cache()` for request-scoped memoization
- Eliminated global in-memory cache
- Each request gets fresh Supabase client
- No data persists between different requests

### 3. Cookie Configuration Fix

**File Modified:** `/src/lib/supabase/server.ts`

**Before:**
```typescript
cookies: {
  get(name: string) {
    return cookieStore.get(name)?.value
  }
}
```

**After:**
```typescript
cookies: {
  get(name: string) {
    // Filter only Supabase cookies
    const cookie = cookieStore.getAll()
      .filter(c => c.name.startsWith('sb-'))
      .find(c => c.name === name)
    return cookie?.value
  }
}
```

Changed from `.includes('supabase')` to `.startsWith('sb-')` for proper cookie filtering.

### 4. Server Client Configuration

**File Modified:** `/src/lib/supabase/server.ts`

Added critical configuration options:
```typescript
{
  auth: {
    persistSession: false,  // Don't persist on server
    autoRefreshToken: false, // No auto-refresh on server
    detectSessionInUrl: false // Don't detect from URL
  }
}
```

## How to Prevent Recurrence

### 1. Always Use Request-Scoped Caching

```typescript
// ✅ CORRECT: Request-scoped cache
export const getData = cache(async (id: string) => {
  return await fetchData(id)
})

// ❌ WRONG: Global cache
const cache = new Map()
export async function getData(id: string) {
  if (cache.has(id)) return cache.get(id)
  const data = await fetchData(id)
  cache.set(id, data)
  return data
}
```

### 2. Server Client Configuration

Always configure server Supabase clients with:
```typescript
{
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false
  }
}
```

### 3. Cookie Filtering

Use strict cookie filtering:
```typescript
// ✅ CORRECT
.filter(c => c.name.startsWith('sb-'))

// ❌ WRONG
.filter(c => c.name.includes('supabase'))
```

### 4. Testing Protocol

**Multi-Browser Test:**
1. Login as User A in Chrome
2. Login as User B in Safari
3. Verify no username overlap
4. Check business context isolation
5. Review debug logs for user IDs

**Session Persistence Test:**
1. Login as user
2. Close browser completely
3. Reopen and check session
4. Verify correct user data
5. No cross-contamination

## How to Diagnose Similar Issues

### 1. Check Browser Console Logs

Look for authentication debug logs:
```javascript
[DEBUG][AUTH][tab_abc123][U:user1][JWT:eyJhbGci...] Authentication successful
```

**Red Flags:**
- Different user IDs in same tab session
- JWT tokens switching between requests
- Business context changing unexpectedly

### 2. Verify Cookie Configuration

```bash
# Check Supabase cookies in browser DevTools
# Should see cookies like: sb-{project-id}-auth-token
# Each browser should have independent cookies
```

### 3. Test Request-Scoped Caching

Add debug logging:
```typescript
export const getProfileCached = cache(async (userId: string) => {
  console.log(`[CACHE] Fetching profile for user: ${userId}`)
  const data = await fetchProfile(userId)
  console.log(`[CACHE] Profile retrieved:`, data.email)
  return data
})
```

Should see ONE log per request, not multiple.

### 4. Monitor Server Logs

```bash
# Check for session anomalies
grep "user_id" logs.txt | sort | uniq -c

# Look for:
# - Same request handling multiple user IDs
# - Rapid user_id switches
# - Cross-business data access
```

## Verification Steps

After implementing the fix:

1. **Clear All Browser Data**
   - Cookies, localStorage, sessionStorage
   - Force fresh session creation

2. **Multi-Device Test**
   - Login on Device A as User 1
   - Login on Device B as User 2
   - Verify complete isolation

3. **Business Context Test**
   - Super admin switches businesses rapidly
   - Verify correct business_id in all requests
   - Check no data bleeding between businesses

4. **Production Cache Test**
   - Deploy to production
   - Clear cache/CDN
   - Verify sessions survive cache flush
   - No "Auth session missing!" errors

## Related Files

- `/src/lib/auth-helpers-simple.ts` - Request-scoped caching
- `/src/lib/supabase/server.ts` - Server client configuration
- `/src/lib/supabase/client.ts` - Client configuration
- `/src/middleware.ts` - Route protection
- `SESSION_ISOLATION_IMPLEMENTATION_GUIDE.md` - Detailed implementation notes

## References

- Session Isolation Implementation Guide (root directory)
- React `cache()` documentation
- Supabase SSR documentation
