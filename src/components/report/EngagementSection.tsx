'use client';

import { TYPES } from '@/lib/core/constants';
import { erLabel } from '@/lib/core/benchmark';
import type { LevelKey } from '@/lib/core/benchmark';
import type { ChartConfiguration } from 'chart.js';
import { useReport } from '../ReportContext';
import { ChartBox, chartPalette } from './ChartBox';
import { Kpi, LevelBadge, NA, Section } from './primitives';

export function EngagementSection() {
  const { A, t, f, themeKey } = useReport();
  const S = A.summary;
  const tier = S.tier;
  const palette = chartPalette(themeKey);

  const counts: Record<LevelKey, number> = { low: 0, avg: 0, good: 0, great: 0 };
  A.posts.forEach((p) => {
    const l = erLabel(p.er, tier);
    if (l) counts[l.key]++;
  });
  const totalL = Object.values(counts).reduce((a, b) => a + b, 0);

  const latest = A.posts.length ? Math.max(...A.posts.map((p) => p.t)) : 0;
  const asc = A.posts
    .filter((p) => !p.pinned && p.t >= latest - 365 * 86400)
    .sort((a, b) => a.t - b.t);
  const val = (p: (typeof A.posts)[number]) => (A.followers ? p.er ?? 0 : p.eng);
  const ma = asc.map((p, i) => {
    const w = asc.slice(Math.max(0, i - 4), i + 1).map(val);
    return { x: p.t * 1000, y: w.reduce((a, b) => a + b, 0) / w.length };
  });

  const datasets: any[] = TYPES.filter((ty) => A.byType[ty].n).map((ty) => ({
    type: 'scatter',
    label: t.ui.types[ty],
    data: asc.filter((p) => p.type === ty).map((p) => ({ x: p.t * 1000, y: val(p), p })),
    backgroundColor: ty === 'reel' ? palette.s1 : ty === 'carousel' ? palette.s2 : palette.s3,
    borderColor: palette.surface,
    borderWidth: 1.5,
    pointRadius: 4.5,
    pointHoverRadius: 7,
  }));
  datasets.push({
    type: 'line',
    label: t.ui.er.movingAvg,
    data: ma,
    borderColor: palette.neutral,
    borderWidth: 2,
    pointRadius: 0,
    tension: 0,
  });

  const trendConfig: ChartConfiguration = {
    type: 'scatter',
    data: { datasets },
    options: {
      interaction: { mode: 'nearest', intersect: true },
      plugins: {
        tooltip: {
          callbacks: {
            title: (items: any) =>
              items[0]?.raw?.p ? f.dTime(items[0].raw.p.t) : f.dDateMs(items[0]?.raw?.x ?? 0),
            label: (c: any) =>
              c.raw.p
                ? `${t.ui.types[c.raw.p.type as keyof typeof t.ui.types]} · ${A.scoreLabel} ${
                    A.followers ? f.f2(c.raw.y) + '%' : f.f0(c.raw.y)
                  } · ${f.f0(c.raw.p.likes)} likes`
                : `${t.ui.er.movingAvg}: ${A.followers ? f.f1(c.raw.y) + '%' : f.f0(c.raw.y)}`,
          },
        },
      },
      scales: {
        x: {
          type: 'linear',
          min: asc.length ? asc[0].t * 1000 : 0,
          max: asc.length ? asc[asc.length - 1].t * 1000 : 1,
          grid: { display: false },
          ticks: { maxTicksLimit: 6, callback: (v: any) => f.dDateMs(Number(v)) },
        },
        y: {
          beginAtZero: true,
          grid: { color: palette.border, drawTicks: false },
          ticks: { callback: (v: any) => (A.followers ? f.f1(Number(v)) + '%' : f.compact(Number(v))) },
        },
      },
    } as any,
  };

  return (
    <Section
      id="er"
      n={2}
      title={t.ui.er.title}
      sub={t.ui.er.formula(A.insightsAvail.saves, A.insightsAvail.shares)}
    >
      <div className="kpis" style={{ marginBottom: 12 }}>
        <Kpi
          label={t.ui.er.avg}
          value={S.avgER != null ? f.f2(S.avgER) + '%' : '–'}
          sub={<LevelBadge level={S.label} />}
        />
        <Kpi label={t.ui.er.median} value={S.medER != null ? f.f2(S.medER) + '%' : '–'} sub={t.ui.er.medianSub} />
        <Kpi
          label={t.ui.er.byReach}
          value={S.avgERReach != null ? f.f2(S.avgERReach) + '%' : '–'}
          sub={S.avgERReach != null ? t.ui.er.byReachSub : t.ui.er.byReachNoData}
        />
        {S.nCollab ? (
          <>
            <Kpi
              label={t.ui.er.noCollab}
              value={S.avgERSolo != null ? f.f2(S.avgERSolo) + '%' : '–'}
              sub={t.ui.er.noCollabSub(S.nSolo, f.f2(S.medERSolo))}
            />
            <Kpi
              label={t.ui.er.collab}
              value={S.avgERCollab != null ? f.f2(S.avgERCollab) + '%' : '–'}
              sub={t.ui.er.collabSub(S.nCollab, f.f2(S.medERCollab))}
            />
          </>
        ) : null}
        <Kpi label={t.ui.er.interactions} value={f.f0(S.avgEng)} sub={t.ui.er.interactionsSub} />
      </div>

      <div className="grid g2">
        <div className="card">
          <h3>{t.ui.er.trendTitle(A.scoreLabel)}</h3>
          <ChartBox config={trendConfig} variant="tall" themeKey={themeKey} />
        </div>
        <div className="card">
          <h3>{t.ui.er.benchmark}</h3>
          {tier ? (
            <>
              <div className="tbl-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>{t.ui.er.category(t.ui.tiers[tier.key])}</th>
                      <th className="n">{t.ui.er.colER}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>
                        <LevelBadge level={{ key: 'low' }} />
                      </td>
                      <td className="n">&lt; {tier.t[0]}%</td>
                    </tr>
                    <tr>
                      <td>
                        <LevelBadge level={{ key: 'avg' }} />
                      </td>
                      <td className="n">
                        {tier.t[0]} – {tier.t[1]}%
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <LevelBadge level={{ key: 'good' }} />
                      </td>
                      <td className="n">
                        {tier.t[1]} – {tier.t[2]}%
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <LevelBadge level={{ key: 'great' }} />
                      </td>
                      <td className="n">≥ {tier.t[2]}%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="na" style={{ marginTop: 8 }}>
                {t.ui.er.benchNote}
              </p>
            </>
          ) : (
            <NA text={t.ui.er.noFollowers} />
          )}

          {totalL ? (
            <div style={{ marginTop: 8 }}>
              {(['great', 'good', 'avg', 'low'] as LevelKey[]).map((k) => (
                <div key={k}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginTop: 8 }}>
                    <LevelBadge level={{ key: k }} />
                    <span>{t.ui.er.dist(counts[k], f.f0((counts[k] / totalL) * 100))}</span>
                  </div>
                  <div className="bar-h">
                    <span style={{ width: `${(counts[k] / totalL) * 100}%`, background: 'var(--accent)' }} />
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </Section>
  );
}
