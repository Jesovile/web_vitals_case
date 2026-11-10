# Web Vitals case

A hands-on demonstration and training project for **Web Vitals** optimization.

There is one page per Web Vitals metric (LCP, CLS, INP, FCP, TTFB). Each page contains realistic engineering
mistakes that hurt its metric. The task is to find them, explain why they hurt the metric, and fix them.

Every page shows a live overlay with values measured by Google's
[`web-vitals`](https://github.com/GoogleChrome/web-vitals) library (attribution build), so you can see
both the number and *why* it is what it is (LCP element, load delay, the element that shifted,
the slow interaction, and so on). Final values are also sent to the backend as a minimal RUM (Real User Monitoring)
setup and listed at `/vitals.html`.

## Quick start

Requirements: **Node.js ≥ 18** (no `npm install` needed, the project has zero dependencies) and
**Google Chrome** (LCP and INP are reported most completely in Chromium-based browsers).

```bash
npm start                  # http://localhost:3000 – the task (serves public/)
npm run start:solution     # the reference solution (serves solution/, if present)
```

| Env variable      | Default | Description                                                                                  |
|-------------------|---------|----------------------------------------------------------------------------------------------|
| `PORT`            | `3000`  | HTTP port                                                                                    |
| `THROTTLE_KBPS`   | `1024`  | Simulated bandwidth for static files (KB/s). localhost is too fast to feel heavy assets. `0` disables it |
| `LOG_REQUESTS`    | unset   | Set to `1` to log every request with its duration                                            |
| `STATIC_DIR`      | `public`| Directory with static files (`public` or `solution`)                                         |

How to work with the case:

1. Open a case page from the catalogue and watch the overlay (top-right).
2. Open DevTools: use **Network** to see the request waterfall, and **Performance** (live metrics, or record a trace)
   to see long tasks, layout shifts and the LCP element. Lighthouse works too.
3. Find what hurts the metric in the page source (and in `server/` for TTFB), fix it, and reload to compare.
   The content, data and server timings must stay the same; only the implementation changes.
4. Optional: enable CPU throttling (4×/6×) in DevTools → Performance to simulate a mid-range phone.

> Caching is disabled on purpose (`Cache-Control: no-store`), so every reload reproduces a first visit.

## Project structure

```
server/
  index.js        HTTP server: static files with bandwidth throttling, /slow/<ms>/ prefix for slow
                  origins, demo APIs, RUM beacon endpoint
  ttfb.js         TTFB case: server-side rendering of /ttfb/broken
  db.js           fake data layer with realistic latency
public/           the task – served by `npm start`
  index.html      case catalogue
  vitals.html     collected RUM data
  shared/         styles.css, vitals.js (web-vitals overlay + beacon)
  images/         hero image (original + resized JPEG/WebP variants), product photos
  lcp/            broken.html
  cls/            broken.html
  inp/            broken.html, catalog.js (demo data)
  fcp/            broken.html, theme.css, legacy-widget.js
solution/         reference solution – git-ignored, kept locally; served by `npm run start:solution`
  METRICS.md      metrics description, common mistakes, how to fix them, expected results
  <case>/         broken.html (annotated), fixed.html, case.md (description, mistakes, fixes)
  ttfb/case.md    TTFB case description
  server/         TTFB solution: ttfb.js (annotated broken + fixed renderers), cache.js
                  (used by server/index.js instead of server/ttfb.js when STATIC_DIR=solution)
scripts/
  generate-images.js    regenerates public/images (uses sips/ImageMagick + cwebp for variants)
```

## Measuring in production

Lab tools (Lighthouse, DevTools) are good for debugging. Rankings and real user experience are based on **field
data**, though:

- collect RUM with `web-vitals` and send it with `navigator.sendBeacon` on `visibilitychange` (see
  [`public/shared/vitals.js`](public/shared/vitals.js) and the `POST /api/vitals` handler in
  [`server/index.js`](server/index.js));
- check the Chrome UX Report (CrUX), PageSpeed Insights and Search Console's Core Web Vitals report;
- look at the 75th percentile, and split it by device type and page template.

## Useful links

- [web.dev/vitals](https://web.dev/articles/vitals): metric definitions and thresholds
- [Optimize LCP](https://web.dev/articles/optimize-lcp), [Optimize CLS](https://web.dev/articles/optimize-cls),
  [Optimize INP](https://web.dev/articles/optimize-inp), [Optimize TTFB](https://web.dev/articles/optimize-ttfb)
- [web-vitals library](https://github.com/GoogleChrome/web-vitals)
