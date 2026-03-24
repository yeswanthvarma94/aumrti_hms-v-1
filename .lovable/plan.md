
Fix the staff-creation bug in `src/pages/settings/SettingsStaffPage.tsx` without changing the doctors/staff model.

1. Confirmed root cause
- The database errors are `users_department_id_fkey`.
- The `users.department_id` column must reference `departments.id`.
- In the current form, the Nurse “Ward Assignment” dropdown writes a ward UUID into `form.department_id`.
- The role switch buttons also do not clear role-specific fields, so an invalid ward UUID can leak into later saves for doctor/lab/billing/pharmacy/reception/admin too.

2. Implementation plan
- Split nurse ward selection away from `department_id`.
  - Add a separate `ward_id` field in local form state, or separate local state just for the UI.
  - Keep `department_id` only for actual department selection.
- Sanitize the payload before every insert/update.
  - Build one helper that returns the DB payload.
  - Only send `department_id` when it is a valid department UUID for a role that should use departments.
  - For nurse/lab/billing/pharmacy/reception/admin, send `department_id: null` unless a real department selector is intentionally supported.
- Reset dependent fields on role change.
  - When role changes, clear `department_id` and `ward_id` so stale values cannot be submitted.
- Add lightweight client-side validation.
  - If role is doctor and a department is required by the UI, validate it before save and show a toast instead of letting Supabase fail.
- Apply the same sanitization to Quick Add Doctors.
  - Validate/coerce bulk `dept_id` values before insert.

3. Technical details
- Problematic code path now:
  - Doctor section writes `form.department_id` from `departments`
  - Nurse section also writes `form.department_id`, but from `wards`
  - Save mutation always sends `department_id` directly to `users`
- No schema migration is required for this bug fix.
- If you want nurse ward assignment to be persisted later, that should be a separate schema change (for example a proper `ward_id` column or a staff-profile table), not reused through `department_id`.

4. Verification after implementation
- Add one each of: Doctor, Nurse, Lab, Billing, Pharmacy, Reception, Admin/CEO.
- Test switching roles inside the same open drawer before saving.
- Test Quick Add Doctors.
- Test editing existing staff records.
- Confirm there are no more `users_department_id_fkey` errors and new rows appear immediately in the staff list.
