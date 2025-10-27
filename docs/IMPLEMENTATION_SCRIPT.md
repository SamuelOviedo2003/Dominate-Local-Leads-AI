# Stage Migration Implementation Script

## Files Updated So Far ✅

1. ✅ `src/types/leads.ts` - Updated stage type, removed call_now_status
2. ✅ `src/components/LeadStageDropdown.tsx` - Updated to 8 stage options
3. ✅ `src/app/api/leads/waiting-to-call/route.ts` - Removed call_now_status filter

## Remaining Files to Update

### API Endpoints

#### 1. `src/app/api/leads/waiting-to-call-count/route.ts`
```typescript
// OLD
.eq('stage', 1)
.eq('call_now_status', 1)

// NEW
.eq('stage', 1)  // Speed to Lead only
```

#### 2. `src/app/api/leads/next-lead/route.ts`
```typescript
// OLD - Priority 1: Countdown leads
.eq('leads.business_id', businessId)
.eq('call_window', 1)
.eq('working_hours', true)
// ... countdown logic

// Priority 2: stage=1 with call_now_status in (1,2,3)
.eq('stage', 1)
.in('call_now_status', [1, 2, 3])
.order('call_now_status', { ascending: true })

// NEW - Priority 1: Still countdown leads (unchanged)
// Priority 2: stages 1, 2, 3 ordered by stage
.in('stage', [1, 2, 3])  // Speed to Lead, Call Now, Waiting to Call
.order('stage', { ascending: true })  // 1 highest priority
```

#### 3. `src/app/api/bookings/leads/route.ts`
```typescript
// OLD
.eq('stage', 3)

// NEW
.eq('stage', 30)  // Booked
```

### Client Components

#### 4. `src/app/(dashboard)/new-leads/client.tsx`
```typescript
// OLD
const callNowLeads = useMemo(
  () => recentLeads ? recentLeads.filter(lead =>
    lead.stage === 1 && (lead.call_now_status === 1 || lead.call_now_status === 2)
  ) : [],
  [recentLeads]
)
const waitingToCallLeads = useMemo(
  () => recentLeads ? recentLeads.filter(lead =>
    lead.stage === 1 && lead.call_now_status === 3
  ) : [],
  [recentLeads]
)

// NEW
const callNowLeads = useMemo(
  () => recentLeads ? recentLeads.filter(lead => lead.stage === 2) : [],
  [recentLeads]
)
const waitingToCallLeads = useMemo(
  () => recentLeads ? recentLeads.filter(lead => lead.stage === 3) : [],
  [recentLeads]
)
```

#### 5. `src/components/FollowUpClient.tsx`
```typescript
// OLD
const followUpLeads = useMemo(
  () => recentLeads ? recentLeads.filter(lead => lead.stage === 2) : [],
  [recentLeads]
)

// NEW
const followUpLeads = useMemo(
  () => recentLeads ? recentLeads.filter(lead => lead.stage === 20) : [],
  [recentLeads]
)
```

### Hooks

#### 6. `src/hooks/useWaitingToCallCount.ts`
```typescript
// Update comments and logic if needed
// Likely just comment updates since it calls the API
```

#### 7. `src/components/CallNextLeadButton.tsx`
```typescript
// Review for any call_now_status references
// Update comments if any
```

---

## Database Migration SQL

### Step 1: Backup Data
```sql
-- Create backup table
CREATE TABLE leads_backup_pre_stage_migration AS
SELECT * FROM leads;

-- Verify backup
SELECT COUNT(*) FROM leads;
SELECT COUNT(*) FROM leads_backup_pre_stage_migration;
-- Both should match
```

### Step 2: Analyze Current Data Distribution
```sql
-- See current distribution
SELECT
  stage,
  call_now_status,
  COUNT(*) as count
FROM leads
GROUP BY stage, call_now_status
ORDER BY stage, call_now_status;
```

### Step 3: Migrate Data
```sql
-- Convert stage values based on call_now_status
UPDATE leads
SET stage = CASE
  -- Stage 1 (Contact) splits based on call_now_status
  WHEN stage = 1 AND call_now_status = 1 THEN 1   -- Speed to Lead
  WHEN stage = 1 AND call_now_status = 2 THEN 2   -- Call Now
  WHEN stage = 1 AND call_now_status = 3 THEN 3   -- Waiting to Call
  WHEN stage = 1 AND call_now_status IS NULL THEN 3  -- Default to Waiting to Call

  -- Stage 2 (Follow up) becomes 20
  WHEN stage = 2 THEN 20

  -- Stage 3 (Booked) becomes 30
  WHEN stage = 3 THEN 30

  -- Keep other stages unchanged (88, 99, 100)
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

### Step 4: Validation Queries
```sql
-- Check for any unexpected stage values
SELECT DISTINCT stage FROM leads ORDER BY stage;
-- Should see: 1, 2, 3, 20, 30, and possibly 88, 99, 100

-- Check leads that should be in "Speed to Lead" (stage 1)
SELECT COUNT(*) FROM leads WHERE stage = 1;

