# Performance Measurements — One-Pass Capture Guide

This doc gives a single, reproducible run to capture **bundle size**, **slow network requests**, and **Time-to-Interactive (TTI)** for the five hot pages:

- `/dashboard`
- `/opd`
- `/ipd`
- `/billing`
- `/patients`

Run everything from the repo root. Output lands in `docs/perf-out/` so it's diffable across runs.

---

## 0. One-time setup

```bash
# Dev-only analyzer (does not ship to prod bundle)
npm install --save-dev rollup-plugin-visualizer

# Headless Chrome driver for TTI + network capture
npm install --save-dev lighthouse chrome-launcher

# Output dir
mkdir -p docs/perf-out
```

Temporarily add the visualizer plugin to `vite.config.ts`:

```ts
import { visualizer } from "rollup-plugin-visualizer";
// ...
plugins: [
  react(),
  mode === "development" && componentTagger(),
  visualizer({
    filename: "docs/perf-out/bundle-treemap.html",
    gzipSize: true,
    brotliSize: true,
    template: "treemap",
  }),
].filter(Boolean),
```

Revert this change after the run (or keep it gated behind an env flag).

---

## 1. Bundle size (one command)

```bash
npm run build 2>&1 | tee docs/perf-out/build-output.txt
```

Then extract the gzipped sizes into a clean table:

```bash
node -e "
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const dir = 'dist/assets';
const rows = fs.readdirSync(dir)
  .filter(f => /\.(js|css)$/.test(f))
  .map(f => {
    const buf = fs.readFileSync(path.join(dir, f));
    return { file: f, raw: buf.length, gzip: zlib.gzipSync(buf).length };
  })
  .sort((a, b) => b.gzip - a.gzip);
const fmt = n => (n/1024).toFixed(1) + ' KB';
const out = ['file\traw\tgzip', ...rows.map(r => \`\${r.file}\t\${fmt(r.raw)}\t\${fmt(r.gzip)}\`)].join('\n');
fs.writeFileSync('docs/perf-out/bundle-sizes.tsv', out);
console.log(out);
" | tee docs/perf-out/bundle-sizes.txt
```

Open the treemap to see what's eating space:

```bash
open docs/perf-out/bundle-treemap.html   # macOS
xdg-open docs/perf-out/bundle-treemap.html  # Linux
```

**Targets**

| Artifact                      | Goal              |
| ----------------------------- | ----------------- |
| Main entry (gzipped)          | < 400 KB          |
| Largest lazy chunk (gzipped)  | < 200 KB          |
| Total JS shipped on first nav | < 1.0 MB gzipped  |

---

## 2. Slow requests + TTI for all 5 pages (one command)

Create `scripts/perf-capture.mjs`:

