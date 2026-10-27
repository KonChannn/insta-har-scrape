# Instagram HAR Analyzer

A local-first Instagram analytics tool. Drop in a `.har` capture and get a full
report: engagement benchmarks, best posting times, audience behavior, content
pillars, and rule-based recommendations.

**No backend, no uploads.** The HAR is parsed and analysed entirely in the
browser. The raw file is discarded after ingestion; only derived numbers are
kept (in IndexedDB, as account snapshots).

## Features

- **Upload modes** — choose **Own account** (Professional Dashboard / Insights)
  or **OSINT** (public account / competitor) before uploading. OSINT hides
  private-Insights sections and compares public metrics only.
- **Engagement analysis** — ER by followers and by reach, median vs mean,
  tier benchmarks (nano → macro), per-format comparison, top/bottom posts.
- **Per-post insights** (own account) — every post with its Insights reach,
  views, view rate, average watch time, % watched, bounce, skip rate, total
  watch time, saves and shares.
- **Top 10 / bottom 10 posts** ranked by ER (or interactions when followers are
  unavailable).
- **Video comparison** — select 2–4 posts and compare views, reach, view rate,
  watch time, bounce, skip rate, engagement and ER, with a bar chart.
- **Posting time** — 7×24 performance heatmap, day and 3-hour block rankings
  with minimum-sample guards.
- **Audience behavior** — two clearly labelled evidence tiers:
  - _Insights_ data (demographics, follower split, traffic sources, watch
    time/retention, active hours) when the HAR came from an account you manage.
  - _Public estimates_ (comment-derived active hours, response speed, comment
    types, sentiment, language, repeat commenters, interest signals) for any
    account, including competitors.
- **What works** — compares the top 25% of posts against the bottom 25% on
  caption length, CTA usage, hashtags, hooks, reel duration, collabs.
- **Overall Insights** — the full set of account metrics found in the HAR, plus
  the total/availability table and audience breakdowns.
- **Recommendations** — every insight and recommendation carries the numbers
  that produced it ("why").
- **Growth** — snapshots persist in IndexedDB, so uploading the same account
  later produces follower/ER/views deltas and charts. Export/import as JSON.
- **Bilingual UI** — Indonesian and English, including generated report prose.
- **Exports** — posts CSV, comments CSV, commenters CSV, Markdown report,
  report JSON, print/PDF.
- **Multi-account / multi-file** — merge several HARs, pick the account.

## Stack

- Next.js 16 (App Router, static route)
- React 19 + TypeScript
- Chart.js 4 (bundled, no CDN)
- Plain CSS (ported from the original single-file app)
- No server runtime, no database, no environment variables

## Getting started

```bash
npm install
npm run dev        # http://localhost:3000
```

Production build:

```bash
npm run build
npm run start
```

### Try it without a HAR

Click **“Try demo data”** on the upload screen. It loads `public/demo.har`, a
synthetic 12-post capture (fake account, no real data). Regenerate it with:

```bash
npm run fixture:har
```

## Deploy to Vercel

The app is a static Next.js page and needs **zero configuration**.

### Option A — Git import (recommended)

