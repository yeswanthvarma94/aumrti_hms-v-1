
Root cause I found: the Add Staff drawer saves `form.role` directly into `users.role`, but `users.role` is backed by the `public.app_role` enum. The UI is loading roles from `role_permissions`, which already includes canonical roles like `billing_executive`, `hr_manager`, and `lab_technician`, while the enum/types still only allow legacy values like `accountant` and `lab_tech`. Your screenshot confirms the failure: `invalid input value for enum app_role: "billing_executive"`.

There is also a broader consistency problem:
- `src/pages/settings/SettingsStaffPage.tsx` builds role cards from `role_permissions` and inserts them into `users.role`
- `src/integrations/supabase/types.ts` still shows the old enum
- `src/pages/login/LoginPage.tsx`, `src/lib/routeRoles.ts`, and some labels still mix legacy and canonical role names

Plan to fix:

1. Align the database role enum
- Add a Supabase migration to extend `public.app_role` with the canonical staff roles already used by the app, at minimum:
  - `billing_executive`
  - `hr_manager`
  - `lab_technician`
- If other currently-used canonical roles are already referenced in route/module access, include them in the same migration to prevent the same bug from recurring.

2. Sync generated Supabase types
- Update `src/integrations/supabase/types.ts` so the frontend type-safe enum matches the database enum.

3. Fix the Add Staff page to use the right role source cleanly
- Update `src/pages/settings/SettingsStaffPage.tsx` to:
  - use the current authenticated hospital context via `useHospitalId()`
  - filter `role_permissions` by `hospital_id`
  - keep role cards/labels consistent with the canonical enum values
- This prevents the page from offering invalid or cross-hospital role options.

4. Normalize downstream role usage
- Update legacy aliases where they would break access after staff creation:
  - `src/pages/login/LoginPage.tsx` role → landing route map
  - `src/lib/routeRoles.ts` mismatches like `billing_staff` vs `billing_executive`
  - role label/meta mappings in settings pages for `lab_tech` vs `lab_technician`, `accountant` vs billing-facing labels

5. Verify end-to-end
- Test creating staff for the affected roles from `/settings/staff`
- Confirm the insert succeeds with no enum error toast
- Confirm the new user appears in the staff table with the correct role label
- Confirm login redirect/module access works for at least Billing, HR, and Lab staff

Technical details:
- Primary failing file: `src/pages/settings/SettingsStaffPage.tsx`
- Schema mismatch evidence:
  - `supabase/migrations/20260327032137_9056a817-66f9-469f-913b-c666dc2e3dc6.sql` seeds `role_permissions` with `billing_executive`, `hr_manager`, `lab_technician`
  - `src/integrations/supabase/types.ts` still defines `app_role` as only `super_admin | hospital_admin | doctor | nurse | receptionist | pharmacist | lab_tech | accountant`
- Secondary cleanup targets:
  - `src/pages/settings/SettingsRolesPage.tsx`
  - `src/pages/login/LoginPage.tsx`
  - `src/lib/routeRoles.ts`

Expected result after implementation:
- Add Staff will no longer fail on billing/lab/hr role creation
- The role shown in settings, used for login routing, and checked for route access will all use the same canonical values
- Future staff creation won’t break when a role exists in `role_permissions` but not in the enum
