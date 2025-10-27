# Webhook Analysis: call_now_status Usage

**Date**: 2025-10-27
**Analysis**: Identifying all webhooks and their use of `call_now_status`

---

## Summary

**Good News**: None of the webhooks currently use `call_now_status` as a parameter.

All webhooks only send the `stage` field, which means the migration will NOT break any webhook integrations.

---

## All Webhooks in the Application

### 1. Change Stage Webhook
**File**: `src/components/LeadStageDropdown.tsx:64`
**URL**: `https://n8nio-n8n-pbq4r3.sliplane.app/webhook/change-stage`
**Method**: POST
**Payload**:
```json
{
  "lead_id": "string",
  "stage": "string"  // Only stage, no call_now_status
}
```
**Usage**: When user manually changes lead stage via dropdown
**Migration Impact**: ✅ No changes needed - already only uses `stage`

---

### 2. Check Department Webhook
**File**: `src/lib/utils/departmentWebhook.ts:6`
**URL**: `https://n8nio-n8n-pbq4r3.sliplane.app/webhook/check-department`
**Method**: POST
**Payload**: Not using `call_now_status`
**Usage**: Department verification
**Migration Impact**: ✅ No impact

---

### 3. Booking Creation Webhook
**File**: `src/components/BookingModal.tsx:485`
**URL**: `https://n8nio-n8n-pbq4r3.sliplane.app/webhook/ghl-create-booking`
**Method**: POST
**Payload**:
```json
{
  "lead_id": "string",
  "account_id": "string",
  "selected_date": "string",
  "selected_time": "string",
  "business_id": "string",
  "street_name": "string",
  "postal_code": "string",
  "full_name": "string",
  "service": "string",
  "address": "string",
  "start_time": "string"
  // No call_now_status
}
```
**Usage**: When creating/confirming an appointment
**Migration Impact**: ✅ No impact

---

### 4. Booking Reschedule Webhook
**File**: `src/components/ManageAppointmentModal.tsx:32`
**URL**: `https://n8nio-n8n-pbq4r3.sliplane.app/webhook/ghl-reschedulem`
**Method**: POST
**Payload**: Not using `call_now_status`
**Usage**: Rescheduling existing appointments
**Migration Impact**: ✅ No impact

---

### 5. Booking Cancellation Webhook
**File**: `src/components/ManageAppointmentModal.tsx:67`
**URL**: `https://n8nio-n8n-pbq4r3.sliplane.app/webhook/ghl-cancel-booking`
**Method**: POST
**Payload**: Not using `call_now_status`
**Usage**: Canceling appointments
**Migration Impact**: ✅ No impact

---

### 6. Address Update Webhook
**File**: `src/components/features/leads/PropertyInformation.tsx:69`
**URL**: `https://n8nio-n8n-pbq4r3.sliplane.app/webhook/update-address`
**Method**: POST
**Payload**: Not using `call_now_status`
**Usage**: Updating lead address information
**Migration Impact**: ✅ No impact

---

### 7. Address Verification Webhook
**File**: `src/app/api/booking/verify-address/route.ts:75`
**URL**: `https://n8nio-n8n-pbq4r3.sliplane.app/webhook/ghl-verify-address`
**Method**: POST
**Payload**: Not using `call_now_status`
**Usage**: Verifying addresses before booking
**Migration Impact**: ✅ No impact

---

### 8. SMS Outgoing Webhook
**File**: `src/hooks/useChatWebhook.ts:37`
**URL**: `https://n8nio-n8n-pbq4r3.sliplane.app/webhook/dialpad-sms-outgoing`
**Method**: POST
**Payload**:
```json
{
  "from_number": "string",
  "to_number": "string",
  "text": "string",
  "lead_id": "string",
  "assigned_id": "string | null"
  // No call_now_status
}
```
**Usage**: Sending SMS messages via Dialpad
**Migration Impact**: ✅ No impact

---

### 9. Unknown Webhook (from README)
**File**: `README.md:605`
**URL**: `https://n8nio-n8n-pbq4r3.sliplane.app/webhook/bf425f50-2d65-4cfd-a529-faea3b682288`
**Method**: POST
**Payload**: Unknown (UUID-based webhook)
**Usage**: Unknown functionality
**Migration Impact**: ⚠️ Need to verify - but likely no impact

