# Stage Field Migration Plan
## From call_now_status to Unified stage Field

**Date**: 2025-10-27
**Status**: Planning Phase

---

## Executive Summary

This document outlines the migration from using both `stage` and `call_now_status` fields to using only the `stage` field for lead categorization and filtering.

### Current System
- Uses `stage` (1, 2, 3, 88, 99, 100) for lifecycle stage
- Uses `call_now_status` (1, 2, 3, null) for priority within stage 1
- Two fields control lead visibility in different sections

### New System
- Uses only `stage` field with expanded values
- Each stage value directly maps to a section/priority
- Simplified logic, clearer semantics

---

## New Stage Mapping

| New Stage | Previous Mapping | Label | Description |
|-----------|------------------|-------|-------------|
| **1** | stage=1 & call_now_status=1 | Speed to Lead | Highest priority, cross-business view |
| **2** | stage=1 & call_now_status=2 | Call Now | High priority, needs immediate attention |
| **3** | stage=1 & call_now_status=3 | Waiting to Call | Normal priority queue |
| **20** | stage=2 | Follow Up | Follow-ups from new leads, incoming calls not closed |
| **30** | stage=3 | Booked | Scheduled appointments |
| **40** | N/A (New) | Closed | Successfully closed deals |
| **50** | N/A (New) | Review Done | Completed and reviewed |
| **88** | stage=88 | Bad Number | Invalid phone number |
| **99** | stage=99 | Not Interested | Lead declined service |
| **100** | stage=100 | Email Campaign | In marketing campaign |

---

## Section Filtering Requirements

### After Migration

| Section | Stage Filter | Business Scope |
|---------|-------------|----------------|
| **Waiting to Call (All)** | stage = 1 | All accessible |
| **New Leads - Call Now** | stage = 2 | Current only |
| **New Leads - Waiting to Call** | stage = 3 | Current only |
| **Follow Up** | stage = 20 | Current only |
| **Bookings** | stage = 30 | Current only |

---

## Migration Steps

### Phase 1: Database Schema (Preparation)
1. ✅ Review current `stage` column definition
2. ⏳ Create data migration script to convert existing data
3. ⏳ Test migration on development database
4. ⏳ Backup production database

### Phase 2: Data Migration
```sql
-- Migration script to convert call_now_status to stage values
UPDATE leads
SET stage = CASE
  WHEN stage = 1 AND call_now_status = 1 THEN 1  -- Speed to Lead
  WHEN stage = 1 AND call_now_status = 2 THEN 2  -- Call Now
  WHEN stage = 1 AND call_now_status = 3 THEN 3  -- Waiting to Call
  WHEN stage = 1 AND call_now_status IS NULL THEN 3  -- Default to Waiting to Call
  WHEN stage = 2 THEN 20  -- Follow Up
  WHEN stage = 3 THEN 30  -- Booked
  WHEN stage = 88 THEN 88  -- Bad Number (unchanged)
  WHEN stage = 99 THEN 99  -- Not Interested (unchanged)
  WHEN stage = 100 THEN 100  -- Email Campaign (unchanged)
  ELSE stage
END
WHERE stage IN (1, 2, 3);

-- Verify migration
SELECT
  stage,
  call_now_status,
  COUNT(*) as count
FROM leads
GROUP BY stage, call_now_status
ORDER BY stage, call_now_status;
```

### Phase 3: Type Definitions
**File**: `src/types/leads.ts`

```typescript
// OLD
stage: 1 | 2 | 3 | 88 | 99 | 100
call_now_status?: 1 | 2 | 3 | null

// NEW
stage: 1 | 2 | 3 | 20 | 30 | 40 | 50 | 88 | 99 | 100
// Remove call_now_status field
```

### Phase 4: API Endpoints

#### Update `/api/leads/waiting-to-call/route.ts`
```typescript
// OLD
.eq('stage', 1)
.eq('call_now_status', 1)

// NEW
.eq('stage', 1)  // Speed to Lead
```

