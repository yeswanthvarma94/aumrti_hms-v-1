

# Diagnosis: Why the app is slow / tabs not opening

## Primary culprit — Dashboard realtime loop (Phase 7.3 regression)

`src/hooks/useDashboardData.ts` lines 144–160:
- The realtime `useEffect` lists `loading` in its dependency array.
- The channel name uses `Math.random()` so every re-run creates a brand-new channel.
- Inside the channel handlers, every postgres event calls `fetchAll()`, which flips `loading` → effect re-runs → channel torn down + recreated with a new random id → reconnect handshake → queries refire.

Net effect: as soon as you land on `/dashboard`, the page enters a **realtime → fetch → setState → re-subscribe** loop that hammers Supabase, blocks the main thread with re-renders, and starves every other page (because the React Query cache, network and Supabase realtime socket are shared globally). This matches your symptom of "tabs not even opening" — the browser tab is too busy reconnecting and re-fetching to render anything else.

## Secondary issues found

1. **`Math.random()` in channel names everywhere** (`useDashboardData`, `IPDPage`, `EmergencyPage`). React 18 StrictMode mounts effects twice in dev → 2 channels per page per mount. Combined with normal remounts, the realtime socket accumulates dozens of dead/duplicate subscriptions.
2. **EmergencyPage `fetchData` not memoised against `hospitalId`** — it re-creates on every render and is in the realtime effect's deps, so the channel re-subscribes on every parent re-render once an ED event fires.
3. **Service worker caches `/index.html`** with `cache-first` (`public/sw.js` line 51). After Phase 6's chunk-name changes were published, browsers that already have the old SW are serving the old `index.html` which references hashed JS files that no longer exist → blank/slow page until the SW updates. The SW also has no version bump since v1.
4. **Bundle-level eager imports**: `App.tsx` lazy-loads route pages, but `LandingPage` and `LoginPage` are imported eagerly at the top, so they ship in the initial JS even when the user is already authenticated.

## What to fix (in this order)

### Fix 1 — Stop the dashboard realtime loop (biggest win)
In `src/hooks/useDashboardData.ts`:
- Remove `loading` from the realtime effect's dependency array.
- Use a stable channel name: `dashboard-realtime-${hid}` (drop `Math.random()`).
- Track `hid` via state (not ref) so the effect re-runs only when `hid` actually changes from null → uuid.
- Debounce the realtime → `fetchAll` calls (e.g. coalesce events within 500 ms) so a burst of bed/opd inserts doesn't trigger 10 sequential refetches.

### Fix 2 — Stable channel names + correct deps
- `IPDPage.tsx` line 137: drop `Math.random()` suffix → `ipd-realtime-${hospitalId}`.
- `EmergencyPage.tsx` line 81: same change → `ed-realtime-${hospitalId}`. Also wrap `fetchData` so its identity is stable across renders or remove it from the realtime effect's deps and call a ref-stored version.

### Fix 3 — Bump the service worker and stop caching `index.html`
In `public/sw.js`:
- Bump `CACHE_NAME` to `'aumrti-hms-v2'` so old caches get purged on activate.
- Remove `'/index.html'` and `'/'` from `STATIC_ASSETS`.
- Switch the same-origin handler to **network-first for `.html` and navigation requests** (cache-first only for hashed JS/CSS/fonts/images). This prevents the "old shell points to deleted JS chunks" failure mode going forward.

### Fix 4 — Trim the eager bundle
In `src/App.tsx`:
- Convert `LandingPage` and `LoginPage` to `lazy()` like every other route. They're only needed when unauthenticated, but they're currently shipped in every initial load including the dashboard.

## Out of scope for this fix (noted, not done)

- The 4 security findings shown in the Security panel (client-side OTP, open hospital-registration endpoint, missing Razorpay signature verification, AI keys leaked to browser) are real and serious but unrelated to the slowness. Worth fixing in a separate plan.

## If the fix doesn't help — rollback option

You can roll back without me doing anything: open the chat **History** tab and pick a checkpoint from before "Phase 7" started (look for the message just before "Continue phase 7"). That message-level revert restores the project files atomically. After reverting, click **Publish → Update** to push the rolled-back build live.

```xml
<lov-actions>
  <lov-open-history>View History</lov-open-history>
</lov-actions>
```

## Risk & rollback for the fix itself

- All four fixes are isolated edits to 4 files. If any single one regresses, revert just that file from the History view.
- After applying, hard-refresh the published site once (Ctrl+Shift+R) so the new SW activates and clears the v1 cache.

## Files touched

- `src/hooks/useDashboardData.ts` — kill the realtime loop, debounce refetches.
- `src/pages/ipd/IPDPage.tsx` — stable channel name.
- `src/pages/emergency/EmergencyPage.tsx` — stable channel name + memoised fetch.
- `public/sw.js` — version bump, drop HTML caching, network-first for navigations.
- `src/App.tsx` — lazy-load LandingPage and LoginPage.