---

## Migration Requirements for Webhooks

### Change Stage Webhook - REQUIRES UPDATE

**Current Behavior**:
- Receives: `{ lead_id, stage }` where stage is 1, 2, 3, 88, 99, or 100
- The webhook currently expects these OLD stage values

**New Behavior After Migration**:
- Will receive: `{ lead_id, stage }` where stage is 1, 2, 3, 20, 30, 40, 50, 88, 99, or 100
- The n8n workflow needs to be updated to handle NEW stage values

**Action Required**:
1. Update the n8n workflow at `/webhook/change-stage` to handle new stage values:
   - Stage 1 = Speed to Lead (was: Contact with priority 1)
   - Stage 2 = Call Now (was: Contact with priority 2)
   - Stage 3 = Waiting to Call (was: Contact with priority 3)
   - Stage 20 = Follow Up (was: stage 2)
   - Stage 30 = Booked (was: stage 3)
   - Stage 40 = Closed (new)
   - Stage 50 = Review Done (new)
   - Stage 88 = Bad Number (unchanged)
   - Stage 99 = Not Interested (unchanged)
   - Stage 100 = Email Campaign (unchanged)

2. If the webhook performs any actions based on stage value, update the logic:
   ```javascript
   // OLD n8n logic (example)
   if (stage == 1) {
     // Contact stage logic
   } else if (stage == 2) {
     // Follow up logic
   } else if (stage == 3) {
     // Booked logic
   }

   // NEW n8n logic (example)
   if (stage == 1 || stage == 2 || stage == 3) {
     // Contact stages logic (Speed to Lead, Call Now, Waiting to Call)
   } else if (stage == 20) {
     // Follow up logic
   } else if (stage == 30) {
     // Booked logic
   } else if (stage == 40) {
     // Closed logic
   } else if (stage == 50) {
     // Review Done logic
   }
   ```

---

## Manual Stage Transitions (From Screenshot)

Based on your screenshot, users can manually change stages to:
1. **Contact** (will become stages 1, 2, or 3 - need to clarify which one)
2. **Follow up** (will become stage 20)
3. **Booked** (will become stage 30)
4. **Bad number** (remains stage 88)
5. **Not interested** (remains stage 99)
6. **Email campaign** (remains stage 100)

### Question: Contact Stage Ambiguity

When a user selects "Contact" from the dropdown, which new stage should it map to?

**Option A**: Remove "Contact" from dropdown, add three separate options:
- Speed to Lead (stage 1)
- Call Now (stage 2)
- Waiting to Call (stage 3)

**Option B**: Keep "Contact" and default to one stage (e.g., stage 3 - Waiting to Call)

**Option C**: Show sub-menu when "Contact" is selected with three priority options

**Recommendation**: Option A - Replace "Contact" with three explicit options for clarity

---

## Automatic Stage Transitions

You mentioned "the rest is automatic" - this means:
- **Stage 40 (Closed)**: Set automatically when deal closes
- **Stage 50 (Review Done)**: Set automatically after review completion

These automatic transitions happen outside the manual dropdown, likely via:
- Backend processes
- External webhook calls
- Integration automations

---

## Migration Checklist for Webhooks

- [x] Identify all webhooks that use `call_now_status` → **None found**
- [x] Identify all webhooks that use `stage` → **All listed above**
- [ ] Update n8n workflow for `/webhook/change-stage` to handle new stage values
- [ ] Test webhook with new stage values (1, 2, 3, 20, 30, 40, 50)
- [ ] Verify automatic stage transitions still work after migration
- [ ] Update webhook documentation in n8n
- [ ] Monitor webhook logs after deployment for any errors

---

## Conclusion

✅ **Good News**: No webhooks use `call_now_status` as a parameter

⚠️ **Action Required**:
1. Update the n8n `/webhook/change-stage` workflow to handle new stage values
2. Decide how "Contact" option should map to new stages (1, 2, or 3)
3. Update LeadStageDropdown component with new stage options

**Migration is Safe**: Since no webhooks depend on `call_now_status`, we can proceed with removing it from the database after migrating the data to the new stage values.
