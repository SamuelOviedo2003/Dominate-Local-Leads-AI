# Lead Filtering Requirements by Section

This document defines the exact database requirements for leads to appear in each section of the application.

## Understanding Lead Fields

### `stage` Field
Defines the lifecycle stage of a lead:
- **1** = Contact (New lead, needs to be called)
- **2** = Follow up (Contacted, needs follow-up)
- **3** = Booked (Appointment scheduled)
- **88** = Bad number (Invalid phone number)
- **99** = Not interested (Lead declined service)
- **100** = Email campaign (In marketing campaign)

### `call_now_status` Field
Defines the priority/urgency for calling (only applies to stage 1):
- **1** = High priority (Red - urgent, needs immediate attention)
- **2** = Medium priority (Yellow - elevated priority)
- **3** = Normal priority (Default - regular queue)
- **null** = No priority set

---

## Section Requirements

### 1. Waiting to Call (All Leads View)
**Location**: `/{business_id}/{permalink}/waiting-to-call`

**Database Query**:
```sql
SELECT * FROM leads
WHERE stage = 1
  AND call_now_status = 1
  AND business_id IN (accessible_business_ids)
ORDER BY created_at DESC
LIMIT 100
```

**Requirements**:
- ✅ `stage` = **1** (Contact)
- ✅ `call_now_status` = **1** (High priority ONLY)
- ✅ From ALL accessible businesses (cross-business view)
- ✅ Limited to 100 leads
- ✅ Ordered by newest first

**API Endpoint**: `GET /api/leads/waiting-to-call`

