

## Plan: Fix Analytics Issues & Add Custom Date Range

### Issues Identified

1. **Heatmap broken**: Currently renders heatmap cells in a flat 7-column grid without filling empty days or aligning to weekday columns. Only days with data appear -- no calendar structure.
2. **No Discharge TAT chart**: Clinical tab lacks any discharge turnaround time visualization. Data exists in `admissions` table (`admitted_at`, `discharged_at`).
3. **Last Month inaccurate**: The `getRange("last_month")` logic looks correct (`subMonths` + `startOfMonth`/`endOfMonth`), but clinical queries append `T23:59:59` to `range.to` for timestamp columns while revenue queries use date-only comparison -- this is fine. The real issue is that `useDashboardData` (dashboard page) calculates last month revenue differently than analytics. Will audit and align.
4. **No custom date picker**: Only preset ranges exist. Need a "Custom" option with from/to date inputs.

### Changes

#### File 1: `src/pages/analytics/AnalyticsPage.tsx`
- Add a "Custom" button to the quick-range row
- When "Custom" selected, show two `<input type="date">` fields (from/to) inline in the header
- Store custom from/to in state, compute `range` from either quickRange or custom dates
- Add `quickRange` state type to include `"custom"`

#### File 2: `src/components/analytics/RevenueTab.tsx` — Fix Heatmap
- Replace the flat grid with a proper calendar-style heatmap:
  - Generate all dates in the range (from → to)
  - Pad the first week with empty cells to align to correct weekday column
  - Each cell shows the day number + color intensity based on collection amount
  - Tooltip shows date + amount on hover
  - Proper month/week labels

#### File 3: `src/components/analytics/ClinicalTab.tsx` — Add Discharge TAT
- Add a new "Discharge TAT" chart section
- Query `admissions` where `status='discharged'` in range
- Calculate TAT = `discharged_at - admitted_at` in hours
- Show as a horizontal bar chart grouped by ward or as a distribution histogram
- Add average TAT KPI card

#### File 4: `src/hooks/useAnalyticsData.ts` — Add Discharge TAT hook + fix last month
- Add `useDischargeTAT(range)` hook: fetches discharged admissions, calculates hours between admit and discharge, returns per-day or per-ward averages
- Audit `useClinicalKPIs` to include avg discharge TAT and readmission rate
- Ensure all date comparisons are consistent (date columns use date format, timestamp columns use datetime format)

### Technical Details

**Heatmap fix**: Generate date array using a loop from `range.from` to `range.to`. Use `getDay()` to determine weekday offset. Render leading empty cells for alignment. Color intensity = `amount / maxAmount`.

**Discharge TAT**: 
```
SELECT admitted_at, discharged_at, ward_id 
FROM admissions 
WHERE status='discharged' AND hospital_id=X 
  AND discharged_at BETWEEN range.from AND range.to
```
TAT hours = `(discharged_at - admitted_at) / 3600000`

**Custom date range**: Simple two-input approach with `<input type="date" />` styled to match existing UI. The `range` memo switches between `getRange(quickRange)` and `{from: customFrom, to: customTo}`.

