

## Root Cause

When clicking "Clear Billing" from IPD Overview, the system *does* run an auto-pull (`autoPullAdmissionCharges` in `src/pages/billing/BillingPage.tsx`) that includes:
- Room/bed charges (per ward × days)
- Lab orders (via `lab_orders.admission_id`)
- Radiology orders (via `radiology_orders.admission_id`)
- Pharmacy IP dispenses (via `pharmacy_dispensing.admission_id`)
- Nursing procedures
- Other sibling bills linked to the admission

But it has **three real gaps**:

1. **Doctor consultation / visit charges are NEVER pulled.** No code reads `ward_round_notes` (or any doctor-visit table) to bill per-visit consultant fees. The screenshot patient has been admitted 11 days — zero consultation charges currently get added.

2. **Auto-pull only triggers from the URL deep-link** (`/billing?action=new&admission_id=X&type=ipd`). If the user opens an existing IPD bill, or creates an IPD bill via "+ New Bill" in the billing queue, **no auto-pull runs at all** — the bill stays empty until manually populated.

3. **No "Refresh / Re-pull charges" button on an existing IPD bill.** New lab/radiology/pharmacy items added after the bill was first created never flow in unless the user opens the existing "Add Unbilled Services" modal (which only covers pharmacy/lab/radiology, not room or doctor visits).

## Fix Plan

### Change 1 — Add doctor visit / consultation charges to the auto-pull
File: `src/pages/billing/BillingPage.tsx` (`autoPullAdmissionCharges`)

- Query `ward_round_notes` for the admission, group by `doctor_id` + `created_at::date` to get one chargeable visit per doctor per day.
- Look up rate from `service_master` where `item_type = 'consultation'` (filtered by doctor's specialty/department if available; fallback to a generic IPD visit rate).
- Insert one `bill_line_items` row per visit-day with `item_type: 'consultation'`, `source_module: 'ipd_visit'`, `source_record_id: 'visit:{doctor_id}:{date}'` so the `addUniqueItem` dedupe key prevents double-billing on re-pull.

### Change 2 — Run auto-pull whenever an IPD bill is opened, not just from the discharge URL
File: `src/components/billing/BillEditor.tsx` + `src/pages/billing/BillingPage.tsx`

- Export `autoPullAdmissionCharges` from `BillingPage` (or move it to `src/lib/ipdBilling.ts` as a shared util).
- In `BillEditor`, when `bill.bill_type === 'ipd'` and `bill.admission_id` is set and `bill.bill_status === 'draft'`, run the pull on first load. The dedupe logic already prevents duplicates on subsequent opens.

### Change 3 — Add a manual "Recalculate IPD Charges" button
File: `src/components/billing/tabs/LineItemsTab.tsx`

- For IPD bills (`bill.admission_id` truthy), show a "Recalculate IPD Charges" button next to the existing "Add Unbilled Services" button.
- Button calls the shared `autoPullAdmissionCharges(bill.id, bill.admission_id)` then `recalculateBillTotalsSafe(bill.id)` and refreshes line items.
- Toast: "Pulled X new charges (room, doctor visits, lab, radiology, pharmacy, nursing)".

### Change 4 — Make sure room charges always recompute on re-pull
File: `src/pages/billing/BillingPage.tsx`

The current dedupe key for room is `room:{admissionId}`, which means if the patient stays longer the room days don't update. Fix:
- Before re-inserting room, delete the previous room line item (`source_record_id = room:{admissionId}`) and insert a fresh one with the latest day count.

### Change 5 — Seed default service_master rates if missing
The pull falls back to hard-coded rates (₹500 room, ₹200 lab, ₹500 rad, ₹150 nursing) only when `service_master` has no matching row. Add a one-line toast warning when fallback rates are used so the admin knows to configure rates in Settings → Service Rates.

### Files Touched

| File | Change |
|------|--------|
| `src/pages/billing/BillingPage.tsx` | Add doctor visit pull; fix room re-pull; export pull function |
| `src/lib/ipdBilling.ts` (new) | Shared `autoPullAdmissionCharges` util |
| `src/components/billing/BillEditor.tsx` | Auto-run pull when opening a draft IPD bill |
| `src/components/billing/tabs/LineItemsTab.tsx` | Add "Recalculate IPD Charges" button |

### Expected Result

- Opening the IPD bill (whether from "Clear Billing" or from the billing queue) auto-fills: room × days, every doctor visit per day, all lab orders, all radiology orders, all IP pharmacy dispenses, all nursing procedures, and any sibling bills linked to the admission.
- "Recalculate IPD Charges" button lets staff re-pull at any time (e.g., after a new lab is ordered post-discharge clearance) without duplicates.
- Room days always reflect the current length of stay.

