# Fix: Other users / hospitals not loading data

## Root cause (two separate issues, both contributing)

**Issue 1 — Stale branch override in localStorage (UI bug)**

`AuthContext.tsx` reads `localStorage.selectedBranchId` and uses it as `hospitalId` (overriding the user's real hospital). On sign-out, the app calls `supabase.auth.signOut()` but never clears this key. So when a different user logs in (e.g. `gysk94@gmail.com`), the app keeps using the previous super_admin's `selectedBranchId` (`8f3d08b3-...` = "Aumrti Hospitals"), and:

- `GET /hospitals?id=eq.8f3d08b3-...` → returns `[]` because RLS blocks (the new user doesn't belong to that hospital)
- All subsequent queries filter by the wrong `hospital_id` → empty results everywhere
- The user appears to "have no data"

This is exactly what we see in the network logs after the second login attempt (`gysk94@gmail.com`).

**Issue 2 — No super_admin bypass in RLS (data model bug)**

The RLS function `public.get_user_hospital_id()` only ever returns the caller's own `hospital_id`. Every policy on `hospitals`, `users`, `patients`, `bills`, etc. is written as `USING (hospital_id = public.get_user_hospital_id())`. There is **no exception for `super_admin`**. So even a super_admin physically cannot read another hospital's rows or see other hospitals in a branch picker. This contradicts the project's multi-tenant model where super_admin is meant to see across hospitals.

The login page query `GET /hospitals?...&is_active=eq.true` works because there is a separate "Anyone can read hospital branding" policy `TO anon` — but once authenticated, the authenticated policy takes over and limits to one hospital.

## Fix plan

### Step 1 — Clear branch override on sign-out (frontend, 3 files)

In every place that calls `supabase.auth.signOut()`, clear the branch keys first and dispatch the `branch:changed` event so `AuthContext` resets immediately:

- `src/components/layout/AppHeader.tsx` (line 76)
- `src/components/layout/AppSidebar.tsx` (line 71)
- `src/components/auth/IdleTimer.tsx` (line 90)

Pattern:
```ts
localStorage.removeItem("selectedBranchId");
window.dispatchEvent(new Event("branch:changed"));
await supabase.auth.signOut();
```

Also add a one-shot guard inside `AuthContext` so that whenever `authUserId` changes (new login) and the stored override is **not** equal to the new user's real `hospital_id` and the new user is **not** a super_admin, the override is cleared automatically. This protects against any other code paths that bypass the helper.

### Step 2 — Add super_admin bypass to RLS (one migration)

Create a new security-definer helper and update the two foundational helpers so super_admins can read across hospitals:

```sql
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE auth_user_id = auth.uid() AND role = 'super_admin'
  )
$$;
```

Then add a permissive SELECT policy on the most-used tables that opens read access when `is_super_admin()` is true — without removing the existing per-hospital policies (Postgres OR-combines them):

- `public.hospitals` — "Super admins can view all hospitals" FOR SELECT USING (is_super_admin())
- `public.users` — "Super admins can view all users" FOR SELECT USING (is_super_admin())
- `public.patients`, `public.bills`, `public.admissions`, `public.appointments`, `public.opd_encounters`, `public.prescriptions`, `public.lab_orders`, `public.radiology_orders`, `public.pharmacy_dispensing`, `public.audit_log` — same pattern

Write-side policies stay strict (writes still require the user's own `hospital_id`); super_admin gets read-only cross-hospital visibility, which matches how the existing `BranchContext` branch picker is designed.

### Step 3 — Verify

After both steps:
1. Sign in as `gyskumar94@gmail.com` (super_admin) → all hospitals listed in branch picker, can switch branches
2. Sign out → `selectedBranchId` cleared from localStorage
3. Sign in as `gysk94@gmail.com` → loads that user's own hospital correctly, no leftover override
4. Re-check the dashboard / patients / bills queries return rows for each respective hospital

## Files touched

- `src/context/AuthContext.tsx` — add cross-login override reset
- `src/components/layout/AppHeader.tsx` — clear localStorage on sign-out
- `src/components/layout/AppSidebar.tsx` — clear localStorage on sign-out
- `src/components/auth/IdleTimer.tsx` — clear localStorage on sign-out
- `supabase/migrations/<new>.sql` — `is_super_admin()` + permissive SELECT policies on ~12 core tables

## What is NOT changed

- `get_user_hospital_id()` (still returns own hospital — keeps existing behaviour)
- All write-side / WITH CHECK policies (super_admin still cannot write to other hospitals)
- Any UI module logic, billing logic, RoleGuard, AuthGuard, or business workflows
- The "Anyone can read hospital branding" anon policy (left intact for the login page)

## Open question

Do you want super_admin to also be able to **write** across hospitals (e.g. create a patient in another hospital while branch-switched), or strictly **read-only** cross-hospital access? The plan above is read-only, which is the safer default. If you want full cross-hospital write access, I'll extend the policies to FOR ALL.
