

# Fix: Billing Line Items + Insurance Pre-Auth Navigation

## Root Causes

### Issue 1: Unable to add services to bills
The `bill_line_items` table has a CHECK constraint on `item_type` that only allows: `consultation, procedure, room_charge, lab, radiology, pharmacy, surgery, package, nursing, consumable, blood, oxygen, other`.

However, the `service_master` records have `item_type = 'service'` (the default from the ALTER TABLE migration). When `addServiceItem()` in `LineItemsTab.tsx` tries to insert with `svc.item_type || "other"`, it uses `'service'` from the DB — which violates the CHECK constraint, causing a silent insert failure.

**Fix**: Two-part fix:
1. **Database migration**: Add `'service'` to the allowed values in the CHECK constraint on `bill_line_items.item_type`, OR update all `service_master` rows where `item_type = 'service'` to map to a valid value like `'other'`.
   - Preferred: ALTER the CHECK constraint to include `'service'`.
2. **Code fix** in `LineItemsTab.tsx`: Map unknown `item_type` values to `'other'` as a fallback when inserting, so even if future services have unexpected types, inserts won't fail.

### Issue 2: Insurance "Request Pre-Auth" not working
Currently, clicking "Request Pre-Auth" in Active Admissions calls `onNavigate("preauth")` which switches to the Pre-Auth Queue tab. But the Pre-Auth Queue only shows existing `insurance_pre_auth` records — there are none (0 in DB). The user expects clicking the button to open a form for that specific admission.

**Fix**: When "Request Pre-Auth" is clicked:
1. Navigate to the Pre-Auth Queue tab
2. Pass the admission data (admission_id, patient_id, patient_name, tpa_name) to PreAuthQueue
3. In PreAuthQueue, accept an optional `initialAdmission` prop. When present, auto-open the right panel with a new unsaved form pre-filled with that admission's details (TPA from admission's insurance_type, patient info, etc.)

## Changes

### Step 1: Database Migration
```sql
ALTER TABLE public.bill_line_items 
  DROP CONSTRAINT IF EXISTS bill_line_items_item_type_check;
ALTER TABLE public.bill_line_items 
  ADD CONSTRAINT bill_line_items_item_type_check 
  CHECK (item_type IN ('consultation','procedure','room_charge','lab','radiology','pharmacy','surgery','package','nursing','consumable','blood','oxygen','other','service'));
```

### Step 2: LineItemsTab.tsx
- In `addServiceItem()`, add fallback mapping: if `svc.item_type` is not in the known list, default to `'other'`.
- Add error handling (toast on insert failure) so issues are visible.

### Step 3: InsurancePage.tsx
- Change `renderContent` for "preauth" to pass `initialAdmission` prop when navigating from Active Admissions.
- Store selected admission data in state when `onNavigate` is called.

### Step 4: ActiveAdmissions.tsx
- Change `onNavigate` callback to also pass the admission row data: `onNavigate("preauth", admissionRow)`.

### Step 5: PreAuthQueue.tsx
- Accept optional `initialAdmission` prop with admission_id, patient_id, patient_name, tpa_name.
- When prop is provided, auto-open the right panel with a "New Pre-Auth" form pre-filled with that data (unsaved until user clicks Submit/Save Draft).
- Add a "Create" flow that inserts into `insurance_pre_auth` on submit.

