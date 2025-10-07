# Business Switching - Technical Implementation

**Product Documentation:** [../Tasks/business-switching.md](../Tasks/business-switching.md)

## File Locations

- `/src/contexts/BusinessContext.tsx` - Business context state management
- `/src/lib/permalink-navigation.ts` - URL navigation helpers
- `/src/app/api/user/switch-business/route.ts` - Business switch API
- `/src/components/BusinessSwitcher.tsx` - Business selection dropdown

## URL Structure

Pattern: `/{business_id}/{permalink}/{section}`

Example: `/1234/hard-roof/dashboard`

## Key Functions

### useBusinessSwitcher Hook
```typescript
// File: /src/lib/permalink-navigation.ts
export function useBusinessSwitcher() {
  const router = useRouter()
  const pathname = usePathname()
  const { updateBusinessId } = useBusinessContext()

  const switchBusiness = async (targetBusiness: Business) => {
    // Prevent concurrent switches
    if (isSwitching) return

    try {
      setIsSwitching(true)

      // Update database
      await fetch('/api/user/switch-business', {
        method: 'POST',
        body: JSON.stringify({ businessId: targetBusiness.business_id })
      })

      // Update context
      updateBusinessId(targetBusiness.business_id)

      // Determine target page based on current location
      const targetPage = determineTargetPageForBusinessSwitch(pathname)

      // Build new URL
      const newUrl = `/${targetBusiness.business_id}/${targetBusiness.permalink}${targetPage}`

      // Navigate
      router.push(newUrl)
    } finally {
      setIsSwitching(false)
    }
  }

  return { switchBusiness, isSwitching }
}
```

### determineTargetPageForBusinessSwitch
```typescript
export function determineTargetPageForBusinessSwitch(currentPath: string): string {
  // Lead-specific pages redirect to New Leads
  if (currentPath.includes('/lead-details/') ||
      currentPath.includes('/actions/') ||
      currentPath.includes('/property-details/')) {
    return '/new-leads'
  }

  // Extract current section and maintain it
  if (currentPath.includes('/dashboard')) return '/dashboard'
  if (currentPath.includes('/bookings')) return '/bookings'
  if (currentPath.includes('/incoming-calls')) return '/incoming-calls'

  // Default to new-leads
  return '/new-leads'
}
```

## Database Operations

### Update User's Business Context
```sql
UPDATE profiles
SET business_id = $newBusinessId,
    updated_at = NOW()
WHERE id = $userId;
```

### Validate Business Access
```typescript
async function validateBusinessAccess(userId: string, businessId: number): Promise<boolean> {
  const profile = await getProfile(userId)

  // Super Admin can access any business
  if (profile.role === 0) return true

  // Regular user must have assignment
  const { data } = await supabase
    .from('profile_businesses')
    .select('business_id')
    .eq('profile_id', userId)
    .eq('business_id', businessId)
    .single()

  return !!data
}
```

## State Management

### BusinessContext Provider
```typescript
interface BusinessContextType {
  businessId: number | null
  businesses: Business[]
  updateBusinessId: (id: number) => void
  isLoading: boolean
}

export function BusinessContextProvider({ children, initialData }) {
  const [businessId, setBusinessId] = useState(initialData?.businessId)
  const [businesses, setBusinesses] = useState(initialData?.businesses || [])

  const updateBusinessId = useCallback((id: number) => {
    setBusinessId(id)
  }, [])

  return (
    <BusinessContext.Provider value={{ businessId, businesses, updateBusinessId, isLoading }}>
      {children}
    </BusinessContext.Provider>
  )
}
```

## API Endpoint

### POST /api/user/switch-business
```typescript
export async function POST(request: Request) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { businessId } = await request.json()

  // Validate access
  const hasAccess = await validateBusinessAccess(user.id, businessId)
  if (!hasAccess) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }

  // Update profile
  await supabase
    .from('profiles')
    .update({ business_id: businessId })
    .eq('id', user.id)

  return NextResponse.json({ success: true, businessId })
}
```

## Race Condition Prevention

```typescript
let switchOperation: Promise<void> | null = null

async function switchBusiness(business: Business) {
  // Wait for any in-progress switch
  if (switchOperation) {
    await switchOperation
  }

  // Start new switch operation
  switchOperation = performSwitch(business)

  try {
    await switchOperation
  } finally {
    switchOperation = null
  }
}
```

## URL Synchronization

The system ensures URL always matches business context:

1. **Business switch**: URL updates immediately via `router.push()`
2. **URL change**: Layout validates business_id and updates context
3. **Page refresh**: Layout reads business_id from URL params
4. **Back/forward**: Browser history preserves business context
