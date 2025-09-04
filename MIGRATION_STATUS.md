# Business Access Migration Status

## Overview
Migration from single business_id approach to profile_businesses table with RLS policies system.

## Completed Core Migration ✅

### 1. Type System Updates
- **AuthUser interface** updated to support multi-business access model
- **BusinessContext interface** added for session-based business management
- **Removed single businessData property**, replaced with accessibleBusinesses and currentBusinessId

### 2. Authentication Helpers (/src/lib/auth-helpers.ts)
- **getAuthenticatedUser()** refactored to use RLS-based approach
- **getAuthenticatedUserForAPI()** updated to populate accessibleBusinesses
- **getUserAccessibleBusinesses()** working correctly with RLS
- **validateBusinessSwitchAccess()** created to replace updateUserBusinessId()
- **Removed updateUserBusinessId()** - no longer updates profile.business_id

### 3. Session-Based Business Context (/src/contexts/BusinessContext.tsx)
- **BusinessContextProvider** created for session-based business management
- **useBusinessContext()** hook for accessing current business state
- **useCurrentBusiness()** hook for getting current business data
- **Session storage persistence** for business selection across page reloads

### 4. Business Switching API (/src/app/api/company/switch/route.ts)
- **Updated to use session-based approach** - no database profile updates
- **Uses validateBusinessSwitchAccess()** instead of manual validation
- **Works for both super admins and regular users** via RLS

### 5. Business Access API (/src/app/api/business/accessible/route.ts)
- **New endpoint** for fetching user's accessible businesses
- **Relies on RLS policies** for automatic filtering
- **Works for both super admins and regular users**

### 6. Frontend Components
- **BusinessSwitcher component** updated to use new BusinessContext
- **useCompanySwitching hook** updated to use session-based switching
- **Removed dependency on page reloads** - uses context updates

### 7. Sample API Endpoint Updates
- **leads/recent/route.ts** - Updated to use RLS approach
- **leads/metrics/route.ts** - Updated auth validation
- **dashboard/platform-spend/route.ts** - Updated business access validation

## Remaining Work Required ⚠️

### 1. Complete API Endpoint Migration
The following endpoints still need the old business access pattern updated:

**Endpoints with `user.profile.business_id` checks:**
```
/src/app/api/incoming-calls/[callId]/route.ts
/src/app/api/leads/[leadId]/route.ts
/src/app/api/incoming-calls/recent-calls/route.ts
/src/app/api/incoming-calls/source-caller-types/route.ts
/src/app/api/salesman/leads/route.ts
/src/app/api/leads/appointment-setters/route.ts
/src/app/api/debug/call-windows/route.ts
/src/app/api/salesman/trends/route.ts
/src/app/api/salesman/performance/route.ts
/src/app/api/incoming-calls/source-distribution/route.ts
/src/app/api/incoming-calls/sankey-data/route.ts
/src/app/api/incoming-calls/caller-type-distribution/route.ts
```

**Required Pattern Updates:**
```typescript
// OLD PATTERN - Remove these checks
if (!user || !user.profile?.business_id) {
  // error
}

// OLD PATTERN - Remove manual business validation  
const userBusinessId = parseInt(user.profile.business_id, 10)
if (user.profile.role !== 0 && requestedBusinessId !== userBusinessId) {
  // error
}

// NEW PATTERN - Use this instead
if (!user || !user.profile) {
  // error  
}

// NEW PATTERN - Use RLS-based validation
const hasAccess = await validateBusinessAccessForAPI(user, businessIdParam)
if (!hasAccess) {
  // error
}

// QUERY PATTERN - Let RLS handle filtering
// OLD: .eq('business_id', requestedBusinessId)  
// NEW: Let RLS policies filter automatically, or conditionally filter if businessId provided
```

### 2. Component Integration
- **Update UniversalHeader.tsx** to use new BusinessContext provider
- **Remove old CompanyContext** dependencies where applicable
- **Update any component** that uses BusinessSwitcher with old props

### 3. Application Provider Setup
- **Add BusinessContextProvider** to the root layout or app component
- **Initialize with user's accessible businesses** from server
- **Handle current business selection** on app load

### 4. Migration Testing
- **Test super admin access** - should see all businesses automatically
- **Test regular user access** - should see only assigned businesses
- **Test business switching** - should work without page reloads
- **Test API endpoints** - should respect new access model

## Migration Commands

### Update API Endpoints
Run these updates on the remaining endpoints:

1. **Import the validation function:**
```typescript
import { getAuthenticatedUserForAPI, validateBusinessAccessForAPI } from '@/lib/auth-helpers'
```

2. **Update auth check:**
```typescript
// Change from:
if (!user || !user.profile?.business_id) {

// To:
if (!user || !user.profile) {
```

3. **Update business access validation:**
```typescript
// Replace manual validation with:
const hasAccess = await validateBusinessAccessForAPI(user, businessIdParam)
if (!hasAccess) {
  return NextResponse.json(
    { error: 'Access denied - You do not have access to this business data' },
    { status: 403 }
  )
}
```

### Integration Steps
1. **Add BusinessContextProvider** to your app layout
2. **Initialize with server data** from getHeaderData()
3. **Update components** to use new BusinessContext hooks
4. **Test thoroughly** with both user types

## Benefits of New System ✨

1. **No more "No business associated with your account" errors**
2. **Super admins automatically see all businesses** via RLS
3. **Regular users see only assigned businesses** via RLS  
4. **Business switching without page reloads** via session state
5. **Simplified codebase** - less manual access checking
6. **Better security** - RLS policies handle access control
7. **Multi-business support** - users can access multiple businesses
8. **Session persistence** - business selection survives page reloads

## Critical Notes ⚠️

- **RLS policies must be working** for this system to function correctly
- **profile_businesses table must be populated** for regular users
- **Super admins (role = 0) bypass profile_businesses** and see all businesses
- **Session storage is used** for business selection persistence
- **No database updates** occur during business switching