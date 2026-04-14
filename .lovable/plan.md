

## Analytics Not Syncing — Root Cause & Fix Plan

### What's Actually Wrong

I traced the data flow end-to-end and found **two critical data linkage breaks** that cause all analytics tabs to show zeros:

**Root Cause 1: `opd_encounters.doctor_id` stores the wrong user**

When a consultation is saved in `ConsultationWorkspace.tsx` (line 265), the encounter's `doctor_id` is set to `userId` — the currently logged-in user. In your hospital, the admin "Yeswanth" (`a80c69c8`) is creating encounters for all patients, so ALL encounters get his ID instead of the assigned doctor's ID from the token.

DB proof: Every encounter has `doctor_id: a80c69c8` (hospital_admin), while the tokens correctly have the real doctor IDs (`f0f20fa8` = Dr Neeraja, `5512426b` = dr k chaitanya, etc.).

The analytics hook filters by `users.role='doctor'` → gets doctor IDs → looks for encounters with those IDs → finds **zero** matches.

**Root Cause 2: OPD bills have no `encounter_id`**

Most OPD bills have `encounter_id: null`. Bills are created at walk-in time (before consultation), and the encounter_id is never backfilled. The doctor revenue calculation maps `bills → encounter_id → doctor_id`, so with no encounter_id, revenue = ₹0 for every doctor.

### Fix Plan

| Step | File | Change |
|------|------|--------|
| 1 | `ConsultationWorkspace.tsx` | Use `token.doctor_id` (from the OPD token) instead of `userId` for `opd_encounters.doctor_id`. The token stores the correct assigned doctor. |
| 2 | `ConsultationWorkspace.tsx` | After creating/updating an encounter, backfill the bill's `encounter_id` — find the bill by `patient_id + bill_date + bill_type='opd'` and update it. |
| 3 | `useDoctorDeptData.ts` | As a fallback for bills without encounter_id, also join OPD bills via `opd_tokens` (token has `doctor_id` and links to bills via `patient_id + visit_date`). Alternatively, add a direct revenue query using `opd_tokens.doctor_id`. |
| 4 | SQL migration | Backfill existing encounter `doctor_id` from their linked tokens: `UPDATE opd_encounters e SET doctor_id = t.doctor_id FROM opd_tokens t WHERE e.token_id = t.id AND t.doctor_id IS NOT NULL` |
| 5 | SQL migration | Backfill existing bill `encounter_id` where possible by matching on `patient_id + bill_date + token_id` |

### Technical Details

**Fix 1 — Encounter doctor_id (ConsultationWorkspace.tsx line 265):**
```typescript
// BEFORE (wrong — uses logged-in user, could be admin)
doctor_id: userId,

// AFTER (correct — uses the doctor assigned to the token)
doctor_id: token.doctor_id || userId,
```

**Fix 2 — Bill encounter_id backfill on save:**
```typescript
// After encounter insert/update, link the bill
if (newEncId) {
  await supabase.from("bills")
    .update({ encounter_id: newEncId })
    .eq("patient_id", token.patient_id)
    .eq("bill_type", "opd")
    .eq("bill_date", new Date().toISOString().split("T")[0])
    .is("encounter_id", null);
}
```

**Fix 3 — Analytics fallback (useDoctorDeptData.ts):**
For OPD revenue, instead of only using `bills.encounter_id`, also query via tokens:
- Get `opd_tokens` with `doctor_id` in the doctor list
- Match tokens to bills by `patient_id + visit_date = bill_date`
- Sum `paid_amount` for unmatched bills

**Fix 4 — SQL backfill for existing data:**
```sql
-- Fix encounter doctor_id from tokens
UPDATE opd_encounters e 
SET doctor_id = t.doctor_id 
FROM opd_tokens t 
WHERE e.token_id = t.id AND t.doctor_id IS NOT NULL;

-- Fix bill encounter_id from encounters
UPDATE bills b
SET encounter_id = e.id
FROM opd_encounters e
WHERE b.bill_type = 'opd' 
  AND b.encounter_id IS NULL
  AND b.patient_id = e.patient_id
  AND b.bill_date = e.visit_date
  AND b.hospital_id = e.hospital_id;
```

This fixes Doctors, Departments, Revenue per doctor, and Clinical tabs — all downstream from the same broken linkage.

