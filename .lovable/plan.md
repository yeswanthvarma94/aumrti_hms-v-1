
## Fix OPD crash caused by unsupported route-blocking hook

### Root cause
The OPD page is crashing inside `src/components/opd/ConsultationWorkspace.tsx`, not in the token query anymore.

The issue is this line of work:
- `ConsultationWorkspace` imports and uses `useBlocker` from `react-router-dom`
- The app is mounted with `BrowserRouter` in `src/App.tsx`
- `useBlocker` only works with a React Router data router, not with `BrowserRouter`

That means the component throws as soon as OPD renders, which matches the full-page ErrorBoundary screen in your screenshot.

### Files reviewed
- `src/pages/opd/OPDPage.tsx`
- `src/components/opd/ConsultationWorkspace.tsx`
- `src/components/opd/TokenQueue.tsx`
- `src/components/opd/PatientSummary.tsx`
- `src/App.tsx`
- `src/components/ErrorBoundary.tsx`

### Implementation plan

1. Remove the in-app navigation blocker that uses `useBlocker`
- Delete the `useBlocker` import from `ConsultationWorkspace.tsx`
- Remove the `const blocker = useBlocker(...)` logic
- Remove the effect that reacts to `blocker.state === "blocked"`

2. Keep the browser-close / refresh protection
- Retain the existing `beforeunload` listener based on `isDirtyRef`
- This still protects against accidental tab close, refresh, and browser navigation away

3. Preserve dirty-state tracking and autosave behavior
- Keep `isDirtyRef`
- Keep the existing dirty flag updates in encounter/prescription changes
- Keep resetting dirty state after successful autosave / completion

4. Add a safer fallback for in-app route changes
- If you still want in-app protection without migrating the whole app router, replace `useBlocker` with a lightweight manual pattern compatible with `BrowserRouter`
- Scope it narrowly to this file only, so no router architecture change is required
- If that feels too risky, remove only the crashing hook now and keep `beforeunload` as the safe fix

### Recommended approach
Use the minimal fix first:
- remove `useBlocker`
- keep `beforeunload`
- do not change router architecture in `App.tsx`

This resolves the crash immediately with the least risk to 75+ protected routes and the existing lazy-loaded app shell.

### Why this is the right fix
- The OPD crash is caused by routing API mismatch, not by Supabase data loading
- The OPD data-fetch code now correctly uses `auth_user_id`
- `TokenQueue` and `PatientSummary` do not show a matching fatal issue from the code reviewed
- Changing the whole app from `BrowserRouter` to a data router would be much larger and riskier than needed for this bug

### Technical details
```text
Current:
App.tsx -> BrowserRouter
ConsultationWorkspace.tsx -> useBlocker(...)  ❌ requires data router

Safe fix:
App.tsx -> BrowserRouter
ConsultationWorkspace.tsx -> beforeunload only  ✅ compatible
```

### Expected result after fix
- `/opd` loads again instead of falling into the global ErrorBoundary
- Unsaved consultation warning still appears on browser refresh/close
- Consultation autosave continues to work as before

### Scope
Only modify:
- `src/components/opd/ConsultationWorkspace.tsx`
