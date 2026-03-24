

# Fix HR Module — Missing Tables and Columns

## Root Causes

1. **Roster error ("Could not find table 'public.duty_roster'")**: The `duty_roster` and `shift_master` tables were never created — the migration either failed or wasn't applied.

2. **Attendance error ("Could not find 'source' column")**: The `staff_attendance` table only has 6 columns (`id, hospital_id, user_id, attendance_date, status, created_at`). The code references `source`, `in_time`, `out_time`, `hours_worked`, `overtime_hours`, `marked_by`, `notes` — none of which exist.

3. **Add Staff slow loading**: This navigates to `/settings/staff` which is a separate page. Not a bug per se — it's a full page navigation. Can be improved by using `navigate()` instead of `window.location.href`.

## Step 1: Database Migration

Create missing tables and add missing columns:

**Create `shift_master`** with: id, hospital_id, shift_name, shift_code, start_time, end_time, duration_hours, shift_type, color_code, is_active. Seed 4 default shifts (Morning/Evening/Night/General) for all hospitals. Add RLS.

**Create `duty_roster`** with: id, hospital_id, user_id, roster_date, shift_id, department_id, ward_id, is_off, is_holiday, notes, created_by, created_at. UNIQUE on (hospital_id, user_id, roster_date). Add RLS.

**ALTER `staff_attendance`** — add missing columns: `in_time time`, `out_time time`, `hours_worked numeric(4,2)`, `source text default 'manual'`, `overtime_hours numeric(4,2) default 0`, `notes text`, `marked_by uuid`. Add UNIQUE constraint on (hospital_id, user_id, attendance_date).

## Step 2: Fix Add Staff Navigation

In `HRPage.tsx`, change `window.location.href = "/settings/staff"` to use React Router's `useNavigate()` for instant client-side navigation.

## Step 3: Fix Attendance Status Change

The upsert in `AttendanceTab.tsx` includes `source: "manual"` which will work once the column is added. No code changes needed beyond the migration — the column addition fixes it.

