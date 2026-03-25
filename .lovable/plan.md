

## Plan: Fix Quality Module — 3 Issues

### Issue Analysis

1. **NABH chapter bars not clickable**: The chapter progress bars in the left column have no `onClick` handler. There's no state to track a selected chapter, and no detail view in the center column.

2. **Quality Indicators white screen**: The `quality_indicators` table has 15 rows, but RLS policies require `get_user_hospital_id()`. When the query returns 0 rows (auth/hospital mismatch), `grouped` is empty and the component renders an empty `<div>` — a blank white screen. No empty state exists.

3. **Incident filing "Not authenticated"**: The `FileIncidentModal` calls `supabase.auth.getUser()` and shows "Not authenticated" if no user is found. This is a legitimate auth check, but the user may have a stale session. The `incident_reports` table also has RLS requiring `get_user_hospital_id()`.

### Changes

**File: `src/components/quality/NABHDashboard.tsx`**

- Add `selectedChapter` state (string | null)
- Make chapter progress bars clickable — set `selectedChapter` on click
- When a chapter is selected, replace the center column's trend/auto-evidence content with a **chapter detail view** showing all criteria for that chapter (criterion number, text, compliance status, score bar)
- Add a "Back" button to return to the default trend view
- Highlight the selected chapter bar

**File: `src/components/quality/QualityIndicatorsTab.tsx`**

- Add an **empty state** when `indicators.length === 0` after loading completes — show a message like "No quality indicators found. Please check your authentication or contact admin."
- Add error handling to the query (check for `error` from supabase response) and show a toast if the query fails

**File: `src/components/quality/FileIncidentModal.tsx`**

- Before showing the generic "Not authenticated" error, attempt to refresh the session with `supabase.auth.refreshSession()`
- If refresh fails, show a more helpful message: "Your session has expired. Please log in again."
- This handles stale sessions without requiring the user to manually re-login

### Technical Details

- NABH chapter click: filter `criteria` array by `chapter_code === selectedChapter` to show criteria details
- Quality Indicators empty state: simple conditional `if (!loading && indicators.length === 0) return <EmptyState />`
- Incident auth: `await supabase.auth.refreshSession()` before `getUser()` call to recover expired tokens

