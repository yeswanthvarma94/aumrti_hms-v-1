
# Critical performance audit: why the app frequently lags/freezes and needs hard refresh

## Executive diagnosis

The lag is not caused by one module. It is caused by several app-wide patterns that combine badly:

1. **Global mouse/keyboard activity is doing too much work**
   - `IdleTimer` listens to `mousemove`, `keydown`, `click`, `scroll`, and `touchstart` globally.
   - Every mouse movement calls `resetTimer()`, which clears and recreates timers.
   - On a busy clinical app, this can run hundreds of times per minute across every screen.

2. **Service worker/cache behaviour can make the app look “stuck” until hard refresh**
   - `src/main.tsx` always calls `registerServiceWorker()`.
   - In preview it tries to unregister/clear cache, but in production it registers `/sw.js`.
   - The service worker uses cache-first for static JS/CSS assets.
   - If the browser has stale cached chunks or a stale service worker controller, the app can load old code until a hard refresh clears it.
   - This exactly matches the symptom: “if I don’t hard refresh, the app is stuck”.

3. **Route navigation force-remounts whole modules**
   - `AppShell` wraps `<Outlet />` in a keyed container:
     ```tsx
     key={location.pathname}
     ```
   - This forces the entire page subtree to unmount/remount on every route change.
   - That re-runs Supabase queries, realtime subscriptions, timers, module initialization, and animations.

4. **Realtime subscriptions trigger broad refetch storms**
   - Several modules subscribe to `postgres_changes` and invalidate/refetch full queries on every event:
     - IPD: beds + admissions
     - Lab: lab_orders + lab_order_items
     - Radiology
     - Emergency
     - Dashboard
     - Dental / AYUSH token queues
   - When multiple records change, the app can repeatedly refetch large joined datasets.

5. **Analytics/reporting hooks pull too much data and refresh on intervals**
   - `useAnalyticsData.ts` and `useDoctorDeptData.ts` have many `refetchInterval: 5 * 60 * 1000`.
   - Several hooks fetch thousands of rows and aggregate client-side.
   - They also repeatedly call their own `getHospitalId()` instead of using the cached `AuthContext`.
   - This is not always visible immediately, but contributes to periodic lag.

6. **Sidebar prefetching is unsafe/inconsistent**
   - `AppSidebar` calls `queryClient.prefetchQuery({ queryKey, staleTime })` without a `queryFn`.
   - Some prefetch keys do not match actual route query keys, e.g. IPD prefetches `["ipd-beds", hospitalId]` while IPD uses `["ipd-beds-admissions", hospitalId]`.
   - This can create failed prefetches/no-op work on hover and does not actually improve navigation.

7. **Development preview performance is especially affected**
   - Browser profile shows slow dev-time startup:
     - DOM Content Loaded around 9.4s
     - FCP around 10.9s
     - 91 script resources loaded
   - This is partly Vite/Lovable preview overhead, but the app patterns above make it worse.

## Fix plan

### 1. Make service worker safe and stop stale-cache lockups

Files:
- `src/main.tsx`
- `src/lib/registerSW.ts`
- `public/sw.js`

Changes:
- Keep service worker disabled/unregistered in Lovable preview and iframe contexts.
- In production, add a safer update flow:
  - Detect updated service worker.
  - Force `skipWaiting` / `clients.claim`.
  - Reload once only after a new version activates.
- Add defensive cache cleanup for old `aumrti-hms-*` caches.
- Do not cache Supabase/API responses.
- Keep static asset cache safe for hashed files only.
- Prevent stale JS chunks from causing stuck screens after deployment.

Expected result:
- Users should not need hard refresh after app updates.
- Preview should not be polluted by persistent service worker caches.

### 2. Throttle the global idle timer

File:
- `src/components/auth/IdleTimer.tsx`

Changes:
- Replace “reset timer on every mousemove” with a throttled activity handler.
- Use refs for timer state so activity does not cause unnecessary React work.
- Only reset timers at most once every 15–30 seconds while the user is active.
- Keep the same logout/security behaviour.

Expected result:
- Large reduction in app-wide background work during normal mouse movement.

### 3. Stop force-remounting the active module on every navigation

File:
- `src/components/layout/AppShell.tsx`

