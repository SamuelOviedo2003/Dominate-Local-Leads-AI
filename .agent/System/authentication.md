# Authentication & User Management - Technical Implementation

**Product Documentation:** [../Tasks/authentication.md](../Tasks/authentication.md)

## Architecture Overview

Cookie-based authentication system using Supabase Auth with JWT tokens stored in secure HTTP-only cookies. Request-scoped caching prevents cross-user data contamination.

## File Locations

### Core Authentication Files
- `/src/lib/auth-helpers-simple.ts` - Main authentication helper functions
- `/src/lib/supabase/server.ts` - Supabase server client creation
- `/src/middleware.ts` - Route protection middleware
- `/src/app/auth/callback/route.ts` - OAuth callback handler
- `/src/app/api/auth/post-login/route.ts` - Consolidated post-login endpoint

### Authentication Components
- `/src/app/login/page.tsx` - Login page
- `/src/app/auth/signup/page.tsx` - Signup page
- `/src/components/AuthForm.tsx` - Login/signup form component
- `/src/components/UserDropdown.tsx` - User profile dropdown

### Context Providers
- `/src/contexts/BusinessContext.tsx` - Business context management
- `/src/contexts/AuthDataProvider.tsx` - Authentication data provider

## Database Schema

### profiles table
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT NOT NULL,
  full_name TEXT,
  role INTEGER DEFAULT 1, -- 0=Super Admin, 1+=Regular User
  business_id INTEGER REFERENCES business_clients(business_id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast role-based queries
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_business_id ON profiles(business_id);
```

### profile_businesses table (User-Business Assignments)
```sql
CREATE TABLE profile_businesses (
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  business_id INTEGER REFERENCES business_clients(business_id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (profile_id, business_id)
);

-- Index for fast user business lookups
CREATE INDEX idx_profile_businesses_profile_id ON profile_businesses(profile_id);
```

### business_clients table
```sql
CREATE TABLE business_clients (
  business_id SERIAL PRIMARY KEY,
  company_name TEXT NOT NULL,
  permalink TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  city TEXT,
  state TEXT,
  dashboard BOOLEAN DEFAULT false, -- Must be true to appear in switcher
  time_zone TEXT DEFAULT 'America/Los_Angeles',
  dialpad_phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_business_clients_permalink ON business_clients(permalink);
CREATE INDEX idx_business_clients_dashboard ON business_clients(dashboard);
```

## SQL Queries

### User Authentication
```sql
-- Get authenticated user with profile
SELECT u.id, u.email, p.role, p.business_id, p.full_name
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
WHERE u.id = $userId;
```

### Super Admin Business Access
```sql
-- Get ALL businesses for Super Admin (role=0)
SELECT business_id, company_name, permalink, avatar_url, city, state
FROM business_clients
WHERE dashboard = true
ORDER BY company_name;
```

### Regular User Business Access
```sql
-- Get ONLY assigned businesses for regular users
SELECT bc.business_id, bc.company_name, bc.permalink, bc.avatar_url, bc.city, bc.state
FROM profile_businesses pb
INNER JOIN business_clients bc ON pb.business_id = bc.business_id
WHERE pb.profile_id = $userId
ORDER BY bc.company_name;
```

### Validate Business Access
```sql
-- Check if user can access specific business
-- Super Admin (role=0) can access ANY business
-- Regular user must have record in profile_businesses
SELECT
  CASE
    WHEN p.role = 0 THEN true
    WHEN EXISTS (
      SELECT 1 FROM profile_businesses
      WHERE profile_id = $userId AND business_id = $businessId
    ) THEN true
    ELSE false
  END as has_access
FROM profiles p
WHERE p.id = $userId;
```

### Update User's Current Business
```sql
-- Atomically update user's active business context
UPDATE profiles
SET business_id = $newBusinessId,
    updated_at = NOW()
WHERE id = $userId;
```

## API Endpoints

### POST /api/auth/post-login
Consolidated post-login endpoint that handles all post-authentication setup.

**Request:**
```typescript
// Automatically uses cookie-based session
// No request body needed
```

**Response:**
```typescript
{
  user: {
    id: string
    email: string
    profile: {
      role: number
      business_id: number
      full_name: string
    }
  }
  accessibleBusinesses: Array<{
    business_id: number
    company_name: string
    permalink: string
    avatar_url: string
    city: string
    state: string
  }>
  redirectUrl: string // Optimal dashboard URL for user
}
```

**Implementation:**
```typescript
// File: /src/app/api/auth/post-login/route.ts
export async function POST(request: Request) {
  const supabase = await createServerClient()

  // Get authenticated user
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  // Fetch profile and accessible businesses
  const profile = await getProfile(user.id)
  const businesses = await getAccessibleBusinesses(user.id, profile.role)

  // Determine optimal redirect URL
  const redirectUrl = determineRedirectUrl(businesses, profile)

  return NextResponse.json({
    user: { id: user.id, email: user.email, profile },
    accessibleBusinesses: businesses,
    redirectUrl
  })
}
```

### GET /api/user/business-context
Get current business context for authenticated user.

**Response:**
```typescript
{
  businessId: number
  businesses: Array<BusinessInfo>
}
```

### POST /api/user/switch-business
Switch user's active business context.

**Request:**
```typescript
{
  businessId: number
}
```

**Response:**
```typescript
{
  success: boolean
  businessId: number
}
```

## TypeScript Types

```typescript
// User Profile
export interface Profile {
  id: string
  email: string
  full_name: string | null
  role: number
  business_id: number | null
  created_at: string
  updated_at: string
}

// Business Information
export interface Business {
  business_id: number
  company_name: string
  permalink: string
  avatar_url: string | null
  city: string | null
  state: string | null
  dashboard?: boolean
  time_zone?: string
}

// Authenticated User Data
export interface AuthenticatedUser {
  id: string
  email: string
  profile: Profile | null
  accessibleBusinesses: Business[]
}
```

## Authentication Flow

### Login Sequence
1. User submits credentials to Supabase Auth
2. Supabase creates session and sets cookies
3. Client calls `/api/auth/post-login`
4. Server fetches profile and accessible businesses
5. Server determines optimal redirect URL
6. Client receives data and redirects
7. AuthDataProvider caches server data
8. No additional API calls needed for initial load

### Cookie Management
```typescript
// Cookie configuration
const cookieOptions = {
  name: `sb-${project_id}-auth-token`,
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 60 * 60 * 24 * 7, // 7 days
  path: '/'
}
```

### Session Validation
```typescript
// File: /src/lib/auth-helpers-simple.ts
export async function getAuthenticatedUserFromRequest(): Promise<AuthenticatedUser | null> {
  const supabase = await createServerClient()

  // Get user from session cookie
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null

  // Fetch profile with request-scoped caching
  const profile = await getProfileCached(user.id)

  // Fetch accessible businesses based on role
  const businesses = profile.role === 0
    ? await getAllBusinesses()
    : await getUserBusinesses(user.id)

  return {
    id: user.id,
    email: user.email,
    profile,
    accessibleBusinesses: businesses
  }
}
```

## Request-Scoped Caching

```typescript
import { cache } from 'react'

// Cached profile lookup (per request)
export const getProfileCached = cache(async (userId: string) => {
  const supabase = await createServerClient()
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  return data
})

// Cached business lookup (per request)
export const getBusinessByIdCached = cache(async (businessId: number) => {
  const supabase = await createServerClient()
  const { data } = await supabase
    .from('business_clients')
    .select('*')
    .eq('business_id', businessId)
    .single()
  return data
})
```

## Middleware Protection

```typescript
// File: /src/middleware.ts
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Public routes that don't require authentication
  const publicRoutes = ['/login', '/auth/signup', '/auth/callback', '/api/health']
  if (publicRoutes.includes(pathname)) {
    return NextResponse.next()
  }

  // Check authentication
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    // Redirect to login
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|images).*)'
  ]
}
```

## Security Considerations

### Cookie Security
- HTTP-only cookies prevent XSS attacks
- Secure flag enforced in production
- SameSite=lax prevents CSRF
- Automatic expiration after 7 days

### JWT Token Validation
- Every API request validates JWT
- Token includes user ID and role
- Row Level Security (RLS) policies enforce access
- No client-side token storage

### Business Access Control
- Every request validates business_id access
- Super Admin role checked server-side
- profile_businesses junction table for regular users
- No client-side access decisions

### Session Isolation
- Request-scoped caching prevents cross-user contamination
- No global in-memory cache
- Each request gets fresh Supabase client
- Cookie-based sessions are device-isolated

## Error Handling

```typescript
// Authentication errors
try {
  const user = await getAuthenticatedUserFromRequest()
  if (!user) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    )
  }
} catch (error) {
  console.error('Auth error:', error)
  return NextResponse.json(
    { error: 'Authentication failed' },
    { status: 500 }
  )
}

