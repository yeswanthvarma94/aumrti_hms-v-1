

## HMS App Shell — Sidebar, Header & Content Layout

### Overview
Build the main application shell with a custom grouped sidebar (not shadcn sidebar — it doesn't support hover mega-menu panels), a fixed 56px header, and a no-scroll content wrapper. Includes mobile bottom tab bar.

### Architecture

```text
┌──────────────────────────────────────────────┐
│ Header (56px fixed top, full width)          │
│ [☰] [Breadcrumb]  [🔍 Search]  [🔔] [User] │
├────────┬─────────────────────────────────────┤
│Sidebar │ Content Area                        │
│ 240px  │ calc(100vh-56px) × calc(100vw-240px)│
│ fixed  │ overflow:hidden                     │
│        │                                     │
│ Icons  │ (placeholder dashboard grid)        │
│ +label │                                     │
│        │                                     │
│ Avatar │                                     │
│+logout │                                     │
└────────┴─────────────────────────────────────┘
Mobile (<768px): sidebar hidden, bottom tab bar (5 icons)
```

### Files to Create/Modify

**1. `src/components/layout/AppShell.tsx`** — Root layout wrapper
- Renders Sidebar + Header + content area
- Content area: `h-[calc(100vh-56px)] w-[calc(100vw-240px)] overflow-hidden` (adjusts when sidebar collapsed)
- Sidebar collapse state via React state
- CSS fade transition (150ms) on route change via `<Outlet />` key

**2. `src/components/layout/AppSidebar.tsx`** — Custom 240px sidebar
- Fixed left, full height, navy background (`bg-sidebar`)
- Top: hospital logo area (56px)
- 6 nav groups, each 48px: icon (20px) + label
  1. Dashboard (Home icon) — direct link
  2. Clinical (Stethoscope) — hover shows mega-menu: OPD, IPD, Emergency, OT, Nursing
  3. Diagnostics (FlaskConical) — hover: Lab, Radiology
  4. Pharmacy (Pill) — direct link
  5. Finance (IndianRupee) — hover: Billing, Insurance, Payments
  6. More (MoreHorizontal) — hover: HR, Inventory, Quality, Settings
- Hover mega-menu: absolute panel to the right of sidebar, white card with sub-items
- Active state: `bg-sidebar-accent text-white`
- Bottom: user avatar + logout button (always visible, pinned)
- Collapsible: when collapsed, width → 64px, labels hidden, only icons shown

**3. `src/components/layout/AppHeader.tsx`** — 56px fixed header
- Left: hamburger toggle (collapses sidebar) + breadcrumb (max 2 levels)
- Center: search bar with Cmd+K shortcut (placeholder, no backend yet)
- Right: offline indicator pill, notification bell with badge, user dropdown menu

**4. `src/components/layout/MobileTabBar.tsx`** — Bottom tab bar (<768px)
- 5 icons: Dashboard, Clinical, Diagnostics, Pharmacy, More
- 44px min touch targets, iOS safe area padding (`pb-safe`)

**5. `src/pages/Dashboard.tsx`** — Placeholder dashboard
- Grid of 6 stat cards inside the no-scroll content area
- Confirms layout constraints work

**6. Update `src/App.tsx`**
- Wrap authenticated routes in `<AppShell>` layout using nested `<Route>` with `<Outlet>`
- `/` → Dashboard, `/design-system` stays standalone
- Add placeholder routes for future modules (OPD, IPD, etc.) pointing to "Coming Soon" pages

**7. Update `src/index.css`**
- Add `env(safe-area-inset-bottom)` utility for iOS
- Add `.fade-enter` / `.fade-exit` transition classes (150ms)

### Technical Details
- Sidebar hover mega-menu uses `onMouseEnter`/`onMouseLeave` with absolute positioning — no external library needed
- Cmd+K search uses a `useEffect` keydown listener that opens a `Dialog` (shadcn)
- Breadcrumb derived from current `location.pathname`
- Mobile detection via existing `useIsMobile()` hook
- Sidebar collapse state stored in React context (shared between header toggle and sidebar)

