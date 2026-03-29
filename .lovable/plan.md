

## Plan: Sync Billing & Pharmacy Status to IPD Discharge Workflow

### Problem
The discharge stepper's "Billing" and "Pharmacy" steps don't sync with actual data:
- **Billing**: When payment is collected on the Billing page, it never sets `admissions.billing_cleared = true`
- **Pharmacy**: When all IP dispensing is completed, it never sets `admissions.pharmacy_cleared = true`

Both are manual toggles with no connection to real billing/pharmacy records.

### Solution

**1. Auto-sync billing_cleared when bill is paid**

**File: `src/components/billing/tabs/PaymentsTab.tsx`** (~line 90-94)
- After updating `bills.payment_status` to `paid`, check if this bill has an `admission_id`
- If yes, set `admissions.billing_cleared = true` on that admission
- This makes the discharge stepper automatically advance past step 2 when the IPD bill is fully paid

**2. Auto-sync pharmacy_cleared when all IP meds dispensed**

**File: `src/components/pharmacy/ip/DispensingWorkspace.tsx`**
- After a successful dispense, check if the prescription's admission has any remaining undispensed items
- If all items for that admission are dispensed, set `admissions.pharmacy_cleared = true`

**3. IPD Overview reads real-time status**

**File: `src/components/ipd/tabs/IPDOverviewTab.tsx`**
- For billing step: also query `bills` table for any bill with this `admission_id` and `payment_status = 'paid'` — if found, treat billing as cleared (even if `billing_cleared` flag wasn't set yet)
- For pharmacy step: also query `pharmacy_dispensing` for any pending IP dispenses for this admission — if none pending, treat pharmacy as cleared
- This makes the stepper reflect real data, not just flags

### Technical Details

**PaymentsTab.tsx** — add after line 94 (after `bills.update`):
```typescript
// If bill is for IPD admission and fully paid, mark billing cleared
if (newStatus === "paid" && bill.admission_id) {
  await supabase.from("admissions")
    .update({ billing_cleared: true })
    .eq("id", bill.admission_id);
}
```

**DispensingWorkspace.tsx** — after successful dispense callback:
```typescript
// Check if all prescriptions for this admission are dispensed
// If so, update admissions.pharmacy_cleared = true
```

**IPDOverviewTab.tsx** — enhance the useEffect that loads admission data:
- Add a query to `bills` where `admission_id = admissionId` and check if `payment_status = 'paid'`
- Add a query to `pharmacy_dispensing` where `admission_id = admissionId` and `status = 'pending'`
- Use these real queries to set `billingCleared` and `pharmacyCleared` states

### Files Modified
1. `src/components/billing/tabs/PaymentsTab.tsx` — set `billing_cleared` on admission when bill paid
2. `src/components/pharmacy/ip/DispensingWorkspace.tsx` — set `pharmacy_cleared` when all IP meds done
3. `src/components/ipd/tabs/IPDOverviewTab.tsx` — read real billing/pharmacy status, not just flags

