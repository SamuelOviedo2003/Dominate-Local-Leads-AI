# Property Details - Technical Implementation

**Product Documentation:** [../Tasks/property-details.md](../Tasks/property-details.md)

## File Locations
- `/src/app/[business_id]/[permalink]/property-details/[leadId]/page.tsx` - Property details page
- `/src/components/features/leads/PropertyInformation.tsx` - Property info component

## Database Schema

```sql
CREATE TABLE clients (
  account_id TEXT PRIMARY KEY,
  full_address TEXT,
  house_value NUMERIC(12, 2),
  house_url TEXT,
  distance_meters INTEGER,
  duration_seconds INTEGER,
  roof_age INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Component Structure

```typescript
export function PropertyInformation({ property }: { property: Property }) {
  return (
    <div className="bg-white rounded-lg shadow p-6 space-y-4">
      <h2 className="text-xl font-semibold">Property Details</h2>

      <div className="aspect-video w-full">
        <img
          src={property.house_url || '/images/noIMAGE.png'}
          alt="Property"
          className="w-full h-full object-cover rounded"
          onError={(e) => {
            e.currentTarget.src = '/images/noIMAGE.png'
          }}
        />
      </div>

      <div className="space-y-2">
        <DetailRow label="Home Value" value={formatCurrency(property.house_value)} />
        <DetailRow label="Address" value={property.full_address} />
        <DetailRow label="Distance" value={formatDistance(property.distance_meters)} />
        <DetailRow label="Drive Time" value={formatDuration(property.duration_seconds)} />
        {property.roof_age && (
          <DetailRow label="Roof Age" value={`${property.roof_age} years`} />
        )}
      </div>
    </div>
  )
}
```

## TypeScript Types

```typescript
export interface Property {
  account_id: string
  full_address: string
  house_value: number
  house_url: string | null
  distance_meters: number
  duration_seconds: number
  roof_age: number | null
  created_at: string
}
```
