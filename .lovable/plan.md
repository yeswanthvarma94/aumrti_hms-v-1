

# Performance Fix Plan — Targeted, Non-Invasive

The app feels slow on every navigation. Based on a code + database audit, the database is **not** the main bottleneck (519 indexes already exist, no problematic RLS subqueries). The real cost is in the **client**: every page re-queries Supabase on mount instead of using cache, route guards re-fetch the user record on every navigation, list pages pull `SELECT *` payloads, and several module pages are 800–1100 lines that load everything eagerly.

This plan fixes the **highest-impact, lowest-risk** items first. No business logic changes. No removed features. No DB migrations required.

---

## Findings (audit summary)

| Symptom | Evidence | Impact |
|---|---|---|
| Route guards re-query `users` on every navigation | `AuthGuard` + `RoleGuard` both call `useHospitalId()`, which fires a Supabase query in `useEffect` with no cache | Adds 100–400 ms to *every* page change |
| Cache-bypassing data fetches | 221 files run `supabase.from(...)` inside `useEffect` instead of `useQuery` | Every tab switch = full re-fetch |
| Oversized list payloads | 171 `.select("*")` calls — many on `bills`, `patients`, `admissions`, `audit_log` | Slow first paint on list pages |
| Monolithic module pages | LMS 1125, Staff 972, APIConfigHub 962, Physio 945, Mortuary 913 LOC — all loaded as one chunk | Slow first-open of each module |
| Heavy libs likely in main bundle | `recharts`, `xlsx`, `qrcode`, `qrcode.react` all top-level imports | Inflates initial JS |
| DB indexes & RLS | 519 indexes; 0 inline-subquery RLS policies | **Not** the bottleneck — skip DB work |

---

## Phase 1 — Stop the per-navigation re-query (biggest single win)

The root cause of "every tab feels slow" is that `useHospitalId` queries the `users` table on every mount, and both `AuthGuard` and every `RoleGuard` wait on it.

**Changes:**
- Convert `useHospitalId` to use TanStack Query with `staleTime: Infinity` and a stable key (`['current-user', authUserId]`). Auth state change invalidates it.
- Have `AuthGuard` resolve `getSession()` once and prefetch the user record into the query cache before rendering children.
- `RoleGuard` reads from the cached query — no second network call.

**Files:** `src/hooks/useHospitalId.ts`, `src/components/auth/AuthGuard.tsx`, `src/components/auth/RoleGuard.tsx`

**Expected:** Navigation between modules drops from ~500 ms perceived lag to instant.

---

## Phase 2 — Convert eager `useEffect` fetches on the 10 highest-traffic pages to `useQuery`

Audit shows 221 files mix `useEffect` + `supabase`. We will not touch all of them. We target the pages users open most:

`Dashboard`, `PatientsPage`, `BillingPage`, `IPDPage`, `OPDPage`, `PharmacyPage` (IP + Retail), `LabPage`, `RadiologyPage`, `InboxPage`, `AnalyticsPage`.

**Changes per page:**
- Wrap data fetches in `useQuery` with stable keys including `hospital_id` and any filters.
- Set `staleTime` per data category:
  - master data (departments, wards, services, drugs): 10 min
  - operational lists (bills, admissions, patients): 30 sec
  - real-time (beds, OPD queue, alerts): 5 sec
- Add `placeholderData: (prev) => prev` to keep pages visible during refetch (no spinner flash on filter change).

**Files:** ~10 page files + small additions under `src/hooks/queries/` for shared lookups (`useHospital`, `useDepartments`, `useDoctors`).

**Expected:** Re-opening any of these pages within 30 sec uses cache → instant. First open faster too because lookups are deduped.

---

## Phase 3 — Replace `SELECT *` on list views with explicit columns

171 occurrences across the codebase. We fix only the **list views** (where row count × column count makes payloads large): bills list, patients list, admissions list, audit log, OPD queue, lab/radiology orders, pharmacy dispensing, inbox messages.

**Pattern:**
```ts
// before
.select('*')
// after  
.select('id, bill_number, total_amount, payment_status, bill_date, patient:patients(full_name, uhid)')
```

