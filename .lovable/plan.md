

# Fix: `useBranch must be used within BranchProvider` on every page

## Root cause

Patch 1 changed `useHospitalId()` to read from `BranchContext`. Two guard components call it:

- `src/components/auth/AuthGuard.tsx` line 13 → `useHospitalId()`
- `src/components/auth/RoleGuard.tsx` line 15 → `useHospitalId()`

But `BranchProvider` is mounted **inside** `AppShell` (line 73 of `AppShell.tsx`), and `AuthGuard` **wraps** `AppShell`:

```text
<AuthGuard>             ← uses useHospitalId() — NO PROVIDER YET → CRASH
  <AppShell>
    <BranchProvider>    ← provider lives here
      <RoleGuard>       ← uses useHospitalId() — would also crash
        <Page />
```

So every authenticated route crashes immediately, and the ErrorBoundary shows "Something went wrong / useBranch must be used within BranchProvider".

## Fix (single small change, 2 files)

### 1. `src/App.tsx` — hoist `BranchProvider` to the top of the route tree

Wrap the entire `<Routes>` block in `<BranchProvider>` so it's available to **every** route, including the AuthGuard and RoleGuard above AppShell.

```tsx
<BrowserRouter>
  <BranchProvider>
    <Routes>
      ...all routes...
    </Routes>
  </BranchProvider>
</BrowserRouter>
```

This is safe for public routes (`/`, `/login`, `/portal`, `/pay/:token`) because `BranchProvider`'s internal load is wrapped in try/catch and short-circuits when there's no auth session — it just sets `loading=false` and returns null values. Zero extra work for public pages, no crashes.

### 2. `src/components/layout/AppShell.tsx` — remove the inner `BranchProvider`

Since the provider is now at the top, remove it from `AppShell` to avoid nested providers (which would silently shadow the outer one and reset state on every shell mount):

```tsx
const AppShell: React.FC = () => (
  <VoiceScribeProvider>
    <SidebarProvider>
      <ShellContent />
    </SidebarProvider>
  </VoiceScribeProvider>
);
```

## Why this is the right fix (not band-aids)

- **Don't strip `useHospitalId()` from AuthGuard** — it's the prefetch that makes navigation feel instant for downstream pages.
- **Don't make `useBranch()` return safe defaults outside a provider** — that hides real bugs and the Patch 1 contract is "always inside BranchProvider".
- **Don't duplicate provider into AuthGuard** — would create two parallel branch states.

Hoisting once at the app root is the simplest, cheapest, and matches how the other context (`QueryClientProvider`, `TooltipProvider`) is scoped.

## Verification after applying

1. `/login` loads cleanly (no error boundary).
2. `/dashboard` loads after login (AuthGuard + RoleGuard both have provider in scope).
3. Branch switcher in the sidebar still works (provider state preserved across navigation since it's now above `AppShell`).
4. Console: zero "useBranch must be used within BranchProvider" errors.

## Files touched

- `src/App.tsx` — wrap `<Routes>` in `<BranchProvider>` (and import).
- `src/components/layout/AppShell.tsx` — remove the now-redundant inner `<BranchProvider>` wrapper.

## Risk & rollback

- 2 isolated edits, both reversible from chat **History** if anything regresses.
- Zero database changes, zero auth changes.

