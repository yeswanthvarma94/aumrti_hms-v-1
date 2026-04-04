

## Implement AuthGuard — Security Fix

### Status
This fix was planned but **never executed**. No code changes were made. All 75+ internal routes remain accessible without authentication.

### What will be done

**File 1: Create `src/components/auth/AuthGuard.tsx`**
- Checks Supabase session via `getSession()` + `onAuthStateChange`
- Three states: `loading` → spinner, `authenticated` → render children, `unauthenticated` → redirect to `/login`
- Redirect preserves return path via `state.from`

**File 2: Modify `src/App.tsx`**
- Import `AuthGuard`
- Wrap `<AppShell />` route: `<AuthGuard><AppShell /></AuthGuard>`
- Wrap `/setup/onboarding` and `/hod-dashboard` with `<AuthGuard>`
- Leave public routes unwrapped: `/`, `/pay/:token`, `/portal/*`, `/login`, `/register`, `/design-system`, `/tv-display`

### No other files changed
All existing page and component logic remains untouched.