#### Update `/api/leads/waiting-to-call-count/route.ts`
```typescript
// OLD
.eq('stage', 1)
.eq('call_now_status', 1)

// NEW
.eq('stage', 1)
```

#### Update `/api/leads/next-lead/route.ts`
```typescript
// OLD
.eq('stage', 1)
.in('call_now_status', [1, 2, 3])
.order('call_now_status', { ascending: true })

// NEW
.in('stage', [1, 2, 3])  // Speed to Lead, Call Now, Waiting to Call
.order('stage', { ascending: true })  // 1 highest priority
```

#### Update `/api/bookings/leads/route.ts`
```typescript
// OLD
.eq('stage', 3)

// NEW
.eq('stage', 30)  // Booked
```

### Phase 5: Client Components

#### Update `src/app/(dashboard)/new-leads/client.tsx`
```typescript
// OLD
const callNowLeads = recentLeads.filter(lead =>
  lead.stage === 1 && (lead.call_now_status === 1 || lead.call_now_status === 2)
)
const waitingToCallLeads = recentLeads.filter(lead =>
  lead.stage === 1 && lead.call_now_status === 3
)

// NEW
const callNowLeads = recentLeads.filter(lead => lead.stage === 2)
const waitingToCallLeads = recentLeads.filter(lead => lead.stage === 3)
```

#### Update `src/components/FollowUpClient.tsx`
```typescript
// OLD
const followUpLeads = recentLeads.filter(lead => lead.stage === 2)

// NEW
const followUpLeads = recentLeads.filter(lead => lead.stage === 20)
```

### Phase 6: LeadStageDropdown Component

**File**: `src/components/LeadStageDropdown.tsx`

```typescript
// OLD
interface LeadStageDropdownProps {
  currentStage: 1 | 2 | 3 | 88 | 99 | 100
}

const STAGE_OPTIONS: StageOption[] = [
  { value: 1, label: 'Contact' },
  { value: 2, label: 'Follow up' },
  { value: 3, label: 'Booked' },
  { value: 88, label: 'Bad number' },
  { value: 99, label: 'Not interested' },
  { value: 100, label: 'Email campaign' }
]

// NEW
interface LeadStageDropdownProps {
  currentStage: 1 | 2 | 3 | 20 | 30 | 40 | 50 | 88 | 99 | 100
}

const STAGE_OPTIONS: StageOption[] = [
  { value: 1, label: 'Speed to Lead' },
  { value: 2, label: 'Call Now' },
  { value: 3, label: 'Waiting to Call' },
  { value: 20, label: 'Follow Up' },
  { value: 30, label: 'Booked' },
  { value: 40, label: 'Closed' },
  { value: 50, label: 'Review Done' },
  { value: 88, label: 'Bad Number' },
  { value: 99, label: 'Not Interested' },
  { value: 100, label: 'Email Campaign' }
]
```

### Phase 7: Utility Functions

Create a new utility file for stage helpers:

**File**: `src/lib/utils/stageUtils.ts`

