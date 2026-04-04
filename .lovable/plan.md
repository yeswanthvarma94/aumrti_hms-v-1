

## Security Fix: Add AuthGuard to Protected Routes

### Problem
All 75+ internal routes (dashboard, billing, patients, settings, etc.) are accessible without authentication — anyone with the URL can view hospital data.

### Plan

**File 1: Create `src/components/auth/AuthGuard.tsx`**
- New component that checks Supabase auth session state
- Three states: loading (spinner), authenticated (render children), unauthenticated (redirect to `/login` with return path)
- Uses `onAuthStateChange` listener for real-time auth updates

**File 2: Modify `src/App.tsx`**
- Import AuthGuard
- Wrap the `<AppShell />` route element: `<AuthGuard><AppShell /></AuthGuard>`
- Wrap `/setup/onboarding`: `<AuthGuard><OnboardingWizard /></AuthGuard>`
- Wrap `/hod-dashboard`: `<AuthGuard><HODDashboardPage /></AuthGuard>`

**Public routes left unwrapped:**
- `/` (landing page)
- `/pay/:token` (payment link)
- `/portal/*` (patient portal — has its own auth)
- `/login`, `/register`
- `/design-system`, `/tv-display`

### Technical Details
- Loading state renders a centered Loader2 spinner
- Redirect passes `state.from = location.pathname` so login can redirect back
- No changes to any existing page or component logic

