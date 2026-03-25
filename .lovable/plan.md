

## Plan: Add Salary & Employment Fields to Staff Management

### Problem
The staff creation/edit drawer has no fields for salary, PF/ESIC, or license expiry. The `staff_profiles` table already has these columns (`basic_salary`, `hra_percent`, `da_percent`, `conveyance`, `medical_allowance`, `pf_applicable`, `esic_applicable`, `license_expiry_date`, `employment_type`, `employee_id`), but the UI never lets users set them.

### Changes

**File: `src/pages/settings/SettingsStaffPage.tsx`**

1. **Extend `StaffForm` interface** with salary/employment fields:
   - `basic_salary`, `hra_percent`, `da_percent`, `conveyance`, `medical_allowance` (numbers)
   - `pf_applicable`, `esic_applicable` (booleans)
   - `license_expiry_date`, `employment_type`, `employee_id` (strings)

2. **Add "Employment & Salary" section** to the slide-over drawer (visible for all roles, below role-specific fields):
   - Employee ID (text)
   - Employment Type (dropdown: permanent, contract, visiting, intern)
   - Basic Salary (number, ₹)
   - HRA % (default 20), DA % (default 10)
   - Conveyance (default 1600), Medical Allowance (default 1250)
   - PF Applicable (checkbox), ESIC Applicable (checkbox)
   - License Expiry Date (date input)

3. **Update save mutation** to upsert `staff_profiles` with the salary fields on both create and edit. On edit, perform an upsert to `staff_profiles` keyed by `user_id`.

4. **Update `openDrawer`** to load existing `staff_profiles` data when editing, so salary fields are pre-populated.

### Technical Details

- The `staff_profiles` table already has all needed columns; no migration required.
- On edit, fetch the profile with `supabase.from("staff_profiles").select("*").eq("user_id", editingId).maybeSingle()` and populate the form.
- On save (both create and update), upsert into `staff_profiles` with `onConflict: "user_id"` to handle both new and existing profiles.
- Default values match the payroll calculation defaults (HRA 20%, DA 10%, conveyance 1600, medical 1250).

