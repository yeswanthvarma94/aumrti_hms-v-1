
## Diagnosis (confirmed against your DB)

Looking at your two screenshots side-by-side:

- **Screenshot 1 (Billing):** the bill you opened — `BILL-20260418-0001` — is Yeswanth's **OPD bill** (`bill_type='opd'`, `admission_id=NULL`, status=Paid/Settled). It will never auto-pull IPD charges because it isn't an IPD bill. The other bill `BILL-20260418-0002` (₹1,814.4) belongs to **Siva**, not Yeswanth.
- **Screenshot 2 (IPD):** Yeswanth's Day-11 admission `IPD-20260407-6350` is real and active, but **no IPD bill row exists for it in the `bills` table.** Auto-pull cannot run on a bill that doesn't exist yet.

So the IPD billing isn't "not calculating" — there is literally no IPD bill object for Yeswanth's stay. The system today only creates one when you click **"Clear Billing →"** on the Discharge stepper (which navigates to `/billing?action=new&admission_id=X&type=ipd`). Since you haven't clicked that for Yeswanth yet, no bill, no charges.

This is a UX gap: nothing in the IPD workspace shows the admin "this admission has no live bill yet" or lets them open a running bill mid-stay. The discharge stepper is the only entry point, which is wrong for an 11-day stay where you want to see the running tab today.

## Fix Plan

### Change 1 — "Open Live IPD Bill" available any time during the stay
File: `src/components/ipd/tabs/IPDOverviewTab.tsx`

- Add a new always-visible button in the Overview header area (next to the discharge stepper): **"View / Update IPD Bill"**.
- Behaviour: navigate to `/billing?action=new&admission_id=X&type=ipd` exactly like the existing Clear Billing button. The existing `createDischargeBill` flow already handles both "create new" and "open existing + re-pull", so this single route works for both Day-1 and Day-11.
- Rename the stepper's existing button from "Clear Billing →" to "Finalise Billing →" so it's distinct from the live-bill action.

### Change 2 — Auto-create a draft IPD bill on admission
File: `src/components/ipd/AdmitPatientModal.tsx` (and any other place admissions are created)

- Right after the `admissions` insert succeeds, automatically insert a matching `bills` row:
  - `bill_type='ipd'`, `bill_status='draft'`, `payment_status='unpaid'`
  - `admission_id`, `patient_id`, `hospital_id` populated
  - `bill_number` from `generateBillNumber(hospitalId, 'BILL')`
- This guarantees every admission has a running tab from Day 1, not just at discharge.

### Change 3 — Make the billing queue surface admissions without bills
File: `src/pages/billing/BillingPage.tsx`

- In `fetchBills`, after loading bills, also query `admissions` where `status='active'` and there is no matching IPD bill, and render them as virtual "Pending IPD" rows in the bill list with a "Create Bill" button that calls the same `createDischargeBill(admissionId)` path.
- This way the billing team sees Yeswanth (Day 11, no bill) directly in their queue.

### Change 4 — Auto-pull on every open of a draft IPD bill (already half-done)
File: `src/components/billing/BillEditor.tsx`

The auto-pull `useEffect` (lines 128-147) already exists and looks correct. We will:
- Verify it actually fires by adding a one-shot toast on mount when `bill_type==='ipd'` and `admission_id` is set, confirming the pull ran (even if 0 inserted).
- Also re-run the pull whenever the user switches back to the Line Items tab if the bill is still `draft` and IPD — handles the "I added a new lab after opening the bill" case without needing the manual button.

### Change 5 — Cosmetic: clearer empty state on an IPD draft with 0 items
File: `src/components/billing/tabs/LineItemsTab.tsx`

- When `bill.bill_type==='ipd'`, `bill.admission_id` set, and `lineItems.length===0`, show a prominent "Recalculate IPD Charges" CTA in the empty area (instead of just the "+ Add Service" button) explaining what it pulls.

## Files Touched

| File | Change |
|------|--------|
| `src/components/ipd/tabs/IPDOverviewTab.tsx` | Add "View / Update IPD Bill" button; rename stepper button |
| `src/components/ipd/AdmitPatientModal.tsx` | Auto-create draft IPD bill on admission |
| `src/pages/billing/BillingPage.tsx` | Surface admissions without bills in the queue |
| `src/components/billing/BillEditor.tsx` | Confirm pull ran; re-pull on tab switch for IPD drafts |
| `src/components/billing/tabs/LineItemsTab.tsx` | Empty-state CTA for IPD drafts with 0 items |

## Expected Result

- For **existing** admissions like Yeswanth's Day-11 stay: open IPD → click new "View / Update IPD Bill" → bill is created on the fly with 11 days room + every doctor visit + every lab/rad/pharmacy item already pulled in.
- For **new** admissions going forward: a draft IPD bill exists from the moment the patient is admitted, visible in the billing queue, auto-updating as charges accrue.
- The billing team sees pending admissions directly in their queue, not just bills that already exist.