```js
import lighthouse from "lighthouse";
import * as chromeLauncher from "chrome-launcher";
import fs from "node:fs";
import path from "node:path";

const BASE = process.env.PERF_BASE_URL || "https://id-preview--410cb1a7-d0b0-4ddf-9d8e-0fb62717761d.lovable.app";
const PAGES = ["/dashboard", "/opd", "/ipd", "/billing", "/patients"];
const OUT = "docs/perf-out";
fs.mkdirSync(OUT, { recursive: true });

const chrome = await chromeLauncher.launch({ chromeFlags: ["--headless=new", "--no-sandbox"] });
const summary = [];

for (const route of PAGES) {
  const url = BASE + route;
  console.log("→", url);
  const result = await lighthouse(url, {
    port: chrome.port,
    output: "json",
    logLevel: "error",
    onlyCategories: ["performance"],
    formFactor: "desktop",
    screenEmulation: { mobile: false, width: 1366, height: 768, deviceScaleFactor: 1, disabled: false },
    throttlingMethod: "simulate",
  });

  const lhr = result.lhr;
  const slug = route.replace(/\W+/g, "_") || "root";
  fs.writeFileSync(path.join(OUT, `lh-${slug}.json`), JSON.stringify(lhr, null, 2));

  // Slowest 10 network requests
  const reqs = (lhr.audits["network-requests"]?.details?.items || [])
    .map(r => ({ url: r.url, ms: Math.round((r.endTime || 0) - (r.startTime || 0)), bytes: r.transferSize || 0 }))
    .sort((a, b) => b.ms - a.ms)
    .slice(0, 10);
  fs.writeFileSync(path.join(OUT, `slow-requests-${slug}.json`), JSON.stringify(reqs, null, 2));

  summary.push({
    route,
    TTI_ms: Math.round(lhr.audits.interactive?.numericValue ?? 0),
    FCP_ms: Math.round(lhr.audits["first-contentful-paint"]?.numericValue ?? 0),
    LCP_ms: Math.round(lhr.audits["largest-contentful-paint"]?.numericValue ?? 0),
    TBT_ms: Math.round(lhr.audits["total-blocking-time"]?.numericValue ?? 0),
    transferKB: Math.round((lhr.audits["total-byte-weight"]?.numericValue ?? 0) / 1024),
    requests: lhr.audits["network-requests"]?.details?.items?.length ?? 0,
    perfScore: Math.round((lhr.categories.performance?.score ?? 0) * 100),
  });
}

await chrome.kill();

const header = "route | TTI(ms) | FCP(ms) | LCP(ms) | TBT(ms) | transfer(KB) | reqs | perf";
const sep = header.replace(/[^|]/g, "-");
const rows = summary.map(s => `${s.route} | ${s.TTI_ms} | ${s.FCP_ms} | ${s.LCP_ms} | ${s.TBT_ms} | ${s.transferKB} | ${s.requests} | ${s.perfScore}`);
const md = [header, sep, ...rows].join("\n");
fs.writeFileSync(path.join(OUT, "summary.md"), md + "\n");
console.log("\n" + md);
```

Run it:

```bash
# Authenticated pages: log into the preview in a real browser first,
# then either (a) point at a public deploy, or (b) export your session cookie
# and pass it via PERF_COOKIE (see "Auth note" below).

node scripts/perf-capture.mjs
```

You now have, in `docs/perf-out/`:

- `summary.md` — TTI/FCP/LCP/TBT/transfer/req-count per page (paste this into PRs)
- `slow-requests-<page>.json` — top 10 slowest requests per page
- `lh-<page>.json` — full Lighthouse report per page (open in [Lighthouse Viewer](https://googlechrome.github.io/lighthouse/viewer/))

---

## 3. Auth note (the 5 routes are behind login)

`/dashboard`, `/opd`, `/ipd`, `/billing`, `/patients` all require a session. Two options:

**Option A — measure against the published URL after logging in via DevTools profile** (simplest): launch Chrome with a persistent profile that's already logged in:

```bash
CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  node scripts/perf-capture.mjs
```

Then in `perf-capture.mjs` add `userDataDir: "/tmp/aumrti-perf-profile"` to the `chromeLauncher.launch` options and log in once manually.

**Option B — inject the Supabase session token**. After logging into the preview, copy `localStorage["aumrti-hms-auth"]` from DevTools and prepend a setup step in the script:

```js
// before lighthouse() call:
const page = (await chrome.targets()).find(t => t.type === "page");
// navigate to origin, set localStorage, then run lighthouse
```

Pick whichever your CI tolerates. Option A is fine for local measurement.

---

## 4. Compare runs (before vs after)

Snapshot before each optimization phase:

```bash
cp -r docs/perf-out docs/perf-out-$(date +%Y%m%d-%H%M)
```

Diff `summary.md` between snapshots to prove a phase actually moved the needle.

---

## 5. Hard targets (sprint exit criteria)

| Metric                                          | Target            |
| ----------------------------------------------- | ----------------- |
| `/dashboard` TTI (warm cache)                   | < 1500 ms         |
| `/dashboard` TTI (cold cache)                   | < 3000 ms         |
| Any list page first 25 rows                     | < 1000 ms         |
| Main bundle gzipped                             | < 400 KB          |
| Slowest individual request on any of the 5 pages| < 500 ms p95      |
| Lighthouse Performance score (each page)        | ≥ 85              |

If `summary.md` shows any row failing these, the page name + the specific failing column is your next ticket.