1. Push this folder to GitHub/GitLab/Bitbucket.
2. Go to [vercel.com/new](https://vercel.com/new) and import the repository.
3. Framework preset: **Next.js** (auto-detected). Leave build settings default.
4. Deploy. No environment variables are required.

### Option B — Vercel CLI

```bash
npm i -g vercel
vercel          # preview deployment
vercel --prod   # production
```

### Notes for Vercel

- Everything is client-side, so the free Hobby plan is plenty.
- No API routes, no secrets, no cron jobs.
- The page is statically prerendered (`○ /` in the build output).
- Charts are bundled locally, so the report works even if a CDN is blocked.

## How it works

```
HAR file
  → filter GraphQL + whitelisted REST entries
  → decode (plain / base64 / multipart / streaming JSON)
  → schema-agnostic recursive walk
      detects posts, profiles, comments, insights, breakdowns
  → normalise into Maps (posts by shortcode, profiles, comments, metrics)
  → analyse
      per-post features → aggregates → benchmark → heatmap → what-works
  → conclusions (rule engine, returns message ids + evidence)
  → React report
```

Key design choices:

- **Schema-agnostic extraction.** Instagram changes its GraphQL shapes often,
  so the walker pattern-matches field signatures instead of hard-coding query
  names. The Debug panel shows exactly which queries matched.
- **Only response bodies are read.** Headers, cookies and tokens are never
  touched.
- **Median over mean** for performance rankings, so a single viral post does
  not skew "best day/hour".
- **Evidence tags.** Every audience claim is labelled _Insights_ or
  _public estimate_ — the report never invents numbers.
- **Structured messages.** The rule engine returns `{ id, params }`; the i18n
  layer renders them. That keeps both languages in sync and avoids injecting
  raw data as HTML.

## Project structure

```
app/                     Next.js shell, global CSS, icon
src/components/          Upload, header, report sections
src/components/report/   Section components + chart/heatmap primitives
src/lib/core/            Framework-free analysis engine (no React)
src/lib/i18n/            UI strings + generated-message templates (id/en)
src/lib/snapshots.ts     IndexedDB persistence (localStorage fallback)
src/lib/summary.ts       Markdown/JSON/CSV builders
scripts/                 Synthetic HAR fixtures + smoke tests
legacy/index.html        Original single-file version (reference only)
```

The engine in `src/lib/core` has no DOM or React dependency, so it can be
tested in Node and reused in a worker or CLI later.

## Tests

```bash
npm run typecheck   # tsc --noEmit
npm run smoke       # engine assertions + full report server-render, both locales
npm run build       # production build
```

`scripts/fixture.ts` builds a sparse HAR (fallback paths) and
`scripts/rich-fixture.ts` builds a 12-post HAR with comments, insights
breakdowns, an hourly grid and two snapshots (populated paths). Both are
rendered in Indonesian and English by `scripts/render-smoke.tsx`.

## What changed from the original single-file app

- **TypeScript, modular engine.** The analysis code is framework-free and lives
  in `src/lib/core`, so it can move to a worker or CLI without a rewrite.
- **No CDN.** Chart.js is bundled; the report renders even when a CDN is
  blocked, and the app is a fully static Next.js route.
- **IndexedDB snapshots** (with one-time localStorage migration) instead of a
  5 MB localStorage limit, plus snapshot export/import.
- **Indonesian + English**, including all generated insights and
  recommendations via structured `{ id, params }` messages.
- **Safe rich text.** Generated prose is parsed into React nodes; only
  `<b>`/`<i>` are honoured, so data from a HAR cannot inject markup.
- **More exports.** Markdown report, report JSON, posts/comments/commenters
  CSV.
- **New report sections.** Upload mode selector (own account vs OSINT),
  per-post insights (reach, views, watch time, bounce/skip), top/bottom 10,
  and a selected-video comparison.
- **Mobile header** with a compact actions menu; no horizontal overflow.
- **Tests + demo fixture.** Engine assertions, full server-render tests in both
  locales, and a one-click demo HAR.

## Privacy

- The HAR file is parsed with `JSON.parse(file.text())` and never persisted.
- Only numeric snapshots (followers, ER, likes, views, up to 300 post
  summaries) are stored in IndexedDB, keyed by account.
- “New file” clears the in-memory store; browser storage can be cleared from
  the Growth section (delete snapshots) or site settings.
- Still: a HAR contains session cookies. Never share the `.har` itself.

## Known limitations / roadmap

### Correctness

1. **Per-post insights depend on the HAR shape.** The engine maps metrics from
   the request's `media_id` and common result-set keys, but Instagram has
   several Insights payload shapes. If a metric is missing, the Debug panel
   shows the queries that were parsed. Add real captured responses as fixtures
   when you find a new shape.
2. **Timezone is fixed to Asia/Jakarta (WIB).** Insights' "most active times"
   arrive in Pacific time and are converted, but post timestamps are always
   displayed in WIB. Add an audience timezone selector and thread it through
   `jkt()` / heatmaps.
3. **Timing recommendations have no confidence interval.** They already show
   sample size, but a bootstrap or Wilson interval would make “best hour”
   claims defensible. Flag cells whose interval overlaps the median.
4. **Sentiment/language are lexicon heuristics.** Fine for triage, not for
   reporting. Consider an optional on-device model or a server route that only
   receives aggregate counts.
5. **Pillar detection is keyword-based and multi-label.** Posts can land in
   several topics; add per-account keyword tuning.

### Performance

6. **Large HARs block the main thread.** `JSON.parse` + recursive walk on a
   200 MB file will freeze the UI. Move ingestion into a Web Worker and stream
   files (or parse incrementally) with progress reporting.
7. **Comments table renders up to 1,500 rows.** Virtualize or paginate for
   accounts with tens of thousands of comments.

### Product

8. **Account vs account comparison.** A side-by-side mode for a client and 2–3
   competitors would make the tool much more useful for agencies. The store
   already supports multiple accounts.
9. **Date-range and content filters.** Recompute the report for the last 30/90
   days, reels only, collabs excluded, etc., without re-uploading.
10. **Shareable reports.** Export a compact JSON/URL snapshot that a colleague
   can open read-only, or render a branded PDF on the server.
11. **Manual historical snapshots.** Let users type in past follower/ER numbers
    so Growth works from day one.
12. **More charts.** ER distribution histogram, sentiment over time, pillar ×
    format matrix, posting-gap vs performance.
13. **PWA/offline install.** The app is already static; add a manifest and a
    service worker so it can run fully offline.
14. **Fixture corpus.** Keep anonymised real HARs as regression fixtures, since
    Instagram's payload shapes change frequently.
