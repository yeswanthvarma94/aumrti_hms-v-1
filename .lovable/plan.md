

## Vaccination Module — Fix All 8 Issues

### Root Cause
The `patients` table column is `dob`, but the vaccination module references `date_of_birth` everywhere. This causes Supabase query failures (`column patients_1.date_of_birth does not exist`), breaking patient search, due list, and all DOB-dependent features.

### Fix Summary

#### 1. `src/components/vaccination/PatientCardTab.tsx` — 5 fixes
- Replace all `date_of_birth` references with `dob` in patient select queries and usage
- Replace inline patient search with `PatientSearchPicker` component (same pattern used in RecordVaccineTab) — fixes **Issue 1: patient search**
- Fix `generateDueSchedule` to use `dob` — fixes **Issue 3: DOB** and **Issue 4: newborn**
- After recording a vaccine, auto-schedule next dose in `vaccination_due` — fixes **Issue 7: next dose auto-schedule**
- Implement Print Vaccination Card using `window.print()` with a formatted printable div — fixes **Issue 8: print card**

#### 2. `src/components/vaccination/DueListTab.tsx` — 1 fix
- Change `patients(full_name, uhid, phone, date_of_birth)` to `patients(full_name, uhid, phone, dob)` — fixes **Issue 2: due list fails**
- Change `item.patients?.date_of_birth` to `item.patients?.dob` in `getAge()`

#### 3. `src/pages/vaccination/VaccinationPage.tsx` — 1 fix
- KPI query for `vaccination_records` uses `.eq("administered_at", today)` but `administered_at` is a `date` column — ensure correct date comparison
- Fix overdue count query to properly surface overdue items — fixes **Issue 5: overdue not found**

#### 4. `src/components/vaccination/RecordVaccineTab.tsx` — 1 fix
- After successful recording, auto-generate next due dose for multi-dose vaccines (e.g., BCG is single-dose but OPV/DPT have multiple) — fixes **Issue 6: no BCG record** and **Issue 7: next dose auto-scheduled**

### Technical Details

**Column fix** (`date_of_birth` → `dob`):
- PatientCardTab: patient select query, `getAge()`, `generateDueSchedule()`, `selectPatient()` DOB check
- DueListTab: join select and age display

**Patient search replacement**:
- Remove custom inline search, use `PatientSearchPicker` with `onRegisterNew` prop for creating new patients
- After patient selected, fetch full patient data including `dob` for vaccination card display

**Print card**:
- Create a printable section with patient info + NIS timeline + records
- Use CSS `@media print` or `window.print()` approach

**Next dose auto-schedule**:
- After recording a vaccine, look up vaccine_master for multi-dose schedules
- Insert next dose into `vaccination_due` with calculated due date

### Files Changed
1. `src/components/vaccination/PatientCardTab.tsx` — major rewrite (search, dob, print, next-dose)
2. `src/components/vaccination/DueListTab.tsx` — column name fix
3. `src/components/vaccination/RecordVaccineTab.tsx` — add next-dose scheduling after record
4. `src/pages/vaccination/VaccinationPage.tsx` — minor KPI query fix

