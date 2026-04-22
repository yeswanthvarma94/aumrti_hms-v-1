

# Fix the 5–7s tab-switch lag — single-resolution AuthContext

## Root cause confirmed

In `src/hooks/useHospitalId.ts` (lines 71–113), every component that calls the hook:
1. Starts with `authUserId = undefined` → `loading = true`
2. Independently calls `supabase.auth.getSession()` and registers an `onAuthStateChange` subscription
3. Sets state asynchronously, causing a render cycle before `hospitalId` is available

`AppSidebar`, `AuthGuard`, `RoleGuard`, `AppHeader`, `BranchSwitcher` and the page itself all call this hook on every navigation — 6+ concurrent session resolutions per click. The TanStack Query cache for the user record is already there, but the *gate to enable that query* (`authUserId`) re-resolves per mount, which is the bottleneck.

## Fix in 6 small, isolated edits

### 1. New file — `src/context/AuthContext.tsx`
Resolves session **once** at the app root. Internally uses TanStack Query to fetch the `users` row and `hospitals` row (same query keys as today, so existing caches transfer over). Exposes `useAuth()` returning `{ session, user, authUserId, hospitalId, userId, role, fullName, hospitalName, hospitalLogo, loading }`. Listens for `branch:changed` and `storage` events for branch switching (preserving today's behaviour).

### 2. `src/App.tsx` — wrap app + tighten QueryClient + skeleton fallback
- Add `<AuthProvider>` *inside* `<QueryClientProvider>` and *outside* `<BrowserRouter>` so every route has access.
- Update QueryClient defaults:
  ```ts
  staleTime: 2 * 60 * 1000,
  gcTime: 30 * 60 * 1000,
  refetchOnMount: false,   // ← key change: cached data renders instantly on revisit
  refetchOnWindowFocus: false,
  refetchOnReconnect: true,
  retry: 1,
  ```
- Replace the blank `<div />` Suspense fallback in `SuspenseWrap` and `SM` with a lightweight `<PageSkeleton />` (same dimensions as the content area) so the white flash on first lazy-load disappears.

### 3. `src/hooks/useHospitalId.ts` — collapse to a thin context reader
Replace the entire body with:
```ts
export function useHospitalId() { return useAuth(); }
export const useHospital = useHospitalId;
```
Keep the existing `getHospitalIdAsync()` export untouched (used by event handlers). This preserves the public API — every existing import keeps working with **zero** call-site changes across the codebase.

### 4. `src/components/auth/AuthGuard.tsx` — read from context only
Remove the local `useState` + `getSession()` + `onAuthStateChange` block. Read `{ session, loading }` from `useAuth()`. Same loading spinner UI, same redirect behaviour — just no duplicate auth resolution.

### 5. `src/components/layout/AppSidebar.tsx` — prefetch on hover
Add `onMouseEnter` to each nav button that calls `queryClient.prefetchQuery` for that route's primary key (`["dashboard-kpis", hospitalId]`, `["opd-tokens", hospitalId, today]`, `["ipd-beds", hospitalId]`, `["billing-bills", hospitalId]`, `["lab-orders", hospitalId]`). Uses `staleTime` from the actual query so it's a no-op when data is already fresh. Pure additive change — no UI movement.

### 6. No changes needed elsewhere
`useHospital` / `useHospitalId` consumers across ~80 files keep working because the hook signature is unchanged. `BranchSwitcher`, `AppHeader`, `RoleGuard`, `NotificationCentre`, page components — all read from the same context now.

## What the user will see

| Action | Before | After |
|---|---|---|
| First app load | 2–3s session resolution + page render | Same (one-time cost) |
| Click any sidebar tab | 5–7s blank → render | <500ms (lazy bundle) or instant (cached) |
| Revisit a tab within 2 min | Full refetch | Instant from cache |
| Hover then click | Same as click | Data already fetched on hover |
| Sign out / sign in | Works | Works (provider invalidates queries) |
| Branch switcher | Works | Works (same `branch:changed` event) |

## Risk & rollback
- All 6 edits are isolated; no DB changes, no schema changes, no edge function changes.
- `useHospitalId` keeps the same return shape → impossible to break consumers.
- If anything regresses, revert just `AuthContext.tsx` + `useHospitalId.ts` from chat **History**.

## Files touched
- `src/context/AuthContext.tsx` (new)
- `src/App.tsx`
- `src/hooks/useHospitalId.ts`
- `src/components/auth/AuthGuard.tsx`
- `src/components/layout/AppSidebar.tsx`

## Acceptance verification
After deploy, open DevTools Network tab → click Dashboard → OPD → Billing → Dashboard. You should see:
- Exactly **one** `users` query and **one** `hospitals` query for the entire session
- Zero auth-related Supabase calls on tab navigation
- Tab switches under 500ms (first-bundle load) and instant on revisit

