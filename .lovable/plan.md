

## Problem

Both the **Admit to Mortuary** and **Register MLC** modals use a plain `<Select>` dropdown pre-loaded with up to 200 patients. Issues:

1. **RLS blocks the query** — the `patients` table has RLS requiring `hospital_id = get_user_hospital_id()`, but the user may not be authenticated or the query returns empty due to RLS. The dropdown shows nothing.
2. **No search** — even if patients load, a static dropdown with 200 items is unusable. Users need to type-to-search.
3. **No "create new" option** — if the patient (e.g., brought-in-dead, unidentified) doesn't exist, there's no way to register inline.

## Plan

### 1. Replace static Select with searchable patient picker (MortuaryPage.tsx)

For both Admit and MLC modals, replace the `<Select>` patient dropdown with:
- A text `<Input>` for search (debounced 300ms)
- On-type: query `patients` table with `.ilike("full_name", `%${search}%`)` or `.ilike("uhid", `%${search}%`)`, limit 20
- Show results in a scrollable list below the input
- Selected patient shown as a badge with clear button
- **"+ Register New Patient"** button at bottom of results that opens the existing `PatientRegistrationModal`

### 2. Integrate PatientRegistrationModal

- Import `PatientRegistrationModal` from `src/components/patients/PatientRegistrationModal.tsx`
- When a new patient is created, auto-select them in the form
- Wrap in `<div onClick={e => e.stopPropagation()}>` to prevent backdrop close (same pattern used in OPD/WalkIn)

### 3. Fix data loading resilience

- Add error logging to `loadAll()` — if `p.error`, log it and show toast
- Remove the bulk patient preload (200 limit) since search-on-demand replaces it

### Files changed
- `src/pages/mortuary/MortuaryPage.tsx` — replace both patient Select dropdowns with search + create pattern

