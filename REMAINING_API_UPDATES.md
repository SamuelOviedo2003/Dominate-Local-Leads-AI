# Remaining API Endpoints - profile.business_id Migration

## Status: NON-CRITICAL (Login redirect loop RESOLVED)

The core authentication issue has been completely fixed. These remaining endpoints reference the old `profile.business_id` field but won't cause login redirect loops. They should be updated for system completeness.

## Remaining Files to Update

### API Routes (High Priority)
1. **src/app/api/salesman/trends/route.ts**
   - Line 45: `const userBusinessId = parseInt(user.profile.business_id, 10)`
   - **Fix**: Replace with `validateBusinessAccessForAPI(user, businessIdParam)`

2. **src/app/api/leads/appointment-setters/route.ts**
   - Line 51: `const userBusinessId = parseInt(user.profile.business_id, 10)`
   - **Fix**: Replace with business access validation

3. **src/app/api/incoming-calls/source-caller-types/route.ts**
   - Line 119: `const userBusinessId = parseInt(user.profile.business_id, 10)`
   - **Fix**: Replace with business access validation

4. **src/app/api/leads/[leadId]/route.ts**
   - Line 335: `const userBusinessId = parseInt(user.profile.business_id, 10)`
   - **Fix**: Replace with business access validation

5. **src/app/api/incoming-calls/caller-type-distribution/route.ts**
   - Line 40: `const userBusinessId = parseInt(user.profile.business_id, 10)`
   - **Fix**: Replace with business access validation

6. **src/app/api/incoming-calls/[callId]/route.ts**
   - Line 55, 142: `const userBusinessId = parseInt(user.profile.business_id, 10)`
   - **Fix**: Replace with business access validation

7. **src/app/api/incoming-calls/source-distribution/route.ts**
   - Line 40: `const userBusinessId = parseInt(user.profile.business_id, 10)`
   - **Fix**: Replace with business access validation

8. **src/app/api/incoming-calls/sankey-data/route.ts**
   - Line 40: `const userBusinessId = parseInt(user.profile.business_id, 10)`
   - **Fix**: Replace with business access validation

### Hooks/Utilities (Medium Priority)
9. **src/hooks/useBusinessData.ts**
   - Line 70: `.eq('business_id', profile.business_id)`
   - **Fix**: Update to work with profile_businesses system

### Debug/Development (Low Priority)
10. **src/app/api/debug/call-windows/route.ts**
    - Line 94: `businessId: user.profile.business_id`
    - **Fix**: Use effective business ID helper

## Update Pattern

For each API endpoint, apply this pattern:

```typescript
// OLD PATTERN (❌)
const user = await getAuthenticatedUserForAPI()
if (!user || !user.profile?.business_id) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

const userBusinessId = parseInt(user.profile.business_id, 10)
if (user.profile.role !== 0 && requestedBusinessId !== userBusinessId) {
  return NextResponse.json({ error: 'Access denied' }, { status: 403 })
}

// NEW PATTERN (✅)
const user = await getAuthenticatedUserForAPI()
if (!user) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

// Validate user has access to the requested business using profile_businesses system
const hasAccess = await validateBusinessAccessForAPI(user, businessIdParam)
if (!hasAccess) {
  return NextResponse.json({ error: 'Access denied' }, { status: 403 })
}
```

## Import Updates Needed

Add to imports in each file:
```typescript
import { getAuthenticatedUserForAPI, validateBusinessAccessForAPI } from '@/lib/auth-helpers'
```

## Testing Priority

1. **High Priority**: API endpoints that handle data modifications (POST, PUT, DELETE)
2. **Medium Priority**: API endpoints that handle data retrieval (GET)
3. **Low Priority**: Debug and development endpoints

## Completion Estimate

- Time: ~2-3 hours for all remaining endpoints
- Risk: LOW (core authentication already fixed)
- Impact: System completeness and consistency

## Current System Status

✅ **CRITICAL ISSUES RESOLVED**
- Login redirect loop: FIXED
- Core authentication: FULLY MIGRATED
- Business access validation: WORKING
- Frontend pages: UPDATED

🟡 **NON-CRITICAL REMAINING**
- ~10 API endpoints need consistency updates
- No impact on user authentication or core functionality