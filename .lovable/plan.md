
# Phase 3 — Replace `SELECT *` on List Views

Goal: Reduce JSON payload sizes by 30–60% on the highest-traffic list pages by selecting only the columns each list actually renders. Detail/edit drawers keep `select('*')` since they fetch a single row.

## Scope

Only **list views** are touched. Single-row fetches (drawers, edit modals, RPC inputs) are left alone — they're already cheap.

## Files to modify

| File | Current `.select('*')` site | Columns to keep |
|---|---|---|
| `src/pages/billing/BillingPage.tsx` | bills list query | `id, bill_number, bill_type, bill_date, total_amount, paid_amount, payment_status, bill_status, admission_id, patient_id, encounter_id, created_at` + `patient:patients(full_name, uhid, phone)` |
| `src/components/billing/BillQueue.tsx` | bills list (if present) | same column set as above |
| `src/pages/patients/PatientsPage.tsx` | patients list | `id, uhid, full_name, phone, gender, date_of_birth, blood_group, is_active, created_at` |
| `src/pages/ipd/IPDPage.tsx` | admissions list | `id, admission_number, admission_date, ward_id, bed_id, patient_id, status, medical_cleared, billing_cleared, pharmacy_cleared` + `patient:patients(full_name, uhid)` |
| `src/pages/opd/OPDPage.tsx` | opd_tokens / encounters list | `id, token_number, status, patient_id, doctor_id, department_id, created_at` + `patient:patients(full_name, uhid)` |
| `src/pages/lab/LabPage.tsx` | lab_orders list | `id, order_number, order_date, status, priority, patient_id, ordered_by` + `patient:patients(full_name, uhid)` |
| `src/pages/radiology/RadiologyPage.tsx` | radiology_orders list | `id, order_number, modality, study_type, status, scheduled_at, patient_id` + `patient:patients(full_name, uhid)` |
| `src/components/pharmacy/ip/DispensingWorkspace.tsx` | pharmacy_dispensing list (queue view only) | `id, status, admission_id, drug_id, batch_id, quantity, dispensed_at, patient_id` + `patient:patients(full_name, uhid)` |
| `src/pages/inbox/InboxPage.tsx` | inbox_messages list | `id, channel, direction, subject, preview, status, sentiment, patient_id, created_at` |
| `src/pages/mrd/MRDPage.tsx` (audit log section) | `audit_log` list | `id, action, entity_type, entity_id, user_id, created_at, summary` |

## Pattern applied everywhere

```ts
// before
.select('*')

// after — list view
.select('id, <only-displayed-columns>, patient:patients(full_name, uhid)')
```

## What is explicitly NOT changed

- `PatientDetailDrawer`, `BillDetailPanel`, edit modals, discharge stepper detail fetches — still `select('*')`.
- Background hooks that hydrate cache for one row at a time.
- Any query that feeds a print/export — keep full row to avoid breaking templates.
- No DB changes. No new indexes. No RLS edits.

## Verification

1. Open each affected list page, confirm rows render identically to before.
2. Open a detail drawer from each list, confirm full data still loads (drawer uses its own `select('*')`).
3. Check Network tab on `/billing` and `/patients`: response size for the list query should be visibly smaller.
4. Run the OPD walk-in → bill → token flow, IPD admit → discharge flow, and a pharmacy dispense to confirm nothing reads a column we removed.

## Risk & rollback

- Risk: a downstream component reads a field we dropped from the list query. Mitigation: the column lists above are derived from what each list's JSX actually renders; anything else is fetched on demand by the detail view.
- Rollback: each file change is isolated — revert the one query if a regression appears.

## After Phase 3

Phase 4 (server-side pagination) builds on these slimmer queries by adding `.range()` + `{ count: 'exact' }` to the same list sites.
