# Why no module is fetching data — and how to fix it

## What I confirmed

1. **Supabase client is fine.** `src/integrations/supabase/client.ts` has the URL and anon key hardcoded — there is no missing `.env` issue.
2. **Every module reads `hospitalId` from `AuthContext`** via `useHospitalId()`. If `hospitalId` is `null`, every query is gated (`enabled: !!hospitalId`) and shows nothing — the page looks "stuck" or empty.
3. **The whole app's data fetching depends on ONE chain succeeding:**
   `supabase.auth.getSession()` → look up `users` row by `auth_user_id` → read `hospital_id` → enable all module queries.
   If any link breaks, **every module appears broken at once** — exactly what you are seeing.

## The 3 most likely root causes (in order)

### Cause A — `users` row lookup is failing or returning nothing
In `AuthContext.tsx` (line 87-108) we do:
```
.from("users").select(...).eq("auth_user_id", authUserId).maybeSingle()
```
If this returns `null` (no row, or RLS blocks SELECT on `users`), then:
- `hospitalId = null`
- Every module's query stays disabled
- `loading` flips to `false` → no spinner, no error, just empty pages
This perfectly matches "every module is empty / stuck."

A hard refresh sometimes works because `onAuthStateChange` re-fires and the row is re-read with a fresh JWT.

### Cause B — RLS policy on `users` is too strict
If the `users` table SELECT policy is `auth.uid() = id` (instead of `auth.uid() = auth_user_id`), the lookup silently returns 0 rows for everyone. Same symptom as Cause A.

### Cause C — Stale auth token in `localStorage`
The client uses `storageKey: 'aumrti-hms-auth'` with `persistSession: true`. If the refresh token was rotated/revoked (e.g. password reset, RLS change forcing re-auth), `getSession()` returns `null` until the user logs in again — but no error is shown, so the app just sits empty. Hard refresh sometimes triggers a re-auth flow.

## Fix plan (one pass, safe — no UI changes)

### 1. Make auth failures VISIBLE instead of silent
In `src/context/AuthContext.tsx`:
- When `authUserId` exists but the `users` lookup returns `null`, surface a clear toast: "Your account is not linked to a hospital. Please contact admin or re-login." and force a sign-out + redirect to `/login`.
- When `getSession()` returns `null` on a protected route, redirect to `/login` immediately (today the app sits in a loading limbo).
- Add `console.error` with the exact error object (not just message) so we can see RLS errors in the browser console.

### 2. Add a 5-second auth resolution timeout
If `loading` is still `true` after 5 seconds, show a "Session error — please log in again" screen with a "Sign out & retry" button. This prevents the "stuck forever" state.

### 3. Verify & repair the `users` table RLS policy
Check the SELECT policy on `public.users`. It MUST be:
```sql
CREATE POLICY "Users can read own row"
ON public.users FOR SELECT
TO authenticated
USING (auth_user_id = auth.uid());
```
If it currently uses `id = auth.uid()` (common mistake), every lookup returns 0 rows → every module empty. If wrong, ship a migration to correct it.

### 4. Add a one-time auth health check on app boot
On `AuthProvider` mount, after session resolves:
- If session exists but `users` row missing → log out and toast.
- If session exists and `users` row found but `hospital_id` is null → toast "Your account has no hospital assigned" and log out.
This guarantees the user never lands in a "logged in but invisible" state.

### 5. Add a global "Network/DB error" boundary banner
A small top-of-screen banner that shows when ANY Supabase query in the last 30s returned a 401/403/500. Today these errors are swallowed per-module, so the user just sees empty cards everywhere.

### 6. Clear stale localStorage on auth mismatch
If `getSession()` returns null but `localStorage['aumrti-hms-auth']` exists, clear it and redirect to login. This fixes the "hard refresh sometimes works" pattern.

## What this will NOT change
- No UI redesign.
- No changes to module data-fetching logic.
- No changes to `useHospitalId` consumers.
- No changes to `RoleGuard`, `AuthGuard`, sidebar, or routing structure.

## How we'll verify after fix
1. Open DevTools → Application → Local Storage → delete `aumrti-hms-auth` → reload. App should redirect to `/login` cleanly (today it hangs).
2. Log in. Console should show NO red errors from `AuthContext`.
3. Open Network tab, filter `users?select` — should see ONE request returning 1 row with `hospital_id`.
4. Navigate to `/opd`, `/ipd`, `/billing` — data should load on every page without hard refresh.
5. If any module is still empty, the new global error banner will tell us exactly which RLS / 401 is the culprit.

Approve and I'll implement all 6 fixes in one pass.