**Code Reference**: [route.ts:86-103](../src/app/api/leads/waiting-to-call/route.ts#L86-L103)

**Purpose**: Centralized view of highest-priority leads across all businesses

---

### 2. New Leads - "Call now" Table
**Location**: `/{business_id}/{permalink}/new-leads` (first table)

**Client-Side Filter**:
```typescript
recentLeads.filter(lead =>
  lead.stage === 1 &&
  (lead.call_now_status === 1 || lead.call_now_status === 2)
)
```

**Requirements**:
- ✅ `stage` = **1** (Contact)
- ✅ `call_now_status` = **1** OR **2** (High or Medium priority)
- ✅ Current business only
- ✅ Ordered by newest first

**Code Reference**: [client.tsx:46-48](../src/app/(dashboard)/new-leads/client.tsx#L46-L48)

**Purpose**: High and medium priority leads that need immediate attention

---

### 3. New Leads - "Waiting to call" Table
**Location**: `/{business_id}/{permalink}/new-leads` (second table)

**Client-Side Filter**:
```typescript
recentLeads.filter(lead =>
  lead.stage === 1 &&
  lead.call_now_status === 3
)
```

**Requirements**:
- ✅ `stage` = **1** (Contact)
- ✅ `call_now_status` = **3** (Normal priority)
- ✅ Current business only
- ✅ Ordered by newest first

**Code Reference**: [client.tsx:49-52](../src/app/(dashboard)/new-leads/client.tsx#L49-L52)

**Purpose**: Normal priority leads in the regular calling queue

---

### 4. Follow Up (Booking Follow Up)
**Location**: `/{business_id}/{permalink}/follow-up`

**Client-Side Filter**:
```typescript
recentLeads.filter(lead => lead.stage === 2)
```

**Requirements**:
- ✅ `stage` = **2** (Follow up)
- ✅ Any `call_now_status` (field is ignored for stage 2)
- ✅ Current business only
- ✅ Ordered by newest first

**Code Reference**: [FollowUpClient.tsx:40-43](../src/components/FollowUpClient.tsx#L40-L43)

**Purpose**: Leads that have been contacted and need follow-up actions

---

### 5. Bookings (Booked Appointments)
**Location**: `/{business_id}/{permalink}/bookings`

**Database Query**:
```sql
SELECT * FROM leads
WHERE stage = 3
  AND business_id = ?
ORDER BY created_at DESC
```

**Requirements**:
- ✅ `stage` = **3** (Booked)
- ✅ Any `call_now_status` (field is ignored for stage 3)
- ✅ Current business only
- ✅ Ordered by newest first

**API Endpoint**: `GET /api/bookings/leads?businessId={id}`

**Code Reference**: [route.ts:28-43](../src/app/api/bookings/leads/route.ts#L28-L43)

**Purpose**: Leads with scheduled appointments

---

## Summary Table

| Section | Stage | call_now_status | Business Scope | Sort Order |
|---------|-------|-----------------|----------------|------------|
| **Waiting to Call (All)** | 1 | 1 (High only) | All accessible | Newest first |
| **New Leads - Call now** | 1 | 1 or 2 (High/Medium) | Current only | Newest first |
| **New Leads - Waiting to call** | 1 | 3 (Normal) | Current only | Newest first |
| **Follow Up** | 2 | Any/Ignored | Current only | Newest first |
| **Bookings** | 3 | Any/Ignored | Current only | Newest first |

---

## Stage Transition Flow

```
Stage 1 (Contact)
├─ call_now_status = 1 → Appears in "Waiting to Call (All)" + "Call now"
├─ call_now_status = 2 → Appears in "Call now" only
└─ call_now_status = 3 → Appears in "Waiting to call" only
         ↓
    (After contact)
         ↓
Stage 2 (Follow up)
└─ All → Appears in "Follow Up" section
         ↓
    (After booking)
         ↓
Stage 3 (Booked)
└─ All → Appears in "Bookings" section
```

---

## Key Differences: Waiting to Call Views

### "Waiting to Call (All)" - Standalone Section
- **Location**: `/{business_id}/{permalink}/waiting-to-call`
- **Filter**: `stage=1` AND `call_now_status=1`
- **Scope**: ALL accessible businesses
- **Purpose**: Cross-business high-priority queue
- **Navigation**: Opens `waiting-to-call-details` (with "Call Next Lead" button)

### "Waiting to call" - Table in New Leads
- **Location**: `/{business_id}/{permalink}/new-leads` (second table)
- **Filter**: `stage=1` AND `call_now_status=3`
- **Scope**: Current business only
- **Purpose**: Normal priority queue for current business
- **Navigation**: Opens standard `lead-details` (no "Call Next Lead" button)

**Important**: These are two completely different views with different priorities:
1. **Standalone "Waiting to Call"** = High priority (1) across all businesses
2. **New Leads "Waiting to call" table** = Normal priority (3) for current business

---

## Permission Filtering

All sections respect user business access:

### Super Admin (role = 0)
- **Waiting to Call (All)**: Sees leads from all businesses with `dashboard=true`
- **Other sections**: Can switch between any business

### Regular User
- **Waiting to Call (All)**: Sees leads from businesses in `profile_businesses` table
- **Other sections**: Limited to assigned businesses only

**Database Query**:
```sql
-- Super Admin
SELECT business_id FROM business_clients WHERE dashboard = true

-- Regular User
SELECT business_id FROM profile_businesses WHERE profile_id = ?
```

---

## Implementation Notes

### API Filtering
Most sections use API-level filtering in `/api/leads/` endpoints with authentication checks.

### Client-Side Filtering
The New Leads and Follow Up sections use client-side filtering for performance:
1. Fetch all recent leads for the business (stage 1 and 2)
2. Filter in React component based on `stage` and `call_now_status`
3. Display in separate tables

This approach minimizes API calls and allows for instant table switching.

### Call Windows
All sections join with the `call_windows` table to show call attempt history, but this doesn't affect which leads appear - only which status icons are displayed.

---

## Testing Scenarios

### Test 1: High Priority Lead
**Setup**: Create lead with `stage=1`, `call_now_status=1`
**Expected**:
- ✅ Appears in "Waiting to Call (All)"
- ✅ Appears in "Call now" table
- ❌ Does NOT appear in "Waiting to call" table
- ❌ Does NOT appear in "Follow Up"
- ❌ Does NOT appear in "Bookings"

### Test 2: Medium Priority Lead
**Setup**: Create lead with `stage=1`, `call_now_status=2`
**Expected**:
- ❌ Does NOT appear in "Waiting to Call (All)"
- ✅ Appears in "Call now" table
- ❌ Does NOT appear in "Waiting to call" table
- ❌ Does NOT appear in "Follow Up"
- ❌ Does NOT appear in "Bookings"

### Test 3: Normal Priority Lead
**Setup**: Create lead with `stage=1`, `call_now_status=3`
**Expected**:
- ❌ Does NOT appear in "Waiting to Call (All)"
- ❌ Does NOT appear in "Call now" table
- ✅ Appears in "Waiting to call" table
- ❌ Does NOT appear in "Follow Up"
- ❌ Does NOT appear in "Bookings"

### Test 4: Follow Up Lead
**Setup**: Create lead with `stage=2`, any `call_now_status`
**Expected**:
- ❌ Does NOT appear in "Waiting to Call (All)"
- ❌ Does NOT appear in "Call now" table
- ❌ Does NOT appear in "Waiting to call" table
- ✅ Appears in "Follow Up"
- ❌ Does NOT appear in "Bookings"

### Test 5: Booked Lead
**Setup**: Create lead with `stage=3`, any `call_now_status`
**Expected**:
- ❌ Does NOT appear in "Waiting to Call (All)"
- ❌ Does NOT appear in "Call now" table
- ❌ Does NOT appear in "Waiting to call" table
- ❌ Does NOT appear in "Follow Up"
- ✅ Appears in "Bookings"

---

## Related Documentation
- [Waiting to Call Feature](./.agent/Tasks/waiting-to-call.md)
- [New Leads Feature](./.agent/Tasks/new-leads.md)
- [Lead Details Feature](./.agent/Tasks/lead-details.md)
- [Business Context Fix](./WAITING_TO_CALL_BUSINESS_CONTEXT_FIX.md)
