

# Fix: White screen on published `/login` (and likely other routes)

## What's happening

- Preview URL (`*.lovableproject.com/login`) renders fine — console proves `LoginPage` mounted there.
- Published URL (`preview--aumrtihmsv1.lovable.app/login`) is fully blank, no error UI.
- ErrorBoundary did not catch — meaning rendering never started in the production build.

## Root cause

Phase 6 added an aggressive `manualChunks` config in `vite.config.ts` that splits `node_modules` into 9+ vendor chunks (`vendor-react`, `vendor-router`, `vendor-radix`, `vendor-query`, `vendor-supabase`, `vendor-charts`, `vendor-date`, `vendor-icons`, `vendor-forms`, `vendor-misc`).

In production this breaks because:
1. Libraries like `react-router-dom`, `@radix-ui/*`, `@tanstack/react-query`, `@hookform/resolvers` import React at module-init time.
2. When Rollup splits them into separate chunks, the **chunk load order is non-deterministic**. If `vendor-radix` or `vendor-router` evaluates before `vendor-react`, React is `undefined` → silent ESM init failure → blank screen, no caught error.
3. This only affects the production bundle. Vite's dev server ignores `manualChunks` entirely, which is why preview works.

This pattern is a well-known footgun with `manualChunks` + React ecosystem libs.

## Fix

Simplify `vite.config.ts` to one of two safe states:

**Option A (recommended)** — remove `manualChunks` entirely. Rollup's default code-splitting already keeps shared deps in shared chunks and is correct by construction. We keep `chunkSizeWarningLimit: 1000` so big route chunks don't warn.

**Option B** — keep ONE combined `vendor` chunk for everything in `node_modules`. Avoids the ordering problem because all libs share one chunk and load together.

Going with **Option A** — it's the proven-safe default and our route-level `lazy()` splits already deliver the bundle-size win Phase 6 was targeting.

### File change

`vite.config.ts` — remove the entire `rollupOptions.output.manualChunks` block; keep `chunkSizeWarningLimit: 1000` and the rest of the config unchanged.

## Why this is the right call

- Restores the published app immediately.
- Route-level `lazy()` (already in `App.tsx` for ~70 routes) is doing the real heavy lifting for code splitting.
- The marginal cache benefit of vendor splitting is not worth a hard production outage.
- Zero risk to dev/preview (which already ignored manualChunks).

## After the fix

- Republish from the Lovable Publish menu so the production bundle picks up the new config.
- /login, /, and every other route should render normally on `preview--aumrtihmsv1.lovable.app`.

## Out of scope (handled separately if you want)

- The `Function components cannot be given refs` warnings on `LandingPage` and `LoginPage` are non-fatal and unrelated to the white screen. Can be cleaned up later by wrapping the offending custom components with `React.forwardRef`.

