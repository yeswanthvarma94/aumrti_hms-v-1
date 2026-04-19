

## Root Cause Analysis

Looking at your screenshot (Process Payroll — 2026-04) and the database:

**Hospital `62b45740…` (the one in your screenshot) staff_profiles data:**
| Staff | basic_salary in DB |
|---|---|
| Srikar | ₹25,000 ✅ |
| Yeswanth | ₹25,000 ✅ |
| Dr Sandya | ₹1,50,000 ✅ |
| Rekha | NULL ❌ |
| vsd | NULL ❌ |
| Raj | NULL ❌ |

But the screenshot shows **all six** with Basic = ₹0 and Gross = ₹1,250 — even Dr Sandya whose basic is ₹1,50,000. There are **three separate bugs** in `PayrollTab.tsx`:

### Bug 1 — Calculation strips the basic when zero attendance exists
`calculatePayroll` (line 140-142) computes:
```
perDay = basic_salary / workingDays
paidDays = presentDays + leaveDays    // = 0 if no attendance
basic = paidDays * perDay              // = 0
```
Your `staff_attendance` table has **0 rows for this hospital** (verified: `cnt: 0`). So every staff member gets `paidDays = 0` → `basic = 0` regardless of their salary master. That's why Dr Sandya at ₹1.5L shows ₹0.

The other allowances follow the same broken path: HRA = basic × 20% = 0, DA = basic × 10% = 0, Conveyance prorates to 0 (because absent>3 and paid=0), only Medical (₹1,250 flat) survives → Gross = ₹1,250 for everyone. Matches screenshot exactly.

### Bug 2 — No `hospital_id` filter (multi-tenancy leak)
Lines 80, 87, 112, 127 all query `staff_profiles` and `staff_attendance` **without** `.eq("hospital_id", hospitalId)`. This pulls staff from every hospital in the database into the current hospital's payroll. (RLS may mask this in production, but the code is wrong.)

### Bug 3 — Three staff (Rekha, vsd, Raj) genuinely have NULL `basic_salary`
Even after fixing Bug 1, those three would still calculate as ₹0 because their salary was never entered in /settings/staff. UI should warn instead of silently producing ₹0 payslips.

## Fix Plan

### File: `src/components/hr/PayrollTab.tsx`

**1. Add hospital_id filter everywhere** — use `useHospitalId()` hook and add `.eq("hospital_id", hospitalId)` to all four queries (`staff_profiles` x2, `staff_attendance` x2, `payroll_runs`).

**2. Fix the "no attendance recorded" case** — when a staff member has zero attendance rows for the month, treat them as **fully present** (paid_days = workingDays) rather than zero. This matches real-world hospital behavior where missing attendance means "assume present, deduct only when explicitly absent". Alternatively, compute:
```
paidDays = workingDays - absentDaysExplicit
```
where absent days only counts rows with `status='absent'` (not "missing rows"). I'll implement the latter — safer.

**3. Surface NULL basic_salary** — in the calculated table, show a red warning chip "Salary not set" next to staff whose `basic_salary` is null/0, with a link to /settings/staff to fix it. Skip those rows from the totals (don't insert ₹0 payslips silently).

**4. Reload runs filtered by hospital** — `loadRuns()` (line 73-76) also missing hospital filter.

### Files to edit
- `src/components/hr/PayrollTab.tsx` (calculation logic + hospital_id filters + null-salary warning)

### Out of scope
- Changing the attendance tab or how attendance is recorded
- Changing the salary master fields in SettingsStaffPage (already correct)
- Modifying the payroll database schema or journal posting

