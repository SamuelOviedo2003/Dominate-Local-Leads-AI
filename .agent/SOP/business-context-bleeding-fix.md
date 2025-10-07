# SOP: Business Context Bleeding Fix

## Problem Description

In production environment, users experienced business data bleeding across different businesses:
- Super admin switches from Business A to Business B
- Data still shows Business A information
- Concurrent requests mix business_id values
- Cache returns stale business context

## Symptoms

- Wrong business logo displayed after switching
- Lead data from previous business shows briefly
- Metrics display incorrect business numbers
- URL shows correct business_id but data is wrong
- Multiple users see each other's business data

## Root Cause Analysis

Three primary causes identified:

### 1. Global Cache Contamination
- Business data cached globally without user scoping
- Cache key only used business_id (not user_id)
- Multiple users shared same cached data

### 2. Race Conditions During Business Switch
- Multiple API calls triggered during switch
- Some used old business_id, some used new
- No atomicity in business context updates

### 3. Stale Context in React Components
- BusinessContext not updating immediately
- Components using old context during transition
- URL changed but context lagged behind

## Solution Implemented

### 1. Request-Scoped Business Cache

**File Modified:** `/src/lib/supabase/server-optimized.ts`

```typescript
import { cache } from 'react'

// Request-scoped cache with user context
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

### 2. Atomic Business Switching

**File Modified:** `/src/lib/permalink-navigation.ts`

```typescript
let switchOperation: Promise<void> | null = null

export function useBusinessSwitcher() {
  const switchBusiness = async (business: Business) => {
    // Prevent concurrent switches
    if (switchOperation) {
      await switchOperation
    }

    switchOperation = performSwitch(business)

    try {
      await switchOperation
    } finally {
      switchOperation = null
    }
  }

  return { switchBusiness }
}

async function performSwitch(business: Business) {
  // 1. Update database first
  await fetch('/api/user/switch-business', {
    method: 'POST',
    body: JSON.stringify({ businessId: business.business_id })
  })

  // 2. Update context
  updateBusinessId(business.business_id)

  // 3. Navigate to new URL
  const targetPage = determineTargetPageForBusinessSwitch(pathname)
  const newUrl = `/${business.business_id}/${business.permalink}${targetPage}`
  router.push(newUrl)
}
```

### 3. Business Context Validation in Layout

**File Modified:** `/src/app/[business_id]/[permalink]/layout.tsx`

```typescript
export default async function PermalinkLayout({ params }) {
  const businessId = parseInt(params.business_id)
  const permalink = params.permalink

  // Validate business exists
  const business = await getBusinessByIdCached(businessId)
  if (!business) {
    notFound()
  }

  // Validate permalink matches business_id
  if (business.permalink !== permalink) {
    notFound()
  }

  // Validate user access
  const user = await getAuthenticatedUserFromRequest()
  const hasAccess = validateBusinessAccess(user, businessId)

  if (!hasAccess) {
    redirect(`/${firstBusiness.business_id}/${firstBusiness.permalink}/dashboard`)
  }

  return (
    <AuthDataProvider initialData={user}>
      <BusinessContextProvider initialBusinessId={businessId}>
        {children}
      </BusinessContextProvider>
    </AuthDataProvider>
  )
}
```

### 4. API Business Validation

**Pattern Applied to All API Routes:**

```typescript
export async function GET(request: Request) {
  // 1. Authenticate user
  const user = await getAuthenticatedUserFromRequest()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Get business_id from query
  const { searchParams } = new URL(request.url)
  const businessId = parseInt(searchParams.get('business_id') || '')

  // 3. Validate access
  const hasAccess = user.profile?.role === 0 ||
    user.accessibleBusinesses.some(b => b.business_id === businessId)

  if (!hasAccess) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }

  // 4. Query with business_id filter
  const { data } = await supabase
    .from('leads')
    .select('*')
    .eq('business_id', businessId)

  return NextResponse.json({ data })
}
```

## How to Prevent Recurrence

### 1. Always Validate Business Access in APIs

```typescript
// ✅ CORRECT: Validate business_id
const hasAccess = validateBusinessAccess(user, businessId)
if (!hasAccess) return error403()

const data = await query().eq('business_id', businessId)

// ❌ WRONG: Trust client business_id
const data = await query().eq('business_id', businessId)
```

### 2. Use Atomic Business Switching

```typescript
// ✅ CORRECT: Sequential operations
await updateDatabase()
await updateContext()
await navigate()

// ❌ WRONG: Parallel operations
Promise.all([updateDatabase(), updateContext(), navigate()])
```

### 3. Implement Request-Scoped Caching

```typescript
// ✅ CORRECT: Request-scoped
export const getBusinessData = cache(async (id) => { ... })

// ❌ WRONG: Global cache
const globalCache = new Map()
export async function getBusinessData(id) { ... }
```

### 4. Validate URL Parameters

```typescript
// ✅ CORRECT: Validate both business_id and permalink
if (business.permalink !== params.permalink) {
  notFound()
}

// ❌ WRONG: Only check business_id
const business = await getBusinessById(params.business_id)
```

## How to Diagnose Similar Issues

### 1. Check API Request Logs

```bash
# Look for business_id in API logs
grep "business_id" api-logs.txt

# Red flags:
# - Requests with mismatched business_id values
# - User accessing unauthorized business_id
# - Same timestamp, different business_id
```

### 2. Monitor Business Context Changes

Add debug logging:
```typescript
export function BusinessContextProvider({ initialBusinessId, children }) {
  const [businessId, setBusinessId] = useState(initialBusinessId)

  useEffect(() => {
    console.log('[BusinessContext] Business ID changed:', businessId)
  }, [businessId])

  // ...
}
```

### 3. Verify Database Updates

```sql
-- Check profile business_id update history
SELECT id, business_id, updated_at
FROM profiles
WHERE id = 'user-id'
ORDER BY updated_at DESC
LIMIT 10;
```

### 4. Test Rapid Business Switching

```javascript
// Automated test
for (let i = 0; i < 10; i++) {
  await switchBusiness(businessA)
  await delay(100)
  await switchBusiness(businessB)
  await delay(100)

  // Verify correct business data
  const data = await fetchData()
  assert(data.business_id === businessB.business_id)
}
```

## Verification Steps

1. **Single User Test**
   - Login as super admin
   - Switch between 3+ businesses rapidly
   - Verify correct data for each business
   - No stale data displayed

2. **Concurrent User Test**
   - User A switches to Business 1
   - User B switches to Business 2 simultaneously
   - Verify no data overlap
   - Each sees correct business

3. **Network Latency Test**
   - Throttle network to slow 3G
   - Switch businesses
   - Verify loading states
   - Ensure atomic updates even with delays

4. **Production Cache Test**
   - Deploy to production
   - Clear cache/CDN
   - Switch businesses
   - Verify correct data loads

## Related Files

- `/src/contexts/BusinessContext.tsx` - Business state management
- `/src/lib/permalink-navigation.ts` - Business switching logic
- `/src/app/[business_id]/[permalink]/layout.tsx` - Layout validation
- `/src/app/api/user/switch-business/route.ts` - Business switch API
- `SESSION_BLEEDING_FIX_GUIDE.md` - Detailed fix guide

## Prevention Checklist

Before deploying business-related features:

- [ ] All API routes validate business_id access
- [ ] Database queries include business_id filter
- [ ] Business switching is atomic (sequential)
- [ ] Request-scoped caching used (no global cache)
- [ ] URL params validated against database
- [ ] Loading states prevent stale data display
- [ ] Multi-user testing completed
- [ ] Rapid switching tested
