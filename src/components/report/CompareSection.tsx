'use client';

import type { AnalyzedPost } from '@/lib/core/types';
import { bouncePct, skipPct, viewRate, watchedPct } from '@/lib/metrics';
import type { ChartConfiguration } from 'chart.js';
import { useMemo, useState } from 'react';
import { useReport } from '../ReportContext';
import { ChartBox, chartPalette } from './ChartBox';
import { Duration, NA, Section } from './primitives';

const MAX = 4;

export function CompareSection() {
  const { A, t, f, themeKey, mode } = useReport();
  const palette = chartPalette(themeKey);

  const candidates = useMemo(() => {
    const withViews = A.posts.filter((p) => p.views != null);
    const base = withViews.length >= 2 ? withViews : A.posts;
    return [...base].sort((a, b) => (b.views ?? b.eng) - (a.views ?? a.eng));
  }, [A.posts]);

  const initial = useMemo(() => {
    const watched = candidates.filter((p) => p.avgWatch != null);
    const picks = [...watched, ...candidates.filter((p) => !watched.includes(p))].slice(0, 3);
    return picks.map((p) => p.code);
  }, [candidates]);

  const [selected, setSelected] = useState<string[]>(initial);

  const toggle = (code: string) => {
    setSelected((prev) => {
      if (prev.includes(code)) return prev.filter((x) => x !== code);
      if (prev.length >= MAX) return prev;
      return [...prev, code];
    });
  };

  const chosen = selected
    .map((code) => A.posts.find((p) => p.code === code))
    .filter((p): p is AnalyzedPost => !!p);

  const anyReach = chosen.some((p) => p.reach != null);
  const canCompare = chosen.length >= 2;

  const config: ChartConfiguration = {
    type: 'bar',
    data: {
      labels: chosen.map((p) => `${f.dDate(p.t)} · ${t.ui.types[p.type]}`),
      datasets: [
        {
          label: t.ui.compare.colViews,
          data: chosen.map((p) =>
            mode === 'owned' ? p.impressions ?? p.views ?? 0 : p.views ?? p.impressions ?? 0,
          ),
          backgroundColor: palette.s1,
          borderRadius: 4,
          maxBarThickness: 52,
        },
        ...(anyReach
          ? [
              {
                label: t.ui.compare.colReach,
                data: chosen.map((p) => p.reach ?? 0),
                backgroundColor: palette.s2,
                borderRadius: 4,
                maxBarThickness: 52,
              },
            ]
          : []),
      ],
    },
    options: {
      plugins: {
        legend: { display: true },
        tooltip: { callbacks: { label: (c: any) => `${c.dataset.label}: ${f.f0(c.raw)}` } },
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: { color: palette.border, drawTicks: false },
          ticks: { callback: (v: any) => f.compact(Number(v)) },
        },
        x: { grid: { display: false } },
      },
    } as any,
  };

  return (
    <Section id="compare" n={5} title={t.ui.compare.title} sub={t.ui.compare.sub}>
      {mode === 'osint' ? (
        <div className="card note">
          <span className="badge b-est">{t.ui.mode.osintBadge}</span> <span className="na">{t.ui.compare.osintNote}</span>
        </div>
      ) : null}

      {candidates.length ? (
        <>
          <div className="card" style={{ marginBottom: 12 }}>
            <div className="ah">
              <h3>{t.ui.compare.picker}</h3>
              <span className="na">
                {t.ui.compare.selectedN(chosen.length)} · {t.ui.compare.max}
              </span>
            </div>
            <div className="compare-picker">
              {candidates.map((p) => {
                const on = selected.includes(p.code);
                return (
                  <label key={p.code} className={on ? 'sel' : undefined}>
                    <input type="checkbox" checked={on} onChange={() => toggle(p.code)} />
                    <span>
                      {f.dDate(p.t)} · {t.ui.types[p.type]}
                      {p.views != null ? ` · ${f.compact(p.views)} views` : ''}
                    </span>
                  </label>
                );
              })}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
              <button type="button" className="btn sm" onClick={() => setSelected(initial)}>
                {t.ui.compare.reset}
              </button>
              {!canCompare ? <span className="na">{t.ui.compare.needTwo}</span> : null}
            </div>
          </div>

          {canCompare ? (
            <>
              <div className="card" style={{ marginBottom: 12 }}>
                <h3>{t.ui.compare.chartTitle}</h3>
                <ChartBox config={config} themeKey={themeKey} />
              </div>

              <div className="card">
                <div className="tbl-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>{t.ui.compare.colVideo}</th>
                        <th className="n">{t.ui.compare.colDuration}</th>
                        <th className="n">{t.ui.compare.colViews}</th>
                        {mode === 'owned' ? (
                          <>
                            <th className="n">{t.ui.compare.colReach}</th>
                            <th className="n">{t.ui.compare.colViewRate}</th>
                            <th className="n">{t.ui.compare.colAvgWatch}</th>
                            <th className="n">{t.ui.compare.colWatched}</th>
                            <th className="n">{t.ui.compare.colBounce}</th>
                            <th className="n">{t.ui.compare.colSkip}</th>
                          </>
                        ) : null}
                        <th className="n">{t.ui.compare.colLikes}</th>
                        <th className="n">{t.ui.compare.colComments}</th>
                        <th className="n">{t.ui.compare.colSaves}</th>
                        <th className="n">{t.ui.compare.colShares}</th>
                        <th className="n">{t.ui.compare.colER}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {chosen.map((p) => {
                        const watched = watchedPct(p);
                        const bounce = bouncePct(p);
                        const skip = skipPct(p);
                        const views =
                          mode === 'owned' ? p.impressions ?? p.views : p.views ?? p.impressions;
                        const rate = viewRate(p, views);
                        return (
                          <tr key={p.code}>
                            <td>
                              <a href={p.url} target="_blank" rel="noopener noreferrer">
                                {f.dDate(p.t)}
                              </a>{' '}
                              <span className="chip">{t.ui.types[p.type]}</span>
                              <div className="na">{p.code}</div>
                            </td>
                            <td className="n">
                              {p.duration != null ? <Duration seconds={p.duration} /> : '–'}
                            </td>
                            <td className="n">{views != null ? f.f0(views) : '–'}</td>
                            {mode === 'owned' ? (
                              <>
                                <td className="n">{p.reach != null ? f.f0(p.reach) : '–'}</td>
                                <td className="n">{rate != null ? `${f.f0(rate)}%` : '–'}</td>
                                <td className="n">{p.avgWatch != null ? `${f.f1(p.avgWatch)}s` : '–'}</td>
                                <td className="n">{watched != null ? `${f.f0(watched)}%` : '–'}</td>
                                <td className="n">{bounce != null ? `${f.f0(bounce)}%` : '–'}</td>
                                <td className="n">{skip != null ? `${f.f0(skip)}%` : '–'}</td>
                              </>
                            ) : null}
                            <td className="n">{f.f0(p.likes)}</td>
                            <td className="n">{f.f0(p.comments)}</td>
                            <td className="n">{p.saves != null ? f.f0(p.saves) : '–'}</td>
                            <td className="n">{p.shares != null ? f.f0(p.shares) : '–'}</td>
                            <td className="n">
                              {A.followers ? f.f2(p.er) + '%' : f.f0(p.eng)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {mode === 'owned' ? (
                  <p className="na" style={{ marginTop: 8 }}>
                    {t.ui.postinsights.note}
                  </p>
                ) : null}
              </div>
            </>
          ) : (
            <div className="card">
              <NA text={t.ui.compare.needTwo} />
            </div>
          )}
        </>
      ) : (
        <div className="card">
          <NA text={t.ui.compare.noPosts} />
        </div>
      )}
    </Section>
  );
}
