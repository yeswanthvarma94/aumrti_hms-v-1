

## Lazy-Load All Page Components

### Problem
90+ page components are eagerly imported in App.tsx, creating a massive initial JS bundle. Users download all module code even if they only visit the dashboard.

### Changes

**File 1: `src/App.tsx`**

Keep these 5 imports static (needed immediately or tiny):
- `AppShell`, `AuthGuard`, `LandingPage`, `LoginPage`, `NotFound`

Convert all other ~85 page imports to `React.lazy()`:
```typescript
import { lazy, Suspense } from "react";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const Register = lazy(() => import("./pages/register"));
const OnboardingWizard = lazy(() => import("./pages/setup/OnboardingWizard"));
const ComingSoon = lazy(() => import("./pages/ComingSoon"));
// ... all other pages
```

Wrap public lazy routes with inline Suspense:
```tsx
<Route path="/register" element={<Suspense fallback={<div />}><Register /></Suspense>} />
<Route path="/design-system" element={<Suspense fallback={<div />}><DesignSystem /></Suspense>} />
// etc for: /pay/:token, /portal/*, /tv-display, /setup/onboarding, /hod-dashboard
```

AppShell routes don't need individual Suspense — handled by File 2.

**File 2: `src/components/layout/AppShell.tsx`**

Import `Suspense` from React. Wrap `<Outlet />` with a Suspense boundary:
```tsx
<Suspense fallback={
  <div className="h-full w-full flex items-center justify-center">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
  </div>
}>
  <Outlet />
</Suspense>
```

### Technical Details
- ~85 page imports become dynamic chunks, loaded on navigation
- Initial bundle drops to only: landing page, login, app shell, auth guard, 404
- Vite automatically code-splits each `lazy()` import into a separate chunk
- No changes to routing logic, auth guards, or component behavior

