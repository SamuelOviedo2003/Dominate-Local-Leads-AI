# Waiting to Call Section - Updated Implementation

## Overview
The "Waiting to Call" section displays leads with `stage = 1` AND `call_now_status = 1` from the existing `leads` table. It shows leads across ALL businesses the user has access to (unlike other sections that filter by current business).

## Key Differences from Initial Implementation
- **No new database table** - Uses existing `leads` table with filters
- **Simplified data model** - No waiting_to_call-specific fields (priority, notes, scheduled_for)
- **Cross-business aggregation** - Shows high-priority waiting leads (call_now_status = 1) from all accessible businesses

## How It Works

### Filtering Logic
```typescript
// Leads are "waiting to call" when:
stage === 1 AND call_now_status === 1
```

This shows leads that need to be called with high priority across all accessible businesses.

### Permission-Based Access
- **Super admins (role = 0)**: See all waiting to call leads across all businesses with `dashboard = true`
- **Regular users**: See only waiting to call leads from businesses in their `profile_businesses` assignments

### Cross-Business Display
Unlike the New Leads section which shows leads for the current business only, this section shows leads from ALL accessible businesses with:
- Business name column to identify which business each lead belongs to
- Proper navigation that maintains business context

## Files Created/Modified

### API Endpoint
**File**: [src/app/api/leads/waiting-to-call/route.ts](src/app/api/leads/waiting-to-call/route.ts)
- Queries `leads` table with `stage=1` and `call_now_status=1`
- Filters by accessible businesses based on user permissions
- Joins with business_clients to get company_name and permalink
- Returns enriched data with business context

**Endpoint**: `GET /api/leads/waiting-to-call`

### Types
**File**: [src/types/leads.ts](src/types/leads.ts:66-71)
```typescript
export interface WaitingToCallLead extends LeadWithClient {
  business_name: string // Business name for cross-business display
  business_permalink?: string // Business permalink for navigation
}
```

### Components

#### WaitingToCallTable
**File**: [src/components/features/leads/WaitingToCallTable.tsx](src/components/features/leads/WaitingToCallTable.tsx)
- Specialized table with Business column
- Handles navigation with business context (business_id + permalink)
- Displays: Lead Name, Business, Source, Date, Timer
- Exported from: [src/components/features/leads/index.ts](src/components/features/leads/index.ts:5)

#### WaitingToCallClient
**File**: [src/components/WaitingToCallClient.tsx](src/components/WaitingToCallClient.tsx)
- Fetches data from API endpoint
- Handles loading and error states
- Renders WaitingToCallTable

### Page Route
**File**: [src/app/[business_id]/[permalink]/waiting-to-call/page.tsx](src/app/[business_id]/[permalink]/waiting-to-call/page.tsx)
- Route: `/{business_id}/{permalink}/waiting-to-call`
- Server component that renders WaitingToCallClient

**File**: [src/app/[business_id]/[permalink]/waiting-to-call/layout.tsx](src/app/[business_id]/[permalink]/waiting-to-call/layout.tsx)
- Wraps page with OptimizedLayoutWrapper
- Provides UniversalHeader navigation

### Navigation
**File**: [src/lib/permalink-utils.ts](src/lib/permalink-utils.ts:155)
- **UPDATED**: Removed "Waiting to Call" from NAVIGATION_SECTIONS array
- Now accessed via dedicated round icon button in UniversalHeader

**File**: [src/components/UniversalHeader.tsx](src/components/UniversalHeader.tsx)
- Added round icon button with UserPlus icon (person with plus sign)
- Positioned to the left of the profile icon in the header
- Desktop: Shows as round button with hover effects
- Mobile: Appears as first item in mobile navigation menu with icon

## Database Schema

### No New Tables
This implementation uses the existing `leads` table structure:
- `stage` (smallint): 1 = Contact, 2 = Follow up, 3 = Booked, etc.
- `call_now_status` (smallint): 1 = High, 2 = Medium, 3 = Normal/Waiting

### Existing Relationships
- `leads.business_id` → `business_clients.business_id`
- `leads.account_id` → `clients.account_id`
- `leads.lead_id` → `call_windows.lead_id`

## How to Access

Once deployed, users can access the section via:
1. **Round Icon Button**: Click the person-with-plus icon (⊕👤) to the left of the profile icon in the header
2. **Mobile Menu**: Click "Waiting to Call" menu item in the mobile navigation drawer
3. **Direct URL**: `/{business_id}/{permalink}/waiting-to-call`

**Note**: "Waiting to Call" has been removed from the main navigation menu and is now accessed via a dedicated round icon button for cleaner UI.

## Data Flow

```
User navigates to /waiting-to-call
    ↓
Page renders WaitingToCallClient
    ↓
Client fetches GET /api/leads/waiting-to-call
    ↓
API authenticates user and determines accessible businesses
    ↓
Query leads WHERE stage=1 AND call_now_status=1 AND business_id IN (accessible)
    ↓
Join with business_clients for company names
    ↓
Join with clients for property data
    ↓
Join with call_windows for call history
    ↓
Return enriched data with business_name and business_permalink
    ↓
WaitingToCallTable displays leads with business context
```

## Table Columns

