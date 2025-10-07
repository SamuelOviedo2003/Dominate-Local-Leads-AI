# Dashboard - Technical Implementation

**Product Documentation:** [../Tasks/dashboard.md](../Tasks/dashboard.md)

## File Locations

- `/src/app/(dashboard)/dashboard/page.tsx` - Dashboard server component
- `/src/app/(dashboard)/dashboard/client.tsx` - Dashboard client component
- `/src/app/[business_id]/[permalink]/dashboard/page.tsx` - Permalink-based dashboard
- `/src/components/DashboardClientOptimized.tsx` - Optimized dashboard client
- `/src/app/api/dashboard/platform-spend/route.ts` - Platform spend API

## Database Schema

### ad_spends table
```sql
CREATE TABLE ad_spends (
  id SERIAL PRIMARY KEY,
  business_id INTEGER REFERENCES business_clients(business_id),
  platform TEXT NOT NULL, -- 'google', 'facebook', etc.
  spend NUMERIC(10, 2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ad_spends_business_created ON ad_spends(business_id, created_at);
CREATE INDEX idx_ad_spends_platform ON ad_spends(platform);
```

## API Endpoint

### GET /api/dashboard/platform-spend
```typescript
export async function GET(request: Request) {
  const supabase = await createServerClient()
  const { searchParams } = new URL(request.url)

  const businessId = parseInt(searchParams.get('business_id') || '')
  const days = parseInt(searchParams.get('days') || '30')

  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  const { data, error } = await supabase
    .from('ad_spends')
    .select('platform, spend')
    .eq('business_id', businessId)
    .gte('created_at', startDate.toISOString())
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Aggregate spend by platform
  const platformSpend = data.reduce((acc, row) => {
    const platform = normalizePlatformName(row.platform)
    acc[platform] = (acc[platform] || 0) + parseFloat(row.spend)
    return acc
  }, {} as Record<string, number>)

  const totalSpend = Object.values(platformSpend).reduce((sum, spend) => sum + spend, 0)

  return NextResponse.json({
    totalSpend,
    platforms: platformSpend,
    period: days
  })
}

function normalizePlatformName(platform: string): string {
  const lower = platform.toLowerCase()
  if (lower.includes('google')) return 'Google Ads'
  if (lower.includes('facebook') || lower.includes('fb')) return 'Facebook Ads'
  return platform
}
```

## Component Structure

### DashboardClientOptimized
```typescript
export function DashboardClientOptimized() {
  const { businessId } = useBusinessContext()
  const [timePeriod, setTimePeriod] = useState(30)
  const { data, isLoading, error } = usePlatformSpend(businessId, timePeriod)

  if (isLoading) return <LoadingSpinner />
  if (error) return <ErrorMessage error={error} />

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <TimePeriodFilter value={timePeriod} onChange={setTimePeriod} />
      </div>

      <PlatformSpendBreakdown
        totalSpend={data.totalSpend}
        platforms={data.platforms}
        period={timePeriod}
      />
    </div>
  )
}
```

### PlatformSpendBreakdown Component
```typescript
interface Props {
  totalSpend: number
  platforms: Record<string, number>
  period: number
}

export function PlatformSpendBreakdown({ totalSpend, platforms, period }: Props) {
  return (
    <div className="space-y-6">
      {/* Total Spend Display */}
      <div className="text-center">
        <div className="text-4xl font-bold text-purple-600">
          ${formatCurrency(totalSpend)}
        </div>
        <div className="text-sm text-gray-600 mt-2">
          Total platform spend
        </div>
      </div>

      {/* Individual Platform Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.entries(platforms).map(([platform, spend]) => (
          <PlatformCard
            key={platform}
            platform={platform}
            spend={spend}
          />
        ))}
      </div>
    </div>
  )
}
```

### PlatformCard Component
```typescript
interface PlatformCardProps {
  platform: string
  spend: number
}

export function PlatformCard({ platform, spend }: PlatformCardProps) {
  const config = getPlatformConfig(platform)

  return (
    <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {config.icon}
          <span className="font-semibold">{platform}</span>
        </div>
        <div className="text-2xl font-bold" style={{ color: config.color }}>
          ${formatCurrency(spend)}
        </div>
      </div>
    </div>
  )
}

function getPlatformConfig(platform: string) {
  const configs = {
    'Google Ads': {
      icon: <GoogleIcon />,
      color: '#4285F4' // Google Blue
    },
    'Facebook Ads': {
      icon: <FacebookIcon />,
      color: '#1877F2' // Facebook Blue
    }
  }
  return configs[platform] || { icon: null, color: '#6B7280' }
}
```

## Data Fetching Hook

```typescript
export function usePlatformSpend(businessId: number, days: number) {
  return useQuery({
    queryKey: ['platform-spend', businessId, days],
    queryFn: async () => {
      const res = await fetch(
        `/api/dashboard/platform-spend?business_id=${businessId}&days=${days}`
      )
      if (!res.ok) throw new Error('Failed to fetch platform spend')
      return res.json()
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!businessId
  })
}
```

## Currency Formatting

```typescript
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}
```

## TypeScript Types

```typescript
export interface PlatformSpendData {
  totalSpend: number
  platforms: Record<string, number>
  period: number
}

export interface PlatformConfig {
  icon: React.ReactNode
  color: string
}
```

## Performance Optimizations

- API response cached for 5 minutes via React Query
- Database query uses indexed columns (business_id, created_at)
- Platform aggregation done in application layer (single query)
- Component memoization prevents unnecessary re-renders
