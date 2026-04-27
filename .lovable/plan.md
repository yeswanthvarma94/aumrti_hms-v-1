I understand the failure: the app is connected to Supabase, but many screens are querying the wrong `hospital_id`, so the database correctly returns empty rows.

What is happening now:

```text
Sidebar shows:      Bhimavaram Hospitals
Actual queries use: 8f3d08b3-8835-42a7-920e-fdf5a78260bc
User's hospital is: 487db2f4-009b-4976-a95d-0208e36a93f8
Result:            patients / IPD / dashboard look empty
```

Root cause:
- The app has two hospital/branch state systems: `AuthContext` and `BranchContext`.
- `BranchContext` detects the valid branch and updates `localStorage`, but it does not notify `AuthContext` when it silently corrects an invalid stored branch.
- `AuthContext` keeps using the old `selectedBranchId` from a previous session/branch.
- Because most pages use `useHospitalId()` from `AuthContext`, they send queries with the stale hospital ID.
- Supabase RLS then either blocks the data or returns legitimately empty results for that wrong hospital.

## Fix plan

1. Make branch selection consistent
   - Update `BranchContext` so whenever it corrects or replaces `selectedBranchId`, it dispatches the same `branch:changed` event used by manual branch switching.
   - This forces `AuthContext` and all data queries to immediately use the corrected hospital ID.

2. Prevent stale branch IDs across logins
   - Update `AuthContext` so stored branch overrides are cleared/revalidated when the authenticated user changes.
   - For non-super-admin users, only allow their own `hospital_id`.
   - For super-admin/CEO users, only allow branch IDs that are present in the active hospital list.

3. Fix helper functions that can still read stale localStorage
   - Update `getHospitalIdAsync()` and `src/lib/getHospitalId.ts` so they do not blindly trust `localStorage.selectedBranchId`.
   - They will first load the current user record and validate whether the override is allowed.

4. Clear stale data caches on branch/user change
   - Invalidate TanStack Query caches when branch/user changes so pages refetch from the correct hospital instead of showing previous empty results.

5. Harden sign-out cleanup
   - Fix the current Supabase auth lock error by making sign-out idempotent and safely clearing `selectedBranchId` before logout.
   - This prevents `Lock "lock:aumrti-hms-auth" was released because another request stole it` from leaving the app in a half-signed-out state.

6. Expand the super-admin SQL policy script if needed
   - The earlier SQL script grants cross-hospital read access to several core tables, but some modules query tables not covered by that list, such as `opd_visits`, `staff_attendance`, `whatsapp_notifications`, and `chronic_disease_programs`.
   - I will update/create the SQL migration so super-admin read access covers all hospital-scoped tables used by the visible modules.
   - This keeps normal users isolated to their own hospital while letting super-admins view all hospitals.

## Files to update

- `src/context/AuthContext.tsx`
- `src/contexts/BranchContext.tsx`
- `src/hooks/useHospitalId.ts`
- `src/lib/getHospitalId.ts`
- Sign-out handlers if needed: `AppSidebar`, `AppHeader`, `IdleTimer`
- SQL migration file for super-admin read policies

## Expected result

After the fix:
- Dashboard, Patients, IPD, OPD, Departments, Wards/Beds, and other modules will query the same hospital shown in the sidebar.
- Switching hospitals will refetch data immediately.
- Logging out/in with another user will not inherit the previous user's branch.
- Super-admin users can read across hospitals only where RLS policies permit it.
- Normal hospital users remain isolated to their own hospital data.