| Column | Description |
|--------|-------------|
| Lead Name | First/Last name with call history icons and working hours indicator |
| Business | Company name from business_clients |
| Source | Facebook, Google, Website, Referral (color-coded badges) |
| Date | Lead created_at timestamp |
| Timer | Circular timer for call windows |

## Navigation from Table

When clicking on a lead row:
- Extracts business_id and business_permalink from the lead data
- Navigates to: `/{business_id}/{permalink}/lead-details/{lead_id}`
- Maintains proper business context for the target lead

## Testing

To test the implementation:

1. **Create Test Data** (optional):
   ```sql
   -- Update some leads to be "waiting to call"
   UPDATE leads
   SET stage = 1, call_now_status = 1
   WHERE lead_id IN (SELECT lead_id FROM leads LIMIT 5);
   ```

2. **Test as Super Admin**:
   - Should see waiting to call leads from all businesses
   - Business column should show different company names

3. **Test as Regular User**:
   - Should see only waiting to call leads from assigned businesses
   - Verify profile_businesses filtering works correctly

4. **Test Navigation**:
   - Click on a lead to navigate to lead details
   - Verify the correct business context is maintained

## API Response Format

```json
{
  "data": [
    {
      "lead_id": "123",
      "stage": 1,
      "call_now_status": 1,
      "first_name": "John",
      "last_name": "Doe",
      "source": "Facebook",
      "created_at": "2025-10-21T10:00:00Z",
      "business_id": "1",
      "business_name": "Houston Custom Renovations",
      "business_permalink": "houston-custom-renovations",
      "client": {
        "full_address": "123 Main St",
        "house_value": "500000",
        ...
      },
      "callWindows": [
        {
          "callNumber": 1,
          "status": 1,
          "window_start_at": "2025-10-21T08:00:00Z",
          "window_end_at": "2025-10-21T18:00:00Z",
          ...
        }
      ]
    }
  ],
  "success": true
}
```

## Comparison with New Leads Section

| Aspect | New Leads Section | Waiting to Call Section |
|--------|------------------|------------------------|
| Data Source | `/api/leads/recent?businessId={id}` | `/api/leads/waiting-to-call` |
| Filter | `stage=1` + filtered by business param | `stage=1 AND call_now_status=1` + accessible businesses |
| Scope | Current business only | All accessible businesses |
| Table Display | "Call now" + "Waiting to call" tables | Single "Waiting to Call" table |
| Business Column | No (implied from context) | Yes (shows company name) |
| Navigation | Uses current business context | Extracts business from lead data |

## Key Implementation Details

### Why No Separate Table?
The initial design proposed a `waiting_to_call` table, but this was unnecessary because:
1. The New Leads section already uses `call_now_status` to distinguish waiting leads
2. No additional metadata (priority, notes, scheduled_for) was actually needed
3. Simpler data model = easier maintenance
4. Consistent with existing application patterns

### Cross-Business Query Optimization
The API fetches:
1. All accessible business IDs (single query)
2. Leads matching criteria (single query with IN clause)
3. Business info (single query for unique business_ids)
4. Client data (single query with IN clause)

This minimizes database round-trips while maintaining performance.

### Permission Enforcement
Permissions are enforced at three levels:
1. **API Level**: Validates user permissions before querying
2. **Database Level**: RLS policies on leads table (if enabled)
3. **Client Level**: No client-side business filtering (relies on API)

## Troubleshooting

### "Failed to fetch waiting to call leads" Error
- Check browser console for detailed error messages
- Verify user authentication (AuthDataProvider)
- Check that user has accessible businesses (profile_businesses)
- Verify leads table has records with stage=1 and call_now_status=3

### No Leads Showing
- Confirm there are leads with `stage=1` AND `call_now_status=1`
- Check user permissions (super admin or profile_businesses entries)
- Verify the business has `dashboard=true` in business_clients
- Check browser network tab for API response

### Business Name Not Displaying
- Verify business_clients table has company_name field
- Check the business_id in leads matches business_clients
- Ensure API is joining with business_clients correctly

## Future Enhancements

1. **Filtering**: Add filters for source, date range, or business
2. **Sorting**: Allow sorting by column (name, date, business)
3. **Search**: Search by lead name or phone
4. **Export**: Export waiting list to CSV
5. **Bulk Actions**: Mark multiple leads as called
6. **Status Update**: Move leads to different call_now_status
7. **Pagination**: Add pagination for large datasets

## Related Files

- API: [src/app/api/leads/waiting-to-call/route.ts](src/app/api/leads/waiting-to-call/route.ts)
- Page: [src/app/[business_id]/[permalink]/waiting-to-call/page.tsx](src/app/[business_id]/[permalink]/waiting-to-call/page.tsx)
- Layout: [src/app/[business_id]/[permalink]/waiting-to-call/layout.tsx](src/app/[business_id]/[permalink]/waiting-to-call/layout.tsx)
- Client: [src/components/WaitingToCallClient.tsx](src/components/WaitingToCallClient.tsx)
- Table: [src/components/features/leads/WaitingToCallTable.tsx](src/components/features/leads/WaitingToCallTable.tsx)
- Types: [src/types/leads.ts](src/types/leads.ts:66-71)
- Navigation: [src/lib/permalink-utils.ts](src/lib/permalink-utils.ts:155)
