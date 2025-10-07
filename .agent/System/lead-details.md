# Lead Details - Technical Implementation

**Product Documentation:** [../Tasks/lead-details.md](../Tasks/lead-details.md)

## File Locations
- `/src/app/(dashboard)/lead-details/[leadId]/page.tsx` - Lead details page
- `/src/app/[business_id]/[permalink]/lead-details/[leadId]/page.tsx` - Permalink version
- `/src/app/api/leads/[leadId]/route.ts` - Lead details API
- `/src/components/features/leads/LeadInformation.tsx` - Lead info component
- `/src/components/features/leads/CommunicationsHistory.tsx` - Communications component
- `/src/components/features/leads/CallWindows.tsx` - Call windows component
- `/src/components/CallNowButton.tsx` - Dialpad integration button

## Database Schema

### call_windows table
```sql
CREATE TABLE call_windows (
  id SERIAL PRIMARY KEY,
  account_id TEXT NOT NULL,
  business_id INTEGER REFERENCES business_clients(business_id),
  call_window INTEGER NOT NULL, -- Call number (1-6)
  window_start_at TIMESTAMPTZ NOT NULL,
  window_end_at TIMESTAMPTZ NOT NULL,
  called_at TIMESTAMPTZ,
  called_out BOOLEAN DEFAULT false,
  active BOOLEAN DEFAULT true,
  status_name TEXT, -- 'Done on time', 'Done late', 'Due', 'Missed'
  working_hours BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### communications table
```sql
CREATE TABLE communications (
  communication_id SERIAL PRIMARY KEY,
  account_id TEXT NOT NULL,
  business_id INTEGER NOT NULL,
  lead_id INTEGER REFERENCES leads(lead_id),
  message_type TEXT NOT NULL, -- 'call', 'sms', 'email', 'voicemail'
  summary TEXT,
  recording_url TEXT,
  call_window INTEGER,
  ai_recap_outcome TEXT,
  ai_recap_recap_purposes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## API Endpoint

### GET /api/leads/[leadId]
```typescript
export async function GET(
  request: Request,
  { params }: { params: { leadId: string } }
) {
  const leadId = parseInt(params.leadId)

  // Fetch lead with business dialpad_phone
  const { data: lead } = await supabase
    .from('leads')
    .select(`
      *,
      business_clients(time_zone, dialpad_phone)
    `)
    .eq('lead_id', leadId)
    .single()

  // Fetch property details
  const { data: property } = await supabase
    .from('clients')
    .select('*')
    .eq('account_id', lead.account_id)
    .single()

  // Fetch call windows (active only)
  const { data: callWindows } = await supabase
    .from('call_windows')
    .select('*')
    .eq('account_id', lead.account_id)
    .eq('active', true)
    .order('call_window', { ascending: true })

  // Fetch communications
  const { data: communications } = await supabase
    .from('communications')
    .select('*')
    .eq('account_id', lead.account_id)
    .order('created_at', { ascending: true })

  return NextResponse.json({
    lead: {
      ...lead,
      dialpadPhone: lead.business_clients?.dialpad_phone
    },
    property,
    callWindows: callWindows || [],
    communications: communications || []
  })
}
```

## Dialpad Integration

### Call Now Button
```typescript
interface CallNowButtonProps {
  phone: string
  leadId: number
  dialpadPhone: string
}

export function CallNowButton({ phone, leadId, dialpadPhone }: CallNowButtonProps) {
  if (!isValidDialpadPhone(phone)) return null

  const dialpadUrl = createBusinessDialpadUrl(phone, leadId, dialpadPhone)

  return (
    <a href={dialpadUrl} className="btn-primary">
      <Phone className="w-4 h-4" />
      Call Now
    </a>
  )
}

export function createBusinessDialpadUrl(
  phone: string,
  leadId: number,
  dialpadPhone: string
): string {
  return `dialpad://${phone}?fromNumber=${dialpadPhone}&customData=lead_id%3D${leadId}`
}
```

## Chat Webhook Integration

### useChatWebhook Hook
```typescript
export function useChatWebhook() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sendMessage = async (params: {
    accountId: string
    leadId: number
    message: string
    businessId: number
  }) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(
        'https://n8nio-n8n-pbq4r3.sliplane.app/webhook/bf425f50-2d65-4cfd-a529-faea3b682288',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(params)
        }
      )

      if (!response.ok) throw new Error('Failed to send message')
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  return { sendMessage, isLoading, error }
}
```

## Stage Management Webhook

```typescript
async function changeLeadStage(leadId: number, stage: number) {
  const response = await fetch(
    'https://n8nio-n8n-pbq4r3.sliplane.app/webhook/change-stage',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lead_id: leadId.toString(),
        stage: stage.toString()
      })
    }
  )

  if (!response.ok) throw new Error('Failed to change stage')
}
```

## Call Window Timer Logic

```typescript
export function useCallWindowTimer(
  callWindow: CallWindow,
  businessTimeZone: string
) {
  const [timeRemaining, setTimeRemaining] = useState<string | null>(null)

  useEffect(() => {
    if (callWindow.call_window !== 1) return

    const interval = setInterval(() => {
      const now = new Date()
      const start = new Date(callWindow.window_start_at)
      const thirtyMinutesLater = new Date(start.getTime() + 30 * 60 * 1000)

      if (now >= start && now < thirtyMinutesLater) {
        const remaining = thirtyMinutesLater.getTime() - now.getTime()
        const minutes = Math.floor(remaining / 60000)
        const seconds = Math.floor((remaining % 60000) / 1000)
        setTimeRemaining(`${minutes}:${seconds.toString().padStart(2, '0')}`)
      } else {
        setTimeRemaining(null)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [callWindow])

  return timeRemaining
}
```

## TypeScript Types

```typescript
export interface CallWindow {
  id: number
  account_id: string
  business_id: number
  call_window: number
  window_start_at: string
  window_end_at: string
  called_at: string | null
  called_out: boolean
  active: boolean
  status_name: string | null
  working_hours: boolean
  created_at: string
}

export interface Communication {
  communication_id: number
  account_id: string
  business_id: number
  lead_id: number
  message_type: string
  summary: string
  recording_url: string | null
  call_window: number | null
  created_at: string
}
```
