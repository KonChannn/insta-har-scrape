/**
 * Renders every report section on the server to catch render-time crashes
 * (missing data, null access, bad branching) without a browser.
 *
 * Run with: npx tsx scripts/render-smoke.tsx
 */
import assert from 'node:assert/strict';
import { renderToString } from 'react-dom/server';
import { ReportContext } from '../src/components/ReportContext';
import { Dashboard } from '../src/components/report/Dashboard';
import { buildAnalysis } from './fixture';
import { buildRichAnalysis } from './rich-fixture';
import type { Analysis } from '../src/lib/core/types';
import type { HarMode } from '../src/components/ReportContext';
import { dict, makeFormatters, type Locale } from '../src/lib/i18n';

function render(A: Analysis, locale: Locale, mode: HarMode = 'owned'): string {
  const t = dict[locale];
  const f = makeFormatters(locale);
  return renderToString(
    <ReportContext.Provider
      value={{
        A,
        t,
        locale,
        f,
        themeKey: 'light',
        mode,
        snaps: A.snapshots,
        onSnapshots: () => undefined,
        toast: () => undefined,
      }}
    >
      <Dashboard />
    </ReportContext.Provider>,
  );
}

/* ---------------- sparse dataset (fallbacks) ---------------- */
const sparse = buildAnalysis('id');
const idSparse = render(sparse.A, 'id');
assert.ok(idSparse.includes('Ringkasan akun'));
assert.ok(idSparse.includes('Kesimpulan &amp; rekomendasi'));
assert.ok(idSparse.includes('Audience behavior'));
assert.ok(idSparse.length > 20000, 'report HTML looks complete');
assert.ok(!/undefined|NaN/.test(idSparse), 'no broken interpolation in the sparse report');

const enSparse = render(buildAnalysis('en').A, 'en');
assert.ok(enSparse.includes('Account summary'));
assert.ok(enSparse.includes('Conclusions &amp; recommendations'));
assert.ok(!/undefined|NaN/.test(enSparse), 'no broken interpolation in the EN report');

/* ---------------- rich dataset (populated branches) ---------------- */
const rich = buildRichAnalysis('id');
assert.equal(rich.A.posts.length, 12, '12 rich posts');
assert.ok(rich.A.works, 'what-works populated');
assert.ok(rich.A.works!.rows.length >= 10, 'all what-works factors present');
assert.ok(rich.A.conclusions.recs.length > 0, 'recommendations generated');
assert.ok(rich.A.growth, 'growth computed');
assert.ok(rich.A.aud.ins.activeGrid, 'active-hours grid parsed');
assert.ok(rich.A.aud.pub.n >= 20, 'rich comments parsed');
assert.equal(rich.A.top10.length, 10, 'top 10 present');
assert.equal(rich.A.bottom10.length, 10, 'bottom 10 present');

// Per-post insights resolved through the request's media_id.
const post100 = rich.A.posts.find((p) => p.code === 'P100');
assert.ok(post100, 'P100 exists');
assert.equal(post100.reach, 3000, 'per-post reach attached');
assert.equal(post100.impressions, 4800, 'per-post views attached');
assert.equal(post100.avgWatch, 4.2, 'per-post avg watch attached');
assert.equal(post100.totalWatch, 4200, 'per-post total watch attached');
assert.equal(post100.skipRate, 0.31, 'per-post skip rate attached');
assert.equal(post100.saves, 18, 'per-post saves attached');
assert.equal(post100.shares, 4, 'per-post shares attached');

const idRich = render(rich.A, 'id');
assert.ok(idRich.includes('Komposisi tipe konten'), 'what-works table rendered');
assert.ok(idRich.includes('Pertumbuhan followers'), 'growth KPI rendered');
assert.ok(idRich.includes('Ranking hari'), 'timing table rendered');
assert.ok(idRich.includes('Insight per post'), 'per-post insights rendered');
assert.ok(idRich.includes('Perbandingan video'), 'video comparison rendered');
assert.ok(idRich.includes('Top 10 post'), 'top 10 rendered');
assert.ok(idRich.length > idSparse.length, 'rich report is bigger');
assert.ok(!/undefined|NaN/.test(idRich), 'no broken interpolation in the rich report');

const enRich = render(buildRichAnalysis('en').A, 'en');
assert.ok(enRich.includes('Content type mix'));
assert.ok(enRich.includes('Follower growth'));
assert.ok(enRich.includes('Per-post insights'));
assert.ok(enRich.includes('Video comparison'));
assert.ok(!/undefined|NaN/.test(enRich), 'no broken interpolation in the EN rich report');

// OSINT mode hides private-Insights sections but keeps public comparison.
const osint = render(rich.A, 'id', 'osint');
assert.ok(!osint.includes('Insight per post'), 'OSINT hides per-post insights');
assert.ok(!osint.includes('Insights (Professional Dashboard)'), 'OSINT hides the overall insights section');
assert.ok(osint.includes('Perbandingan video'), 'OSINT keeps comparison');
assert.ok(osint.includes('🌐 OSINT'), 'OSINT mode badge rendered');

console.log(
  `✓ render smoke test passed (sparse ${idSparse.length}, rich ${idRich.length}, en-rich ${enRich.length}, osint ${osint.length} chars)`,
);
