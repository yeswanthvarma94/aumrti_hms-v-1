# Production Build Optimization Plan

## Problem
The current `vite.config.ts` has only a minimal `build` section (just `chunkSizeWarningLimit`). Without `manualChunks`, Vite/Rollup bundles vendor libraries inefficiently, which can slow first-load parse and download in production.

## Changes

### 1. `vite.config.ts` — replace entire file
Add a full `build` configuration with:
- **`rollupOptions.output.manualChunks`** splitting vendors into stable, cache-friendly chunks:
  - `vendor-react` — react, react-dom, react-router-dom
  - `vendor-supabase` — @supabase/supabase-js
  - `vendor-ui` — Radix primitives + cva/clsx/tailwind-merge
  - `vendor-charts` — recharts (only loaded on analytics pages)
  - `vendor-forms` — react-hook-form, @hookform/resolvers, zod
  - `vendor-dates` — date-fns
  - `vendor-query` — @tanstack/react-query
  - `vendor-icons` — lucide-react
- `chunkSizeWarningLimit: 1000`
- `sourcemap: mode === "development"`
- `minify: "esbuild"`
- `target: "es2020"`

All other top-level options (`server`, `plugins`, `resolve`) are preserved as-is.

### 2. `package.json` — no change needed
Already verified: `lovable-tagger` is in `devDependencies` (line 88), not in `dependencies`. No move required.

## Files Touched
- `vite.config.ts` (replaced)

## Files NOT Touched
- `package.json` (already correct)
- All application code

## Risk / Notes
- Manual chunks reference exact package names. Any package not installed will be silently ignored by Rollup, so this is safe.
- `target: es2020` is appropriate for modern Chrome/Edge per AGENTS.md hospital deployment context.
- No runtime behaviour changes — purely a build-time optimization.