```typescript
export type LeadStage = 1 | 2 | 3 | 20 | 30 | 40 | 50 | 88 | 99 | 100

export interface StageConfig {
  value: LeadStage
  label: string
  description: string
  color: string
  section: string
}

export const STAGE_CONFIGS: Record<LeadStage, StageConfig> = {
  1: {
    value: 1,
    label: 'Speed to Lead',
    description: 'Highest priority, needs immediate attention',
    color: 'red',
    section: 'waiting-to-call-all'
  },
  2: {
    value: 2,
    label: 'Call Now',
    description: 'High priority, elevated attention',
    color: 'orange',
    section: 'new-leads-call-now'
  },
  3: {
    value: 3,
    label: 'Waiting to Call',
    description: 'Normal priority queue',
    color: 'blue',
    section: 'new-leads-waiting'
  },
  20: {
    value: 20,
    label: 'Follow Up',
    description: 'Needs follow-up action',
    color: 'purple',
    section: 'follow-up'
  },
  30: {
    value: 30,
    label: 'Booked',
    description: 'Appointment scheduled',
    color: 'green',
    section: 'bookings'
  },
  40: {
    value: 40,
    label: 'Closed',
    description: 'Deal closed successfully',
    color: 'green-dark',
    section: 'closed'
  },
  50: {
    value: 50,
    label: 'Review Done',
    description: 'Completed and reviewed',
    color: 'gray',
    section: 'archived'
  },
  88: {
    value: 88,
    label: 'Bad Number',
    description: 'Invalid phone number',
    color: 'red-dark',
    section: 'archived'
  },
  99: {
    value: 99,
    label: 'Not Interested',
    description: 'Lead declined service',
    color: 'gray-dark',
    section: 'archived'
  },
  100: {
    value: 100,
    label: 'Email Campaign',
    description: 'In marketing campaign',
    color: 'indigo',
    section: 'campaigns'
  }
}

export function getStageLabel(stage: LeadStage): string {
  return STAGE_CONFIGS[stage]?.label || 'Unknown'
}

export function getStageColor(stage: LeadStage): string {
  return STAGE_CONFIGS[stage]?.color || 'gray'
}

export function getStageDescription(stage: LeadStage): string {
  return STAGE_CONFIGS[stage]?.description || ''
}

export function isActiveStage(stage: LeadStage): boolean {
  return stage <= 30
}

export function isArchivedStage(stage: LeadStage): boolean {
  return stage === 40 || stage === 50 || stage === 88 || stage === 99
}
```

---

## Files to Update

### Core Files (Critical Path)
1. ✅ `src/types/leads.ts` - Type definitions
2. ⏳ `src/app/api/leads/waiting-to-call/route.ts` - Waiting to Call API
3. ⏳ `src/app/api/leads/waiting-to-call-count/route.ts` - Count API
4. ⏳ `src/app/api/leads/next-lead/route.ts` - Next lead priority
5. ⏳ `src/app/api/bookings/leads/route.ts` - Bookings API
6. ⏳ `src/app/(dashboard)/new-leads/client.tsx` - New Leads filters
7. ⏳ `src/components/FollowUpClient.tsx` - Follow Up filter
8. ⏳ `src/components/LeadStageDropdown.tsx` - Stage selector

### Supporting Files
9. ⏳ `src/hooks/useWaitingToCallCount.ts` - Count hook
10. ⏳ `src/components/CallNextLeadButton.tsx` - Button logic
11. ⏳ `src/app/api/leads/metrics/route.ts` - Metrics calculations

### Documentation Files
12. ⏳ `docs/LEAD_FILTERING_REQUIREMENTS.md` - Update requirements
13. ⏳ `.agent/Tasks/waiting-to-call.md` - Product docs
14. ⏳ `.agent/System/waiting-to-call.md` - Technical docs
15. ⏳ `.agent/Tasks/new-leads.md` - New Leads docs

---

## Testing Strategy

### Unit Tests
- [ ] Test stage conversion logic
- [ ] Test filtering functions for each section
- [ ] Test dropdown stage options

### Integration Tests
- [ ] Test API endpoints return correct leads for each stage
- [ ] Test cross-business filtering still works
- [ ] Test stage transitions via dropdown

### End-to-End Tests
- [ ] Create lead with stage 1 → appears in "Waiting to Call (All)"
- [ ] Create lead with stage 2 → appears in "Call Now" table
- [ ] Create lead with stage 3 → appears in "Waiting to Call" table
- [ ] Create lead with stage 20 → appears in "Follow Up"
- [ ] Create lead with stage 30 → appears in "Bookings"
- [ ] Change stage via dropdown → updates correctly
- [ ] Test "Call Next Lead" button uses stage priority