Changes:
- Remove:
  ```tsx
  key={location.pathname}
  ```
  from the route content wrapper.
- Keep the layout stable.
- Let React Router mount/unmount only the actual route component.

Expected result:
- Less repeated initialization, fewer query bursts, fewer subscription resets, smoother route transitions.

### 4. Fix sidebar prefetching

File:
- `src/components/layout/AppSidebar.tsx`

Changes:
- Remove unsafe `prefetchQuery` calls that do not provide `queryFn`.
- Either:
  - remove hover prefetch entirely, or
  - replace with explicit prefetch functions only for routes with known query functions.
- Correct mismatched query keys if prefetch is retained.

Recommended first fix:
- Remove hover prefetching for now because it is not reliable and can create unnecessary work.

Expected result:
- No failed/no-op prefetch work on sidebar hover.
- Less background noise during navigation.

### 5. Debounce realtime invalidation across modules

Files to audit/update:
- `src/pages/ipd/IPDPage.tsx`
- `src/pages/lab/LabPage.tsx`
- `src/pages/radiology/RadiologyPage.tsx`
- `src/pages/emergency/EmergencyPage.tsx`
- `src/pages/opd/OPDPage.tsx`
- `src/pages/dental/DentalPage.tsx`
- `src/components/ayush/ConsultationTab.tsx`
- `src/hooks/useDashboardData.ts`

Changes:
- Add shared debounced invalidation helper or per-file `useRef` debounce.
- Coalesce bursts of realtime events into one refetch every 500–1000ms.
- Avoid invalidating broad query families where a narrower cache update is possible.
- Keep existing realtime functionality; do not remove live updates.

Expected result:
- No refetch storm when multiple rows update.
- Better stability in OPD/IPD/Lab/Radiology.

### 6. Optimise analytics/report refresh behaviour

Files:
- `src/hooks/useAnalyticsData.ts`
- `src/hooks/useDoctorDeptData.ts`

Changes:
- Remove or increase aggressive `refetchInterval` values.
- Use `enabled: !!hospitalId`.
- Use cached `useHospitalId()`/AuthContext where hooks are inside React components instead of repeated `supabase.auth.getUser()` + `users` lookups.
- Add reasonable `staleTime` and `gcTime`.
- Where possible, replace large row fetches with count/head queries or RPC aggregation later.

Expected result:
- Analytics will not periodically create large client-side processing spikes.

### 7. Clean up non-critical console noise

File:
- `src/pages/LandingPage.tsx`
- Possibly `src/components/ui/dialog.tsx`

Observed issue:
- Console warning:
  ```text
  Function components cannot be given refs
  Check the render method of LandingPage / DialogContent
  ```

Changes:
- Verify dialog component usage and any custom wrappers.
- Fix the ref warning if caused by passing Radix props to a non-forwardRef component.

Expected result:
- Cleaner console, easier debugging.
- Not the main freeze cause, but worth fixing.

## Verification plan after implementation

1. Run build/typecheck.
2. Use browser performance profile before and after:
   - Check script duration.
   - Check event listener count.
   - Check interaction responsiveness.
3. Navigate across major routes:
   - `/dashboard`
   - `/ipd`
   - `/opd`
   - `/lab`
   - `/radiology`
   - `/billing`
   - `/analytics`
4. Confirm:
   - No hard refresh required after normal reload.
   - No route freeze after switching modules repeatedly.
   - Realtime still updates queues/worklists.
   - Idle logout warning still works.
   - No service worker registration inside Lovable preview.
5. Inspect console/network:
   - No prefetch query errors.
   - No repeated auth/user lookups on every analytics hook.
   - No visible realtime refetch storm.

## Priority order

1. Service worker/cache safety.
2. IdleTimer throttling.
3. Remove route force-remount key.
4. Remove/fix sidebar prefetch.
5. Debounce realtime invalidations.
6. Optimise analytics intervals.
7. Clean console warnings.

## Expected impact

These fixes target the app-wide causes instead of patching one module. The biggest improvements should come from service worker cache hardening, IdleTimer throttling, and removing forced route remounting. Together, they should significantly reduce the “stuck until hard refresh” behaviour and make the entire HMS feel more stable.
