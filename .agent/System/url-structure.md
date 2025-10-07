# URL Structure - Technical Implementation

**Product Documentation:** [../Tasks/url-structure.md](../Tasks/url-structure.md)

## Route Structure

```
src/app/[business_id]/[permalink]/
├── layout.tsx (validates business_id and permalink)
├── dashboard/
│   └── page.tsx
├── new-leads/
│   └── page.tsx
├── lead-details/
│   └── [leadId]/
│       └── page.tsx
├── actions/
│   └── [leadId]/
│       └── page.tsx
├── property-details/
│   └── [leadId]/
│       └── page.tsx
├── bookings/
│   └── page.tsx
└── incoming-calls/
    └── page.tsx
```

## Layout Validation

```typescript
// File: /src/app/[business_id]/[permalink]/layout.tsx
export default async function PermalinkLayout({
  children,
  params
}: {
  children: React.ReactNode
  params: { business_id: string; permalink: string }
}) {
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

  // Get authenticated user
  const user = await getAuthenticatedUserFromRequest()

  if (!user) {
    redirect('/login')
  }

  // Validate user has access to this business
  const hasAccess = user.profile?.role === 0 ||
    user.accessibleBusinesses.some(b => b.business_id === businessId)

  if (!hasAccess) {
    // Redirect to first accessible business
    const firstBusiness = user.accessibleBusinesses[0]
    redirect(`/${firstBusiness.business_id}/${firstBusiness.permalink}/dashboard`)
  }

  return (
    <AuthDataProvider initialData={user}>
      <BusinessContextProvider initialBusinessId={businessId}>
        <UniversalHeader />
        {children}
      </BusinessContextProvider>
    </AuthDataProvider>
  )
}
```

## URL Helper Functions

```typescript
// File: /src/lib/permalink-navigation.ts

export function buildPermalinkUrl(
  businessId: number,
  permalink: string,
  section: string,
  params?: Record<string, string>
): string {
  let url = `/${businessId}/${permalink}${section}`

  if (params) {
    const searchParams = new URLSearchParams(params)
    url += `?${searchParams.toString()}`
  }

  return url
}

export function parsePermalinkUrl(pathname: string) {
  const parts = pathname.split('/').filter(Boolean)

  return {
    businessId: parseInt(parts[0]) || null,
    permalink: parts[1] || null,
    section: parts[2] || null,
    params: parts.slice(3)
  }
}
```

## Database Lookup

```typescript
export const getBusinessByIdCached = cache(async (businessId: number) => {
  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from('business_clients')
    .select('*')
    .eq('business_id', businessId)
    .single()

  return data
})
```
