# New Leads - Technical Implementation

**Product Documentation:** [../Tasks/new-leads.md](../Tasks/new-leads.md)

## File Locations

- `/src/app/(dashboard)/new-leads/page.tsx` - New Leads server component
- `/src/app/(dashboard)/new-leads/client.tsx` - New Leads client component
- `/src/app/api/leads/recent/route.ts` - Recent leads API
- `/src/app/api/leads/metrics/route.ts` - Lead metrics API
- `/src/components/LeadsTable.tsx` - Leads table component
- `/src/components/LeadsMetrics.tsx` - Metrics display component

## Database Schema

### leads table
```sql
CREATE TABLE leads (
  lead_id SERIAL PRIMARY KEY,
  business_id INTEGER REFERENCES business_clients(business_id),
  account_id TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  source TEXT,
  service TEXT,
  how_soon TEXT,
  next_step TEXT,
  stage INTEGER DEFAULT 1, -- 1=Contact, 2=Follow up, 3=Booked, 99=Not interested, 100=Email campaign
  call_now_status INTEGER, -- 1=Call now, 2=Call now, 3=Waiting to call
  contacted BOOLEAN DEFAULT false,
  start_time TIMESTAMPTZ, -- Appointment time (null if not booked)
  calls_count INTEGER DEFAULT 0,
  working_hours BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_leads_business_created ON leads(business_id, created_at);
CREATE INDEX idx_leads_stage ON leads(stage);
CREATE INDEX idx_leads_call_now_status ON leads(call_now_status);
```

## API Endpoints

### GET /api/leads/recent
```typescript
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const businessId = parseInt(searchParams.get('business_id') || '')
  const days = parseInt(searchParams.get('days') || '30')

  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  const { data, error } = await supabase
    .from('leads')
    .select('*, clients(full_address, house_value, house_url)')
    .eq('business_id', businessId)
    .gte('created_at', startDate.toISOString())
    .order('created_at', { ascending: false })

  return NextResponse.json({ leads: data || [] })
}
```

### GET /api/leads/metrics
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

  const total = data?.length || 0
  const contacted = data?.filter(l => l.contacted).length || 0
  const booked = data?.filter(l => l.start_time).length || 0

  return NextResponse.json({
    total,
    contacted,
    booked,
    contactRate: total > 0 ? (contacted / total) * 100 : 0,
    bookingRate: contacted > 0 ? (booked / contacted) * 100 : 0
  })
}
```

## Component Structure

### NewLeadsClient
```typescript
export function NewLeadsClient({ businessId }: Props) {
  const [timePeriod, setTimePeriod] = useState(30)
  const { metrics, isLoadingMetrics } = useLeadsMetrics(businessId, timePeriod)
  const { leads, isLoadingLeads } = useRecentLeads(businessId, timePeriod)

  // Filter leads for three tables
  const callNowLeads = leads?.filter(
    l => l.stage === 1 && (l.call_now_status === 1 || l.call_now_status === 2)
  ) || []

  const followUpLeads = leads?.filter(l => l.stage === 2) || []

  const waitingLeads = leads?.filter(
    l => l.stage === 1 && l.call_now_status === 3
  ) || []

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">New Leads</h1>
        <TimePeriodFilter value={timePeriod} onChange={setTimePeriod} />
      </div>

      <LeadsMetrics metrics={metrics} isLoading={isLoadingMetrics} />

      {callNowLeads.length > 0 && (
        <LeadsTable title="Call now" leads={callNowLeads} />
      )}

      {followUpLeads.length > 0 && (
        <LeadsTable title="Follow Up" leads={followUpLeads} />
      )}

      {waitingLeads.length > 0 && (
        <LeadsTable title="Waiting to call" leads={waitingLeads} />
      )}
    </div>
  )
}
```

## TypeScript Types

```typescript
export interface Lead {
  lead_id: number
  business_id: number
  account_id: string
  first_name: string
  last_name: string
  email: string
  phone: string
  source: string
  service: string
  how_soon: string
  next_step: string
  stage: number
  call_now_status: number
  contacted: boolean
  start_time: string | null
  calls_count: number
  working_hours: boolean
  created_at: string
  clients?: {
    full_address: string
    house_value: number
    house_url: string
  }
}

export interface LeadMetrics {
  total: number
  contacted: number
  booked: number
  contactRate: number
  bookingRate: number
}
```

## Working Hours Indicator Logic

```typescript
export function getWorkingHoursIcon(working_hours: boolean | null) {
  if (working_hours === false) {
    return <Moon className="w-3 h-3 text-blue-100" /> // After hours
  }
  return <Sun className="w-3 h-3 text-yellow-100" /> // Working hours or null
}
```

## Urgency Tag Logic

```typescript
export function getUrgencyColor(how_soon: string): string {
  const lower = how_soon?.toLowerCase() || ''

  if (lower.includes('asap') || lower.includes('immediately') || lower.includes('urgent')) {
    return 'red'
  }
  if (lower.includes('week') || lower.includes('7 days') || lower.includes('soon')) {
    return 'orange'
  }
  if (lower.includes('month') || lower.includes('30 days')) {
    return 'blue'
  }
  return 'gray'
}
```
