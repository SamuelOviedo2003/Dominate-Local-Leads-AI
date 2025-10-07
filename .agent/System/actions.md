# Actions - Technical Implementation

**Product Documentation:** [../Tasks/actions.md](../Tasks/actions.md)

## File Locations
- `/src/app/[business_id]/[permalink]/actions/[leadId]/page.tsx` - Actions page
- `/src/app/api/actions/route.ts` - Actions list API
- `/src/app/api/actions/[actionId]/route.ts` - Action update API
- `/src/components/features/leads/ActionsChecklist.tsx` - Actions component

## Database Schema

```sql
CREATE TABLE ai_recap_actions (
  ai_recap_action_id SERIAL PRIMARY KEY,
  account_id TEXT NOT NULL,
  lead_id INTEGER REFERENCES leads(lead_id),
  business_id INTEGER NOT NULL,
  assigned_id TEXT,
  recap_action TEXT NOT NULL,
  action_response TEXT,
  action_done BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ai_recap_actions_lead ON ai_recap_actions(lead_id, business_id);
CREATE INDEX idx_ai_recap_actions_done ON ai_recap_actions(action_done);
```

## API Endpoints

### GET /api/actions
```typescript
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const leadId = parseInt(searchParams.get('lead_id') || '')
  const businessId = parseInt(searchParams.get('business_id') || '')

  const { data } = await supabase
    .from('ai_recap_actions')
    .select('*')
    .eq('lead_id', leadId)
    .eq('business_id', businessId)
    .order('created_at', { ascending: true })

  return NextResponse.json({ actions: data || [] })
}
```

### PATCH /api/actions/[actionId]
```typescript
export async function PATCH(
  request: Request,
  { params }: { params: { actionId: string } }
) {
  const actionId = parseInt(params.actionId)
  const body = await request.json()

  // Support partial updates: action_done, action_response, or recap_action
  const updateData: any = { updated_at: new Date().toISOString() }

  if ('action_done' in body) updateData.action_done = body.action_done
  if ('action_response' in body) updateData.action_response = body.action_response
  if ('recap_action' in body) updateData.recap_action = body.recap_action

  const { data, error } = await supabase
    .from('ai_recap_actions')
    .update(updateData)
    .eq('ai_recap_action_id', actionId)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ action: data })
}
```

## Component Implementation

### ActionsChecklist Component
```typescript
export function ActionsChecklist({ leadId, businessId }: Props) {
  const { actions, isLoading, mutate } = useActions(leadId, businessId)

  const incompleteActions = actions?.filter(a => !a.action_done) || []
  const completedActions = actions?.filter(a => a.action_done) || []

  const toggleAction = async (actionId: number, currentState: boolean) => {
    // Optimistic update
    mutate(
      actions?.map(a =>
        a.ai_recap_action_id === actionId
          ? { ...a, action_done: !currentState }
          : a
      ),
      false
    )

    try {
      await fetch(`/api/actions/${actionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action_done: !currentState })
      })
      mutate() // Revalidate
    } catch (error) {
      mutate() // Rollback on error
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold mb-3">
          Incomplete Actions ({incompleteActions.length})
        </h3>
        {incompleteActions.map(action => (
          <ActionItem
            key={action.ai_recap_action_id}
            action={action}
            onToggle={toggleAction}
          />
        ))}
      </div>

      <div>
        <h3 className="font-semibold mb-3">
          Completed Actions ({completedActions.length})
        </h3>
        {completedActions.map(action => (
          <ActionItem
            key={action.ai_recap_action_id}
            action={action}
            onToggle={toggleAction}
          />
        ))}
      </div>
    </div>
  )
}
```

### ActionItem Component
```typescript
export function ActionItem({ action, onToggle }: Props) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedText, setEditedText] = useState(action.recap_action)

  const handleSave = async () => {
    await fetch(`/api/actions/${action.ai_recap_action_id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recap_action: editedText })
    })
    setIsEditing(false)
  }

  return (
    <div className="flex items-start gap-3 p-3 hover:bg-gray-50 rounded">
      <input
        type="checkbox"
        checked={action.action_done}
        onChange={() => onToggle(action.ai_recap_action_id, action.action_done)}
        className="mt-1"
      />

      {isEditing ? (
        <input
          value={editedText}
          onChange={(e) => setEditedText(e.target.value)}
          onBlur={handleSave}
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          className="flex-1 border rounded px-2 py-1"
          autoFocus
        />
      ) : (
        <span
          className={action.action_done ? 'line-through text-gray-500' : ''}
          onClick={() => setIsEditing(true)}
        >
          {action.recap_action}
        </span>
      )}

      <button onClick={() => setIsEditing(true)}>
        <Edit className="w-4 h-4" />
      </button>
    </div>
  )
}
```

## TypeScript Types

```typescript
export interface AIRecapAction {
  ai_recap_action_id: number
  created_at: string
  updated_at: string
  account_id: string
  lead_id: number
  business_id: number
  assigned_id: string | null
  recap_action: string
  action_response: string | null
  action_done: boolean
}
```

## Data Fetching Hook

```typescript
export function useActions(leadId: number, businessId: number) {
  return useSWR(
    `/api/actions?lead_id=${leadId}&business_id=${businessId}`,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true
    }
  )
}
```
