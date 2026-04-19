

## Root Cause

The error `invalid input value for enum app_role: "custom_1775358460148"` happens because:

1. `SettingsRolesPage.tsx` lets admins create custom roles, stored in the `role_permissions` table with synthetic names like `custom_1775358460148`.
2. `SettingsStaffPage.tsx` shows these custom roles as selectable role cards (via `customRoles` query at line 130-138).
3. When you submit the staff form, it inserts into `users.role` — which is a Postgres ENUM (`app_role`) limited to a fixed list: `super_admin, hospital_admin, doctor, nurse, receptionist, pharmacist, lab_tech, accountant, billing_executive, hr_manager, lab_technician, radiologist, cfo, billing_staff`.
4. `custom_1775358460148` is not in that enum → DB rejects with the error in your screenshot.

The screenshot also shows the role chip area is empty (no role selected visually) because the form was created against a custom role whose name doesn't match any real enum value.

## Fix

Constrain staff creation to **only the valid `app_role` enum values**, while still allowing `role_permissions` to extend permissions for those existing roles.

### Changes

**1. `src/pages/settings/SettingsStaffPage.tsx`**
- Define a hardcoded `VALID_APP_ROLES` array matching the DB enum (14 values).
- In the `ROLE_CARDS` memo, filter `customRoles` to only those whose `role_name` is in `VALID_APP_ROLES`. Discard any `custom_*` roles for the staff-creation picker (they remain editable in Roles & Permissions for permission overrides on existing enum roles only).
- Add a guard at the start of `saveStaff.mutationFn`: if `form.role` is empty or not in `VALID_APP_ROLES`, throw a clear toast error ("Please select a valid role") before calling Supabase.
- In `FILTER_TABS` memo, do the same filter so leftover users with stale custom roles don't crash the tabs.

**2. `src/pages/settings/SettingsRolesPage.tsx`**
- Either disable the "Create Role" button entirely (preferred — system enum cannot be extended without a DB migration), OR keep it but rename it to "Customize Permissions for Existing Role" with a dropdown of the 14 valid `app_role` values rather than generating a `custom_${Date.now()}` name.
- Recommend: change `createMutation` to require selecting one of the valid enum values from a dropdown, and use that as `role_name`. This keeps `role_permissions.role_name` aligned with `users.role`.

**3. Cleanup migration** (optional safety net)
- Delete any existing `role_permissions` rows where `role_name LIKE 'custom_%'` so they stop appearing in the staff role picker.

### Files to edit
- `src/pages/settings/SettingsStaffPage.tsx` (filter + validation)
- `src/pages/settings/SettingsRolesPage.tsx` (replace custom-name creation with enum picker)
- New migration: `DELETE FROM role_permissions WHERE role_name LIKE 'custom_%';`

### Out of scope
- Extending the `app_role` enum itself (would require coordinated changes across `has_role()`, `ROUTE_ROLES`, `RoleGuard`, and every component that switches on role).

