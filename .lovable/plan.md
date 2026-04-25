# Plan to restore database sync across all modules

## What I understood

Yes, I understand. The app shell is opening, but database-backed screens are showing empty/default states across Dashboard, Patients, IPD beds, Settings, Staff, Departments, Wards, and other modules. This is not normal sample-data emptiness; the application is failing to reliably connect module queries to the authenticated hospital data.

## Likely root causes found from inspection

1. **Some requests are still anonymous**
   - The network snapshot shows a Supabase REST request using the anon JWT as the `authorization` bearer, not a logged-in user JWT.
   - RLS will return no rows for most hospital tables when `auth.uid()` is missing.

2. **Global auth/hospital context is still too fragile**
   - Most modules depend on `hospitalId` from `AuthContext`.
   - If auth restoration or profile lookup is delayed/blocked, module queries either do not run or return empty.

3. **Settings and multiple module tabs bypass the new context**
   - Several pages still do `supabase.from("users").select("hospital_id").limit(1).maybeSingle()`.
   - That can pick the wrong row, fail under RLS, or behave inconsistently.
   - Examples found: Settings Staff, Departments, Wards, Services, Drugs; Inventory panels; Blood Bank tabs; Insurance tabs; IVF/Dialysis/Housekeeping/HMIS/Dietetics parts.

4. **Many settings queries lack explicit `hospital_id` filters**
   - Settings Departments/Staff/Wards/Services/Drugs query tables without `eq("hospital_id", hospitalId)`.
   - They rely on RLS invisibly. If session/RLS is not ready, the UI looks like the database is empty.

5. **Service worker/cache may still leave users on an old broken build**
   - The service worker has been hardened, but existing users may still have old cached chunks or stale local auth state.

## Fix plan

### 1. Stabilize Supabase auth before any module query

Update the Supabase client/auth flow so the app never runs hospital data queries as anonymous while a saved session is still being restored.

- Ensure session restoration is complete before protected routes render.
- Ensure `AuthContext` always uses the real logged-in access token before resolving `hospitalId`.
- Add a clear “database connection/account context failed” state instead of silent blank tables.
- Keep `forceSignOut()` manual-only.

### 2. Make `useHospitalId()` the single source of truth

Remove unsafe per-module hospital lookups and replace them with resolved context values:

- `hospitalId`
- `userId`
- `authUserId`
- `role`
- `loading`

Replace patterns like:

```ts
supabase.from("users").select("hospital_id").limit(1).maybeSingle()
```

with:

```ts
const { hospitalId, userId, loading } = useHospitalId()
```

### 3. Fix settings pages first because they prove sync health

Update core settings pages to explicitly filter by the active hospital and only run after `hospitalId` exists:

- `SettingsStaffPage.tsx`
- `SettingsDepartmentsPage.tsx`
- `SettingsWardsPage.tsx`
- `SettingsServicesPage.tsx`
- `SettingsDrugsPage.tsx`
- Other settings sub-pages that use similar unscoped queries

Expected result:

- Staff returns again.
- Departments return again.
- Wards/beds return again.
- Drug/service masters return again.
- Creating/updating settings writes with the correct hospital_id.

### 4. Fix major clinical/operational modules with the same pattern

Audit and update the highest-impact modules/tabs that still bypass context or query without hospital scoping:

- Patients
- OPD
- IPD / beds
- Lab
- Radiology
- Billing / Payments
- Pharmacy
- Inventory
- HR
- Insurance
- Blood Bank
- Dialysis
- IVF
- Oncology
- Housekeeping / HMIS / Dietetics where applicable

For each tab:

- Query only when `hospitalId` is available.
- Add `eq("hospital_id", hospitalId)` for all hospital tables.
- Use `userId` from context for inserts/audit fields instead of refetching users.
- Show a real error message if Supabase returns an error.
- Keep empty states only for true zero rows.

### 5. Add a small database sync diagnostic utility

Add a dev-facing diagnostic helper/component that can quickly verify the current account can read core tables:

- users/profile
- hospitals
- patients
- departments
- wards
- beds
- bills
- staff
- OPD visits

This will not expose private data; it will report counts/status/errors. It helps distinguish:

- no data exists
- RLS blocked query
- auth token missing
- wrong hospital id
- query code bug

### 6. Check and repair RLS policy mismatch if needed

The app schema uses `users.auth_user_id` to connect Supabase Auth to staff profiles. The old project note says some RLS rules may still use `users.id = auth.uid()`, which would fail after the users table was changed.

If database access is available during implementation, run a policy audit and create a migration to standardize hospital isolation to:

```sql
hospital_id = public.get_user_hospital_id()
```

and ensure:

```sql
public.get_user_hospital_id()
-- resolves from users.auth_user_id = auth.uid()
```

Do not make sensitive tables public. Keep RLS enabled and hospital-scoped.

### 7. Force stale build/session cleanup safely

- Bump the service worker cache version again.
- Keep preview unregister behavior.
- Add one-time client cleanup for old cache/auth mismatch if required.
- After deployment, users should sign out and sign in once if they were stuck on stale auth.

## Technical implementation order

1. Patch auth/session readiness and add safer connection error handling.
2. Patch settings/staff/departments/wards/services/drugs to use `hospitalId` explicitly.
3. Patch common unsafe hospital lookup patterns across module tabs.
4. Add diagnostic health check for core tables.
5. Audit RLS policies and add a migration if policies still reference the wrong user identity field.
6. Run build/type checks.

## Success criteria

- Dashboard no longer shows false “no data” when records exist.
- Patient Registry shows existing patients.
- IPD bed map shows configured wards/beds.
- Settings Staff/Departments/Wards show existing records.
- New records created in any module save with the correct `hospital_id`.
- Supabase requests for protected data use the authenticated user session, not the anon JWT.
- RLS remains secure and hospital-isolated.

## Immediate user-side recovery after fix

After implementation, the safest recovery step will be:

1. Hard refresh once.
2. If still blank, click sign out and sign in again.
3. Open Settings → Staff/Departments/Wards to confirm database sync before using clinical modules.

<lov-actions>
  <lov-open-history>View History</lov-open-history>
</lov-actions>

<lov-actions>
<lov-link url="https://docs.lovable.dev/tips-tricks/troubleshooting">Troubleshooting docs</lov-link>
</lov-actions>