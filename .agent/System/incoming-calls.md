# Incoming Calls - Technical Implementation

**Product Documentation:** [../Tasks/incoming-calls.md](../Tasks/incoming-calls.md)

## File Locations
- `/src/app/(dashboard)/incoming-calls/page.tsx` - Incoming calls page
- `/src/app/(dashboard)/incoming-calls/client-optimized.tsx` - Client component
- `/src/app/api/incoming-calls/analytics/route.ts` - Analytics API
- `/src/app/api/incoming-calls/recent-calls/route.ts` - Recent calls API
- `/src/app/api/incoming-calls/source-caller-types/route.ts` - Hover popup API
- `/src/app/api/incoming-calls/[callId]/route.ts` - Call details and update API

## Database Schema

```sql
CREATE TABLE incoming_calls (
  incoming_call_id SERIAL PRIMARY KEY,
  business_id INTEGER REFERENCES business_clients(business_id),
  source TEXT,
  caller_type TEXT, -- 'Client', 'Sales person', 'Other', 'Looking for job'
  duration INTEGER, -- seconds
  assigned_id TEXT,
  assigned TEXT, -- person's name
  recording_url TEXT,
  call_summary TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_incoming_calls_business_created ON incoming_calls(business_id, created_at);
CREATE INDEX idx_incoming_calls_source ON incoming_calls(source);
CREATE INDEX idx_incoming_calls_caller_type ON incoming_calls(caller_type);
```

## API Endpoints

### GET /api/incoming-calls/source-caller-types
```typescript
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const businessId = parseInt(searchParams.get('business_id') || '')
  const source = searchParams.get('source') || ''
  const days = parseInt(searchParams.get('days') || '30')

  const { data } = await supabase
    .from('incoming_calls')
    .select('caller_type')
    .eq('business_id', businessId)
    .eq('source', source)
    .gte('created_at', startDate.toISOString())
    .not('caller_type', 'is', null)
    .neq('caller_type', 'Unknown')

  const distribution = data?.reduce((acc, row) => {
    acc[row.caller_type] = (acc[row.caller_type] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return NextResponse.json({ distribution })
}
```

### PATCH /api/incoming-calls/[callId]
```typescript
export async function PATCH(
  request: Request,
  { params }: { params: { callId: string } }
) {
  const callId = parseInt(params.callId)
  const { caller_type } = await request.json()

  const { data, error } = await supabase
    .from('incoming_calls')
    .update({ caller_type })
    .eq('incoming_call_id', callId)
    .select()
    .single()

  return NextResponse.json({ call: data })
}
```

## Component Structure

### IncomingCallsClientOptimized
```typescript
export function IncomingCallsClientOptimized({ businessId }: Props) {
  const [timePeriod, setTimePeriod] = useState(30)
  const [selectedCall, setSelectedCall] = useState<Call | null>(null)
  const { analytics } = useCallAnalytics(businessId, timePeriod)
  const { calls } = useRecentCalls(businessId, timePeriod)

  return (
    <div className="p-6 space-y-6">
      <SourceDistributionChart
        data={analytics.sourceDistribution}
        onHover={(source) => setHoveredSource(source)}
      />

      <CallerTypeDistributionChart data={analytics.callerTypeDistribution} />

      <RecentCallsTable
        calls={calls}
        onRowClick={(call) => setSelectedCall(call)}
      />

      {selectedCall && (
        <CallDetailsPopup
          call={selectedCall}
          onClose={() => setSelectedCall(null)}
        />
      )}
    </div>
  )
}
```

### CallDetailsPopup Component
```typescript
export function CallDetailsPopup({ call, onClose }: Props) {
  const [callerType, setCallerType] = useState(call.caller_type)
  const [isSaving, setIsSaving] = useState(false)

  const handleCallerTypeChange = async (newType: string) => {
    setCallerType(newType) // Optimistic update
    setIsSaving(true)

    try {
      await fetch(`/api/incoming-calls/${call.incoming_call_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caller_type: newType })
      })
    } catch (error) {
      setCallerType(call.caller_type) // Rollback
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-lg p-6 max-w-2xl w-full">
        {/* Call details */}
        <div className="mb-4">
          <p className="text-sm text-gray-600">{formatDate(call.created_at)}</p>
          <p className="mt-2">{call.call_summary}</p>
        </div>

        {/* Caller type dropdown */}
        <select
          value={callerType}
          onChange={(e) => handleCallerTypeChange(e.target.value)}
          disabled={isSaving}
          className="w-full border rounded px-3 py-2"
        >
          <option value="Client">Client</option>
          <option value="Sales person">Sales person</option>
          <option value="Other">Other</option>
          <option value="Looking for job">Looking for job</option>
        </select>

        {/* Audio player */}
        {call.recording_url && (
          <AudioPlayer src={call.recording_url} />
        )}
      </div>
    </div>
  )
}
```

## TypeScript Types

```typescript
export interface IncomingCall {
  incoming_call_id: number
  business_id: number
  source: string
  caller_type: string | null
  duration: number
  assigned_id: string | null
  assigned: string | null
  recording_url: string | null
  call_summary: string | null
  created_at: string
}
```