### Data Validation Tests
- [ ] All leads have valid stage values after migration
- [ ] No leads have stage=1 with call_now_status anymore
- [ ] All stage 2 and 3 (old) are converted to 20 and 30
- [ ] Count queries return same results before/after migration

---

## Rollback Plan

If issues arise during migration:

### Immediate Rollback (Database Level)
```sql
-- Restore from backup
-- If backup not available, reverse conversion:

UPDATE leads
SET
  stage = CASE
    WHEN stage = 1 THEN 1
    WHEN stage = 2 THEN 1
    WHEN stage = 3 THEN 1
    WHEN stage = 20 THEN 2
    WHEN stage = 30 THEN 3
    ELSE stage
  END,
  call_now_status = CASE
    WHEN stage = 1 THEN 1
    WHEN stage = 2 THEN 2
    WHEN stage = 3 THEN 3
    ELSE call_now_status
  END
WHERE stage IN (1, 2, 3, 20, 30);
```

### Code Rollback
- Revert all code changes via git
- Restore previous type definitions
- Restore previous API filters

---

## Timeline Estimate

| Phase | Duration | Dependencies |
|-------|----------|-------------|
| Phase 1: Database Schema | 1 hour | None |
| Phase 2: Data Migration | 2 hours | Phase 1 |
| Phase 3: Type Definitions | 30 mins | Phase 2 |
| Phase 4: API Endpoints | 2 hours | Phase 3 |
| Phase 5: Client Components | 2 hours | Phase 4 |
| Phase 6: LeadStageDropdown | 1 hour | Phase 5 |
| Phase 7: Utility Functions | 1 hour | Phase 3 |
| Testing | 3 hours | All phases |
| Documentation | 2 hours | All phases |
| **Total** | **~14 hours** | Sequential |

---

## Risk Assessment

### High Risk
- **Data Migration**: Converting existing leads incorrectly could break filtering
  - **Mitigation**: Test on dev first, backup before production migration
- **Breaking Changes**: All sections depend on stage filtering
  - **Mitigation**: Comprehensive testing, gradual rollout

### Medium Risk
- **Business Logic Changes**: Stage transitions might need webhook updates
  - **Mitigation**: Update n8n webhook to handle new stage values
- **Performance**: New stage values might need index updates
  - **Mitigation**: Add index on stage column if not exists

### Low Risk
- **UI Updates**: Dropdown labels change but logic stays same
  - **Mitigation**: Update labels, test dropdown still works

---

## Success Criteria

✅ Migration is successful when:
1. All leads have correct new stage values
2. No leads have call_now_status field dependency
3. All sections display correct leads based on stage only
4. LeadStageDropdown shows all 10 stage options
5. Stage transitions work via dropdown
6. "Call Next Lead" button respects new stage priority
7. All tests pass
8. Documentation updated
9. No performance degradation
10. Rollback plan tested and documented

---

## Post-Migration

### Cleanup Tasks
1. [ ] Remove `call_now_status` column from database (after 30 days safety period)
2. [ ] Remove `call_now_status` from TypeScript types permanently
3. [ ] Archive old migration scripts
4. [ ] Update all documentation to reflect new system

### Monitoring
- Track lead distribution across new stages
- Monitor API response times
- Watch for any stage-related errors in logs
- Validate metrics calculations are correct

---

## Questions to Resolve

1. **Webhook Integration**: Does the n8n webhook at `https://n8nio-n8n-pbq4r3.sliplane.app/webhook/change-stage` need updates to handle new stage values?

2. **Stage Transitions**: What are the allowed transitions? (e.g., Can stage 1 go directly to stage 30?)

3. **Closed & Review Done**: When should leads move to stage 40 (Closed) vs stage 50 (Review Done)? Is this manual or automatic?

4. **Metrics**: Do any dashboard metrics depend on call_now_status? Need to update them?

5. **Historical Data**: Should we keep call_now_status column for historical analysis or remove it completely?

6. **External Systems**: Are there any external integrations that read call_now_status?
