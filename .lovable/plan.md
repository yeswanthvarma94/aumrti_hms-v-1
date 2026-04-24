

# Fix: Patient search leaking across hospitals

## Problem

Several patient-search inputs across the app query the `patients` table **without filtering by `hospital_id`**, so users see (and can select) patients belonging to other hospitals. This breaks multi-tenancy (Core rule from AGENTS.md: *"ALL tables with hospital_id use RLS… always filter by hospital_id"*).

While Supabase RLS provides a backstop on the server, the client query must still scope to the current user's hospital so results are correct, fast, and consistent with the rest of the app.

## Affected files (5)

| File | Current bug |
|------|-------------|
| `src/components/telemedicine/ScheduleTeleconsultModal.tsx` | `searchPatients` does `.ilike("full_name", …)` with no `hospital_id` filter, also no UHID/phone search |
| `src/components/pmjay/PmjayPreAuthTab.tsx` | `searchPatients` `.or(name/phone)` with no `hospital_id` filter, no UHID search |
| `src/components/pmjay/PmjayBeneficiariesTab.tsx` | Same as above |
| `src/components/ayush/PanchakarmaTab.tsx` | `useEffect` search `.or(name/uhid)` with no `hospital_id` filter |
| `src/components/dialysis/DialysisPatientsTab.tsx` | Loads **all** `patients` globally on register-modal open, no `hospital_id`, no search/limit |

Already correct (reference pattern): `PatientSearchPicker.tsx`, `PrakritiTab.tsx`, `RecordRequestsTab.tsx`, `DeathCertificatesTab.tsx`, `NewBillModal.tsx`, `AdvanceReceiptModal.tsx`, `PROPage.tsx`.

## Fix approach

Apply the canonical pattern used by `PatientSearchPicker` everywhere:

```ts
const { data, error } = await supabase
  .from("patients")
  .select("id, full_name, uhid, phone")
  .eq("hospital_id", hospitalId)              // <-- tenancy filter
  .or(`full_name.ilike.%${q}%,uhid.ilike.%${q}%,phone.ilike.%${q}%`)
  .limit(10);
if (error) { console.error("Patient search error:", error.message); setPatients([]); return; }
```

### Per-file changes

1. **ScheduleTeleconsultModal.tsx** — `hospitalId` is already in scope via `useHospitalId()`. Add `.eq("hospital_id", hospitalId)`, expand `.ilike` to a UHID + name + phone `.or(...)`, guard with `if (!hospitalId) return;`, add error logging.

2. **PmjayPreAuthTab.tsx** — Import and use `useHospitalId()` to get `hospitalId`. Add `.eq("hospital_id", hospitalId)` to `searchPatients`, include UHID in the `.or(...)`, add error logging + guard.

3. **PmjayBeneficiariesTab.tsx** — Same change as PmjayPreAuthTab (add `useHospitalId`, scope query, add UHID, error log + guard).

4. **PanchakarmaTab.tsx** — Add `useHospitalId()`. Update the `useEffect` that runs the search to include `.eq("hospital_id", hospitalId)`, gate on `hospitalId` being present, add error handling. Add `hospitalId` to the effect's dependency array.

5. **DialysisPatientsTab.tsx** — Replace the "load all patients on modal open" pattern with a debounced search input (matching the rest of the app). Use `useHospitalId()`, query with `.eq("hospital_id", hospitalId).or(name/uhid/phone).limit(20)` only when search length ≥ 2. Removes the bug **and** removes a perf foot-gun (currently fetches every patient row in the database).

### Compliance with AGENTS.md

- Multi-tenancy: every query now filters by `hospital_id` (Core rule).
- Error handling: every Supabase call destructures `error`, logs via `console.error`, and degrades gracefully (sets empty list) — matches the required pattern.
- `.maybeSingle()` not applicable here (list queries).
- Debounce: existing 300ms patterns in callers are preserved; Dialysis gets a new debounced input.
- No changes to safety blocks (HBV/HCV machine match, NDPS, ABO cross-match), discharge stepper, billing, or autoPostJournalEntry flows.

## Out of scope (intentionally not changed)

- `PatientSearchPicker` (already correct — used widely).
- Server-side RLS policies (already in place; this fix aligns the client with them).
- Any module that already scopes by `hospital_id` correctly.
- UI/visual layout of the affected modals.

## Verification

After the change, in any of the 5 affected screens, typing a patient name should only return patients belonging to the currently logged-in hospital. Selecting a patient and saving (teleconsult booking, PMJAY pre-auth/beneficiary registration, Panchakarma scheduling, dialysis patient registration) continues to work unchanged.

