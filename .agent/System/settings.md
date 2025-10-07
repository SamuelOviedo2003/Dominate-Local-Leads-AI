# Settings - Technical Implementation

**Product Documentation:** [../Tasks/settings.md](../Tasks/settings.md)

## File Locations
- `/src/app/settings/page.tsx` - Settings server component
- `/src/app/settings/client.tsx` - Settings client component
- `/src/app/api/profile/route.ts` - Profile update API

## Layout Difference

Settings page uses unique layout WITHOUT UniversalHeader:
```typescript
// /src/app/settings/page.tsx
export default async function SettingsPage() {
  const user = await getAuthenticatedUserFromRequest()

  if (!user) {
    redirect('/login')
  }

  return <SettingsClient user={user} />
}
```

## API Endpoint

### PATCH /api/profile
```typescript
export async function PATCH(request: Request) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const updates = await request.json()

  // Update profile
  const { data, error } = await supabase
    .from('profiles')
    .update({
      full_name: updates.full_name,
      updated_at: new Date().toISOString()
    })
    .eq('id', user.id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ profile: data })
}
```

## TypeScript Types

```typescript
export interface ProfileUpdate {
  full_name?: string
}
```