// Business access errors
if (!hasBusinessAccess(user.id, businessId)) {
  return NextResponse.json(
    { error: 'Access denied to this business' },
    { status: 403 }
  )
}
```

## Performance Optimizations

### Consolidated Post-Login
- **Before**: 4 separate API calls (auth, profile, businesses, redirect)
- **After**: 1 API call with all data
- **Improvement**: 75% reduction in API calls

### Request-Scoped Caching
- Profile fetched once per request, cached for duration
- Business data cached per request
- No redundant database queries
- React `cache()` provides automatic memoization

### Database Indexes
- Primary key on business_id (O(1) lookups)
- Index on permalink for human-readable URLs
- Index on role for access control queries
- Composite index on profile_businesses

## Testing Considerations

### Test Cases
1. **Login with valid credentials**: Should set cookies and redirect
2. **Login with invalid credentials**: Should show error, no cookies
3. **Super Admin access**: Should see all businesses with dashboard=true
4. **Regular user access**: Should see only assigned businesses
5. **Unauthorized business access**: Should redirect to accessible business
6. **Session expiry**: Should logout and redirect to login
7. **Business switching**: Should update URL and context atomically
8. **Multi-device sessions**: Should maintain independent sessions

### Security Tests
1. **Cookie tampering**: Modified cookies should fail validation
2. **JWT manipulation**: Invalid JWTs should be rejected
3. **Business access bypass**: Direct business_id access should be blocked
4. **Role escalation**: Regular users can't access admin features
5. **Session fixation**: Old sessions invalidated after logout
