

## Fix Health Packages — 3 Issues

### Issue 1: Stations not syncing with Lab/Doctors/Diagnostics + No vitals entry

**Root Cause**: The "Today's Checkups" tab has a hardcoded `STATIONS` array with generic names. When clicking "Complete Vitals →" or "Complete Lab →", it only updates a JSON key in `components_done` — it doesn't actually create vitals records, lab orders, or link to any real clinical module. There's no vitals entry form, no lab order creation, and no doctor consultation link.

**Fix**: Add station-specific actions when completing each station:
- **Vitals station**: Show a vitals entry form (BP, pulse, SpO2, temp, height, weight, BMI) and save to a `package_vitals` or inline JSON on the booking
- **Lab station**: Auto-create lab orders from the package's `components` list (which maps to `lab_test_master`) and link to `/lab`
- **ECG/X-Ray/USG stations**: Mark as done with optional notes/findings
- **Doctor station**: Link to doctor consultation, allow notes entry
- Each station completion should record who completed it and when

**Files**: `src/components/packages/TodaysCheckupsTab.tsx` — add station-specific modals/forms

### Issue 2: AI Report not generated

**Root Cause**: `callAI()` returns an `AIResponse` object `{ text, provider, model, error }`, but `ProgressTrackerTab.tsx` line 56 treats the return as a raw string:
```ts
const response = await callAI({...});
setReports((prev) => ({ ...prev, [booking.id]: response })); // response is AIResponse, not string
```
Additionally, if no AI provider is configured, `callAI` returns `{ text: "", error: "No AI provider configured" }` silently.

**Fix**:
- Change to `response.text` and check `response.error`
- Show toast with error message if `response.error` exists
- Store `response.text` in the reports state

**Files**: `src/components/packages/ProgressTrackerTab.tsx`

### Issue 3: Corporate bulk booking from CSV not working

**Root Cause**: The `CorporateTab` has no CSV upload or bulk booking functionality at all — it only has a manual "Add Corporate Account" form. The bulk booking feature was never built.

**Fix**: Add to `CorporateTab`:
- **CSV Upload section**: File input accepting `.csv` with columns: `name, phone, dob, gender, employee_id`
- **Parse CSV**: Use `FileReader` + basic CSV parsing
- **Preview table**: Show parsed employees before booking
- **Select package + date**: Pick health package and scheduled date for all employees
- **Bulk book**: Loop through employees, upsert each as a patient (match by phone), then insert `package_bookings` for each
- **Corporate invoice**: Single bill linked to the corporate account (not individual patients)
- RLS uses `get_user_hospital_id()` which requires auth — the hardcoded `HOSPITAL_ID` bypass won't work for INSERT. Need to ensure the user is logged in, or the code should show a clear error.

**Files**: `src/components/packages/CorporateTab.tsx`

### Migration
- **Add RLS policy**: Add a public INSERT/UPDATE policy for `package_bookings` and `corporate_accounts` that allows `anon` role OR adjust to use `authenticated` with proper hospital_id check. Current policies require `get_user_hospital_id()` which needs a logged-in user — if using hardcoded HOSPITAL_ID, writes will fail.
- Consider adding a permissive SELECT/INSERT policy for development, or switch all components to use authenticated user's hospital_id.

### Summary of Changes

| File | Change |
|------|--------|
| `TodaysCheckupsTab.tsx` | Add vitals entry form, lab order creation, station-specific completion modals |
| `ProgressTrackerTab.tsx` | Fix `callAI` return handling (`response.text` + error check) |
| `CorporateTab.tsx` | Add CSV upload, parse, preview, bulk package booking |
| Migration | Add permissive RLS policies or fix auth flow for writes |

