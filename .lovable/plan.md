

## Analytics Not Syncing — Root Cause Analysis & Fix Plan

### What I Found

After reviewing the code and database:

**The data IS there** — 54 bills (₹15.11L this month), 21 OPD encounters, 14 admissions, 7 doctors, 24 departments, 107 lab items. The analytics hooks (`useAnalyticsData.ts`, `useDoctorDeptData.ts`) query real Supabase tables with correct `hospital_id` filtering and RLS policies are properly configured.

### Identified Issues

**1. Refresh Button is Broken**
The "Force Refresh" and refresh icon button calls:
```
queryClient.invalidateQueries({ queryKey: ["analytics"] })
```
But query keys are `["analytics-revenue-kpis", range]`, `["analytics-clinical-kpis", range]`, etc. TanStack Query's prefix matching requires the first array element to match exactly — `"analytics"` does not equal `"analytics-revenue-kpis"`, so **no queries are ever invalidated**. Data stays stale until the 5-minute `refetchInterval` fires.

**Fix:** Change to `queryClient.invalidateQueries({ predicate: (query) => String(query.queryKey[0]).startsWith("analytics") })`.

**2. AI Digest Tab Doesn't Receive Date Range**
`AIDigestTab` is rendered without the `range` prop — it manages its own date internally. This is intentional (date navigation), but the KPI snapshot panel title says "Today's Key Numbers" regardless of which date is selected. Minor issue.

**3. Custom Report Builder Missing Lab/Pharmacy Queries**
The `runQuery` function handles `revenue`, `opd`, `ipd`, and `quality` sources but has no implementation for `lab` or `pharmacy` data sources — clicking "Preview Report" for those returns empty results.

**Fix:** Add query implementations for `lab` and `pharmacy` sources.

**4. Doctors Tab Shows Only `role='doctor'` Users**
The doctor scorecard queries `users` table with `.eq("role", "doctor")`. If doctors were added with slightly different role values (e.g., `"Doctor"` capitalized), they won't appear.

**Fix:** Verify role values are consistent; no code change needed if roles are stored correctly (they are — confirmed 7 doctors with `role='doctor'`).

### Implementation Plan

| Step | File | Change |
|------|------|--------|
| 1 | `src/pages/analytics/AnalyticsPage.tsx` | Fix `handleRefresh` to use predicate-based invalidation matching all `analytics-*` query keys |
| 2 | `src/components/analytics/CustomReportBuilder.tsx` | Add real query implementations for `lab` and `pharmacy` data sources |
| 3 | `src/components/analytics/AIDigestTab.tsx` | No change needed — already queries real data |
| 4 | All analytics hooks | Already query real data — no changes needed |

### Technical Details

**Fix 1 — Refresh invalidation (AnalyticsPage.tsx):**
```typescript
const handleRefresh = () => {
  queryClient.invalidateQueries({
    predicate: (query) => {
      const key = String(query.queryKey[0] || "");
      return key.startsWith("analytics");
    },
  });
  setLastUpdated(new Date());
  toast({ title: "Data refreshed" });
};
```

**Fix 2 — Lab/Pharmacy in CustomReportBuilder:**
- `lab` source: query `lab_order_items` grouped by day/status, showing test counts, pending, reported
- `pharmacy` source: query `bills` where `bill_type='pharmacy'`, showing sales totals, counts by retail vs IP

