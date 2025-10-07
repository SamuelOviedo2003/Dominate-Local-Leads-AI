# Bookings - Technical Implementation

**Product Documentation:** [../Tasks/bookings.md](../Tasks/bookings.md)

## File Locations
- `/src/app/(dashboard)/bookings/page.tsx` - Bookings page
- `/src/app/(dashboard)/bookings/client.tsx` - Bookings client component
- `/src/app/api/bookings/metrics/route.ts` - Booking metrics API
- `/src/app/api/bookings/leads/route.ts` - Booked leads list API

## Database Queries

Bookings are identified by leads with `start_time IS NOT NULL`.

### GET /api/bookings/metrics
```typescript
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const businessId = parseInt(searchParams.get('business_id') || '')
  const days = parseInt(searchParams.get('days') || '30')

  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  const { data } = await supabase
    .from('leads')
    .select('lead_id, contacted, start_time')
    .eq('business_id', businessId)
    .gte('created_at', startDate.toISOString())

  const booked = data?.filter(l => l.start_time).length || 0
  const contacted = data?.filter(l => l.contacted).length || 0

  return NextResponse.json({
    totalBookings: booked,
    bookingRate: contacted > 0 ? (booked / contacted) * 100 : 0
  })
}
```

### GET /api/bookings/leads
```typescript
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const businessId = parseInt(searchParams.get('business_id') || '')
  const days = parseInt(searchParams.get('days') || '30')

  const { data } = await supabase
    .from('leads')
    .select('*')
    .eq('business_id', businessId)
    .not('start_time', 'is', null)
    .gte('created_at', startDate.toISOString())
    .order('start_time', { ascending: true })

  return NextResponse.json({ leads: data || [] })
}
```

## TypeScript Types

```typescript
export interface BookingMetrics {
  totalBookings: number
  bookingRate: number
}
```
