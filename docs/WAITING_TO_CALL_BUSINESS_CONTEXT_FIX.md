# Waiting to Call - Business Context Fix

## Problem Description

The application has two distinct modes of operation:

1. **Per-Business Mode**: Navigate through sections within a single business. The URL structure is `/{business_id}/{permalink}/{section}`
2. **Waiting to Call Mode**: View leads from ALL accessible businesses in a unified list

### The Issue

When clicking on a lead in the "Waiting to Call" view, the app was changing the current business context to match the lead's business. This caused a conflict where:

- The URL would change to the lead's business (e.g., from business 1 to business 2)
- When navigating back or switching businesses, the header would show one business while the content showed another
- The two modes were being mixed together, causing confusion and incorrect data display

## Root Cause

The problem occurred in [WaitingToCallTable.tsx:126](../src/components/features/leads/WaitingToCallTable.tsx#L126) where clicking a lead would navigate to:
```typescript
const url = `/${businessId}/${permalink}/${navigationTarget}/${leadId}`
```

This changed the business context in the URL to the lead's business, even though the user was viewing a cross-business list.

## Solution

The fix separates the two behaviors by:

1. **Preserving URL business context** in Waiting to Call mode
2. **Passing lead's actual business_id as a query parameter** for data fetching
3. **Using the query parameter** throughout the data fetching chain

### Changes Made

#### 1. WaitingToCallTable.tsx
**File**: [src/components/features/leads/WaitingToCallTable.tsx](../src/components/features/leads/WaitingToCallTable.tsx)

Updated `handleRowClick` to preserve the current business context when in "Waiting to Call" mode:

```typescript
const handleRowClick = async (e: React.MouseEvent, leadId: string, leadBusinessId: string, leadPermalink: string) => {
  // Get current business context from URL
  const pathSegments = window.location.pathname.split('/').filter(Boolean)
  const currentBusinessId = pathSegments[0]
  const currentPermalink = pathSegments[1]

  // Check if we're in "Waiting to Call" mode
  const isWaitingToCallMode = navigationTarget === 'waiting-to-call-details'

  if (isWaitingToCallMode && currentBusinessId && currentPermalink) {
    // Stay in the current business context, pass lead's business_id as query param
    const url = `/${currentBusinessId}/${currentPermalink}/${navigationTarget}/${leadId}?leadBusinessId=${leadBusinessId}`
    router.push(url)
  } else {
    // For other modes, use the lead's business context
    const url = `/${leadBusinessId}/${leadPermalink}/${navigationTarget}/${leadId}`
    router.push(url)
  }
}
```

Also updated `handleContextMenu` and `handleOpenInNewTab` with the same logic.

#### 2. useLeadDetailsDataOptimized Hook
**File**: [src/hooks/useLeadDetailsDataOptimized.ts](../src/hooks/useLeadDetailsDataOptimized.ts)

Added support for the `leadBusinessId` query parameter:

```typescript
import { useSearchParams } from 'next/navigation'

export function useLeadDetailsDataOptimized({ leadId, businessId }: UseLeadDetailsDataOptimizedProps) {
  const searchParams = useSearchParams()

  const fetchLeadDetails = useCallback(async () => {
    // Support for cross-business lead viewing in Waiting to Call mode
    const leadBusinessId = searchParams.get('leadBusinessId')
    const effectiveBusinessId = leadBusinessId || businessId

    const url = new URL(`/api/leads/${leadId}`, window.location.origin)
    url.searchParams.set('businessId', effectiveBusinessId)
    // ... rest of fetch logic
  }, [leadId, businessId, searchParams])
}
```

#### 3. WaitingToCallDetailsPageOptimized
**File**: [src/app/[business_id]/[permalink]/waiting-to-call-details/[leadId]/client-optimized.tsx](../src/app/[business_id]/[permalink]/waiting-to-call-details/[leadId]/client-optimized.tsx)

Added support for extracting and using the `leadBusinessId` query parameter:

```typescript
import { useSearchParams } from 'next/navigation'

const WaitingToCallDetailsPageOptimized = () => {
  const params = useParams()
  const searchParams = useSearchParams()

  const businessId = params.business_id as string
  const leadBusinessId = searchParams.get('leadBusinessId') || businessId

  // Use leadBusinessId for CallNextLeadButton to get next lead from correct business
  <CallNextLeadButton
    businessId={leadBusinessId}
    currentLeadId={leadId}
  />
}
```

#### 4. CallNextLeadButton
**File**: [src/components/CallNextLeadButton.tsx](../src/components/CallNextLeadButton.tsx)

Updated navigation logic to preserve business context in Waiting to Call mode:

```typescript
const handleCallNextLead = () => {
  const currentPath = window.location.pathname
  const isWaitingToCallMode = currentPath.includes('/waiting-to-call-details/')

  if (isWaitingToCallMode) {
    // Get current business context from URL to preserve it
    const pathSegments = currentPath.split('/').filter(Boolean)
    const currentBusinessId = pathSegments[0]
    const currentPermalink = pathSegments[1]

    // Navigate with current business context preserved
    const url = `/${currentBusinessId}/${currentPermalink}/waiting-to-call-details/${nextLead.id}?leadBusinessId=${businessId}`
    window.location.href = url
  } else {
    // For standard lead-details route, use normal navigation
    navigate(`/lead-details/${nextLead.id}`)
  }
}
```

## How It Works Now

### Scenario: Viewing Leads in Waiting to Call Mode

1. User is in Business A (URL: `/123/business-a/waiting-to-call`)
2. User sees leads from Business A, Business B, and Business C in the table
3. User clicks on a lead from Business B:
   - **Old behavior**: URL changes to `/456/business-b/waiting-to-call-details/789` (switches to Business B)
   - **New behavior**: URL stays as `/123/business-a/waiting-to-call-details/789?leadBusinessId=456`
4. The lead details are fetched using `leadBusinessId=456` from the query parameter
5. The header and navigation remain in Business A context
6. When user clicks "Call Next Lead", it gets the next lead from Business B (the lead's business)
7. When user navigates back, they return to Business A's Waiting to Call view

### Scenario: Viewing Leads in Per-Business Mode

1. User is in Business A (URL: `/123/business-a/new-leads`)
2. User clicks on a lead:
   - URL becomes `/123/business-a/lead-details/789` (stays in Business A)
3. No query parameters needed - the lead belongs to the current business

## Benefits

1. **Clear separation** between per-business mode and cross-business mode
2. **Stable business context** - the header and URL always reflect the current business
3. **Correct data fetching** - leads are fetched from their actual business regardless of URL context
4. **Consistent navigation** - users stay in the same business when browsing cross-business lists
5. **Explicit mode detection** - using `waiting-to-call-details` route to detect cross-business mode

## Testing Recommendations

1. **Test cross-business lead viewing**:
   - Navigate to Waiting to Call with multiple businesses
   - Click leads from different businesses
   - Verify URL business context doesn't change
   - Verify lead details are correct

2. **Test "Call Next Lead" button**:
   - Click "Call Next Lead" from a cross-business lead
   - Verify URL business context is preserved
   - Verify next lead is from the same business as current lead

3. **Test business switching**:
   - Switch businesses while in Waiting to Call mode
   - Verify leads refresh for new business
   - Navigate back and forth between businesses

4. **Test per-business mode**:
   - Navigate to regular lead-details route
   - Verify business context works as before
   - Ensure no regression in standard functionality

## URL Structure Summary

### Per-Business Mode
```
/{business_id}/{permalink}/lead-details/{lead_id}
/{business_id}/{permalink}/new-leads
/{business_id}/{permalink}/dashboard
```

### Waiting to Call Mode (Cross-Business)
```
/{current_business_id}/{current_permalink}/waiting-to-call
/{current_business_id}/{current_permalink}/waiting-to-call-details/{lead_id}?leadBusinessId={lead_business_id}
```

The key difference is the query parameter `leadBusinessId` which indicates the lead's actual business while preserving the current business context in the URL path.