Detail/edit drawers can keep `select('*')` since they fetch one row.

**Files:** ~12 page/component files. Roughly 25 query sites.

**Expected:** 30–60% smaller responses on list pages → faster first paint, less JSON parsing.

---

## Phase 4 — Add server-side pagination where missing

Pages that today load every row: bills list, patients list, admissions list, audit log, lab orders, radiology orders, pharmacy dispensing, inbox.

**Changes:**
- Default page size 25, simple Prev/Next pagination control.
- Use `.range(from, to)` and `{ count: 'exact', head: false }`.
- TanStack Query key includes the page number; `placeholderData` keeps prior page visible while next loads.

**Files:** Same list pages from Phase 3, plus a small reusable `<Pagination>` UI component.

**Expected:** Lists with 1k+ rows still load in <1 sec. Today they degrade linearly with total rows.

---

## Phase 5 — Bundle: dynamic-import the heavy libs

Move these out of the main chunk and into the routes that actually use them:

| Library | Used in | Action |
|---|---|---|
| `recharts` | Dashboard charts, Analytics, HOD | dynamic `import()` inside chart components |
| `xlsx` | Billing export, HR payslip, Inventory export | dynamic import inside the export click handler |
| `qrcode` / `qrcode.react` | Payment landing, portal login, bill IRN | dynamic import where rendered |

Also audit `import * as` patterns and replace `import _ from 'lodash'` style imports with named imports if any are found.

**Files:** chart wrapper components, export handlers, QR components. **No** new dependencies (no rollup-visualizer needed for this fix — keeping it lean).

**Expected:** Main bundle ~30–40% smaller → faster first paint, faster login.

---

## Phase 6 — Split the 5 monolith pages

Files >800 LOC currently load all sub-views eagerly inside their lazy chunk. Split each into a shell + lazy-loaded tabs:

- `LMSPage` (1125)
- `SettingsStaffPage` (972)
- `APIConfigHubPage` (962)
- `PhysioPage` (945)
- `MortuaryPage` (913)

**Pattern:** keep page shell + tab navigation eager; lazy-load each tab's content with `React.lazy` + `<Suspense>`.

**Files:** these 5 pages and any tab subcomponents extracted.

**Expected:** First open of these modules ~50% faster. No visual change.

---

## Phase 7 — Verify

After all phases:
- Visit `/dashboard`, `/patients`, `/billing`, `/ipd`, `/opd`, `/pharmacy` in sequence.
- Confirm: (a) navigation between them is instant after first load, (b) lists with filters don't re-spinner, (c) first-time module open is faster.
- Run the OPD walk-in, IPD admission, billing payment, and discharge flows end-to-end to confirm nothing broke.

---

## Out of scope (deliberately)

- DB migrations / new indexes — already covered (519 exist).
- RLS rewrite — not needed (audit shows zero inline-subquery policies).
- Seeding 945k test rows — not needed to fix the reported issue.
- Touching all 221 eager-`useEffect` files — diminishing returns; top 10 pages cover ~80% of usage.
- Changing the OPD walk-in flow, discharge stepper, NDPS, blood-bank/dialysis/CSSD/oncology hard-blocks, bill-number RPC, or any documented invariant in AGENTS.md.
- New dependencies. We use TanStack Query (already installed) and dynamic `import()`.

---

## Rollout order & checkpoints

```text
Phase 1 (Auth/Guard caching)   →  test nav between any 2 modules
Phase 2 (10 pages → useQuery)  →  test re-open of Dashboard, Patients
Phase 3 (SELECT * cleanup)     →  test list pages still render same data
Phase 4 (Pagination)           →  test prev/next on bills + patients
Phase 5 (Bundle splitting)     →  test Analytics still renders charts
Phase 6 (Monolith split)       →  test LMS/Staff/Physio open + tabs work
Phase 7 (Smoke test)           →  OPD walk-in, IPD admit, pay, discharge
```

Each phase is independently revertable. Phase 1 alone should make the app feel dramatically faster.

