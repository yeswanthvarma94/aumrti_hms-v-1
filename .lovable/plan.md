
# Fix: All modules blank — AuthGuard is auto-signing users out after login

## What is actually happening (read this first)

The network log from your last login session tells the whole story:

1. `POST /auth/v1/token?grant_type=password` → 200 OK (login succeeded)
2. `GET /users?...auth_user_id=...` → returned `[{"hospital_id": "8f3d08b3-...", "role": "super_admin", "full_name": "Yeswanth"}]` (profile is fine, hospital is fine, RLS is fine)
3. `GET /clinical_alerts`, `GET /hospitals`, `GET /whatsapp_notifications` → all 200 OK with data (modules WERE fetching)
4. **Then ~1 second later: `POST /auth/v1/logout?scope=global` → 204** (forced sign-out)
5. You land back on `/login`, every module is blank because there is no session.

So the database is fine. RLS is fine. The user row is fine. The bug is that **the app is logging itself out automatically right after login**.

The trigger is the recovery code added in the previous fix:

- `AuthContext.tsx` has a `useEffect` that watches `userRecord`. When `authUserId` is set but the React Query for `users` has not yet returned its first result, `userRecord` is `undefined` and the effect treats this as **"account not linked to any hospital"** and sets `authError`.
- `AuthGuard.tsx` then renders the **"Session error — Sign out & retry"** screen.
- Combined with React error #426 (a Suspense/hydration error visible in the console) and the global `ErrorBoundary`, the recovery flow ends up calling `forceSignOut()` → `supabase.auth.signOut()` → which is exactly the `/auth/v1/logout?scope=global` call we see.

The "fix" we shipped to make silent failures visible is now the cause of the failure for every healthy session.

## The fix — surgical, low-risk

### 1. `src/context/AuthContext.tsx` — stop the false "no hospital" error

Replace the eager error-detection `useEffect` with a stricter one that:
- Only sets `authError` when the query has **actually completed with a definite result** (i.e. `userRecord === null` after the query has finished, not merely while it is still resolving).
- Waits a grace period (e.g. one extra render after `userLoading` becomes false) before declaring failure, so React Query's first transition does not look like "missing".
- Never sets `authError` while `userQueryError` is null AND `userRecord` is `undefined` (undefined = not yet fetched; null = fetched and empty).
- Removes the auto-toast that fires before the user has even seen the dashboard.

### 2. `src/components/auth/AuthGuard.tsx` — make the recovery screen opt-in, not automatic

- Stop rendering the "Session error" screen on the first render where `authError` flips true.
- Only show it when `authError` has been stable for ≥2s **and** `hospitalId` is still null **and** `authUserId` is set.
- Default behaviour returns to the previous app: render children once `loading` is false and `session` exists. The recovery UI becomes a true safety net, not a tripwire.

### 3. Make `loading` cover the user-record fetch properly

Currently `loading` becomes false the moment `session` is resolved, even if the `users` row is still being fetched. That is the window in which the buggy effect fires. Tighten `loading` to remain true while `authUserId` is set AND `userRecord === undefined` AND `userQueryError === null`. This single change removes the race entirely — `AuthGuard` will keep showing the spinner instead of mounting the children (and the buggy effect path) prematurely.

### 4. Remove the duplicate `users` queries

The network log shows `GET /users?...auth_user_id=...` firing 3+ times during one login (from `AuthContext`, `IdleTimer`, and `BranchContext`). Each one re-triggers React Query churn and contributes to the React #426 error. Make `IdleTimer` and `BranchContext` consume `useAuth()` instead of re-querying `users` directly.

### 5. Keep the real diagnostics, but route them safely

- Keep the 8s `getSession()` timeout (it is correct).
- Keep `forceSignOut()` available, but only invoked from a **button the user clicks** — never from an automatic effect.
- Keep the toast for `userQueryError` (real RLS / network failure), but only fire it after the query has definitively errored, not while loading.

## Files that will change

- `src/context/AuthContext.tsx` — tighten `loading`, fix the error effect's race, remove premature toasts.
- `src/components/auth/AuthGuard.tsx` — gate the recovery screen behind a 2s stability check.
- `src/components/auth/IdleTimer.tsx` — read role/hospital from `useAuth()` instead of re-querying.
- `src/contexts/BranchContext.tsx` — read role/hospital from `useAuth()` instead of re-querying.

## What will NOT change

- No database changes. No RLS changes. No migrations. The DB and policies are healthy — your network log proves that.
- No changes to module data fetching, queries, or hospital_id filters.
- No removal of the recovery screen — it stays as a manual safety net for genuine "user has no hospital" cases.

## Verification after the fix

1. Hard refresh the preview, sign in with `gyskumar94@gmail.com`.
2. You should land on `/dashboard` — not `/login`.
3. Open Network tab: there should be **no** `/auth/v1/logout` call after login.
4. Open Settings → Departments, Settings → Staff, Patients, OPD, IPD, Pharmacy — every module should display data again.
5. The `users` table should be queried at most **once** per session (down from 3+).
6. The "Session error — Sign out & retry" screen should NOT appear for a healthy account. It should only appear if you manually delete your `public.users` row in Supabase.

## Why this is the right diagnosis

The smoking-gun evidence is in the network log you already have:
- The `users` query returned a complete, valid row with a hospital_id.
- The hospital query returned `Aumrti Hospitals`.
- Module data queries (`whatsapp_notifications`, `clinical_alerts`) returned 200 OK.
- Then the app called `/auth/v1/logout?scope=global` itself.

A backend / RLS / data outage cannot produce that pattern. Only client code calling `signOut()` can. The only new client code that calls `signOut()` (besides the user-clicked sidebar button) is the recovery screen we added in the previous step. Removing its automatic activation restores the app.
