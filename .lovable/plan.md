

# Why the app is still slow / "stuck until hard refresh"

The Phase 7 realtime fix worked — that loop is dead. But two **separate** problems remain that produce the exact symptoms you're seeing.

## Root cause #1 — Stale Service Worker (this is why "hard refresh fixes it")

Last round we shipped `sw.js` v2 (network-first HTML). But users already have v1 installed in their browser. The v2 worker installs in the background and only takes control on the **next** navigation, not the current page. Until the user hard-refreshes, v1 keeps serving the cached `index.html` that points to JS chunk hashes which no longer exist on the published build → infinite "loading" spinner / blank tabs.

This perfectly matches: *"only sometimes when I hard refresh the browser it again restarts and starts to work"*.

The fix is to make v2 **forcibly take over and trigger a one-time auto-reload** of all open tabs the moment it activates. After this is shipped + republished once, every user gets the new SW automatically and never has to hard-refresh again.

## Root cause #2 — Duplicate user-record queries on every navigation

`useHospitalId` already caches the user's `hospital_id` + `role` in TanStack Query (cache forever). But:

- `AppHeader.tsx` lines 71–83 → independently re-queries `users` on every mount.
- `AppSidebar.tsx` lines 63–76 → independently re-queries `users` on every mount.
- `EmergencyPage.tsx` line 40 → also re-queries `users` instead of using `useHospitalId`.

So every time a tab opens, the auth-critical path fires **3 redundant Supabase queries** in serial before the page can render. Combined with the next issue, this is enough to make pages feel "stuck".

## Root cause #3 — Notification centre polling on every page

`NotificationCentre.tsx` polls 2 tables every 30 seconds on **every authenticated page**. With 30+ open tabs across a hospital, plus realtime channels per page, the Supabase HTTP pool saturates and pages start timing out.

Switching to **realtime subscriptions** (which we already use elsewhere) eliminates the polling entirely.

## Root cause #4 — Brittle preview-host detection in `registerSW.ts`

The expression on line 21 is:
```ts
host.includes('lovable.app') === false && host.includes('lovable')
```
Operator-precedence bug — works by coincidence today but will silently flip if Lovable changes hostnames. Needs to be a clean allow-list.

---

# The fix (5 small, isolated edits)

### Fix A — `public/sw.js` : force-takeover + auto-reload all tabs on update
- Already calls `clients.claim()`. Add a `postMessage('SW_ACTIVATED')` to all clients on activate.
- Bump cache name to `aumrti-hms-v3` so v2 caches are wiped on activate.

### Fix B — `src/lib/registerSW.ts` : listen for SW activation and reload once
- Add `navigator.serviceWorker.addEventListener('controllerchange', …)` that does a single `window.location.reload()` (guarded with `sessionStorage` so it only fires once per session).
- Rewrite the host check as a clean allow-list of preview hosts (no boolean ambiguity).

### Fix C — `src/components/layout/AppHeader.tsx` : use cached user record
- Delete the local `supabase.from('users')…` query. Read `hospitalId` and user info from `useHospitalId()` (already cached forever).

### Fix D — `src/components/layout/AppSidebar.tsx` : use cached user record
- Same change. Read `userName`/`role` via `useHospitalId()` extended (or via a tiny `useCurrentUser()` reusing the same TanStack Query cache key) instead of re-querying `users`.

### Fix E — `src/components/layout/NotificationCentre.tsx` : realtime instead of 30s poll
- Drop the 30 s `setInterval`.
- Subscribe via `supabase.channel('notif-${hospitalId}')` to `whatsapp_notifications` and `clinical_alerts` (filtered by `hospital_id`). Initial fetch on mount; realtime keeps it fresh.
- Reuses the existing realtime socket — zero extra cost.

### Fix F (small, optional) — `src/pages/emergency/EmergencyPage.tsx`
- Replace local `users` lookup at line 40 with `useHospitalId()` for consistency.

---

# What this delivers

| Symptom | Cause | Fix |
|---|---|---|
| Pages don't open until hard refresh | Stale SW v1 still serving old chunks | Fix A + B (SW v3 + auto-reload) |
| First load after navigation feels stuck | 3 duplicate `users` queries blocking | Fix C + D + F |
| App degrades over time when left open | 30 s notification polling | Fix E (realtime) |
| Future host changes silently break SW | Brittle preview-host check | Fix B (clean allow-list) |

After these are merged + published **once**, every existing user's browser will:
1. Download SW v3 in the background
2. Auto-reload exactly once when v3 takes over
3. From then on, get fresh `index.html` on every navigation — no more "stuck pages"

## Risk & rollback
- All 5 files are isolated, no shared state changes.
- If anything regresses, revert just that file from chat **History**.
- Zero database changes. Zero auth changes.

## Files touched
- `public/sw.js`
- `src/lib/registerSW.ts`
- `src/components/layout/AppHeader.tsx`
- `src/components/layout/AppSidebar.tsx`
- `src/components/layout/NotificationCentre.tsx`
- `src/pages/emergency/EmergencyPage.tsx`

## If even this doesn't help — rollback option
You can roll the whole project back without me touching anything: open the chat **History** tab and pick a checkpoint from before "Continue phase 7". That restores the project files atomically. Then click **Publish → Update** to push it live.

```xml
<lov-actions>
  <lov-open-history>View History</lov-open-history>
</lov-actions>
```