-- Check leads that should be in "Call Now" (stage 2)
SELECT COUNT(*) FROM leads WHERE stage = 2;

-- Check leads that should be in "Waiting to Call" (stage 3)
SELECT COUNT(*) FROM leads WHERE stage = 3;

-- Check leads that should be in "Follow Up" (stage 20)
SELECT COUNT(*) FROM leads WHERE stage = 20;

-- Check leads that should be in "Booked" (stage 30)
SELECT COUNT(*) FROM leads WHERE stage = 30;

-- Verify no leads with old stage 2 or 3 remain (should be 0)
SELECT COUNT(*) FROM leads WHERE stage = 2 AND call_now_status IS NOT NULL;
SELECT COUNT(*) FROM leads WHERE stage = 3 AND call_now_status IS NOT NULL;
```

### Step 5: (Optional) Remove call_now_status Column
```sql
-- WAIT 30 DAYS BEFORE DOING THIS
-- This gives you time to rollback if needed

-- After confirming everything works:
ALTER TABLE leads DROP COLUMN call_now_status;
```

---

## Rollback Plan (Emergency Use Only)

If something goes wrong:

```sql
-- Step 1: Restore from backup
TRUNCATE leads;

INSERT INTO leads
SELECT * FROM leads_backup_pre_stage_migration;

-- Step 2: Verify restoration
SELECT COUNT(*) FROM leads;

-- Step 3: Check data matches backup
SELECT
  stage,
  call_now_status,
  COUNT(*) as count
FROM leads
GROUP BY stage, call_now_status
ORDER BY stage, call_now_status;
```

Then revert all code changes via git:
```bash
git checkout src/types/leads.ts
git checkout src/components/LeadStageDropdown.tsx
git checkout src/app/api/leads/waiting-to-call/route.ts
# ... revert other files
```

---

## Testing Checklist

### Pre-Deployment Tests (Development)

- [ ] Run TypeScript compilation: `npm run type-check`
- [ ] Test dropdown shows 8 options
- [ ] Test selecting each stage option
- [ ] Test webhook receives correct stage values
- [ ] Run database migration on dev database
- [ ] Verify lead counts match before/after migration
- [ ] Test "Waiting to Call (All)" section shows stage=1 leads
- [ ] Test "Call Now" table shows stage=2 leads
- [ ] Test "Waiting to Call" table shows stage=3 leads
- [ ] Test "Follow Up" section shows stage=20 leads
- [ ] Test "Bookings" section shows stage=30 leads
- [ ] Test "Call Next Lead" button works correctly
- [ ] Test cross-business navigation still works

### Post-Deployment Tests (Production)

- [ ] Monitor error logs for any stage-related errors
- [ ] Verify lead counts in each section match expectations
- [ ] Test user workflows:
  - [ ] Create new lead → appears in correct section
  - [ ] Move lead through stages → updates correctly
  - [ ] "Call Next Lead" → gets correct priority lead
- [ ] Verify n8n webhook handles new stage values
- [ ] Check performance - no degradation
- [ ] Validate with real users

---

## n8n Webhook Updates

The `/webhook/change-stage` workflow needs to handle new stage values:

```javascript
// In n8n workflow
const stage = parseInt($json.stage);

// Map stage to actions
switch(stage) {
  case 1:
    // Speed to Lead logic
    break;
  case 2:
    // Call Now logic
    break;
  case 3:
    // Waiting to Call logic
    break;
  case 20:
    // Follow Up logic
    break;
  case 30:
    // Booked logic
    // Might trigger calendar integration
    break;
  case 40:
    // Closed logic
    // Might trigger revenue tracking
    break;
  case 50:
    // Review Done logic
    break;
  case 88:
    // Bad Number logic
    break;
  case 99:
    // Not Interested logic
    break;
  case 100:
    // Email Campaign logic
    break;
  default:
    // Unknown stage
    console.error('Unknown stage:', stage);
}
```

---

## Deployment Steps

1. **Update n8n webhook first** (can handle both old and new values temporarily)
2. **Deploy code changes** to production
3. **Run database migration** during low-traffic period
4. **Monitor for 24 hours**
5. **Verify all sections working correctly**
6. **After 30 days**: Consider removing `call_now_status` column

---

## Timeline

| Task | Duration | Cumulative |
|------|----------|------------|
| Update remaining code files | 2 hours | 2 hours |
| Test on development | 2 hours | 4 hours |
| Update n8n webhook | 1 hour | 5 hours |
| Deploy to production | 1 hour | 6 hours |
| Run database migration | 30 mins | 6.5 hours |
| Monitor and validate | 2 hours | 8.5 hours |
| **Total** | **~9 hours** | |

---

## Success Metrics

✅ Migration is successful when:
1. All TypeScript compiles with no errors
2. All 8 dropdown options work correctly
3. Database migration completes without errors
4. All sections show correct lead counts
5. User workflows function normally
6. n8n webhook processes all stage changes
7. No errors in production logs
8. Users can set priority explicitly via dropdown
9. No call_now_status dependencies remain in code
10. System is simpler and easier to understand
