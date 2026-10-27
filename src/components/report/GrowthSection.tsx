'use client';

import type { ChartConfiguration } from 'chart.js';
import { mergeSnapshots } from '@/lib/snapshots';
import { download, snapshotsJson } from '@/lib/summary';
import { useRef } from 'react';
import { useReport } from '../ReportContext';
import { ChartBox, chartPalette } from './ChartBox';
import { Kpi, NA, Section } from './primitives';

export function GrowthSection() {
  const { A, t, f, themeKey, snaps, onSnapshots, toast } = useReport();
  const palette = chartPalette(themeKey);
  const fileRef = useRef<HTMLInputElement>(null);
  const G = A.growth;
  const list = A.snapshots;

  const line = (data: (number | null)[], fmt: (v: number | null) => string): ChartConfiguration => ({
    type: 'line',
    data: {
      labels: list.map((s) => f.dDateMs(s.captureTs)),
      datasets: [
        {
          data,
          borderColor: palette.accent,
          backgroundColor: palette.accent,
          borderWidth: 2,
          pointRadius: 4,
          pointBorderColor: palette.surface,
          pointBorderWidth: 2,
          tension: 0.2,
        },
      ],
    },
    options: {
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: (c: any) => fmt(c.raw) } },
      },
      scales: {
        y: { grid: { color: palette.border }, ticks: { callback: (v: any) => fmt(Number(v)) } },
        x: { grid: { display: false } },
      },
    } as any,
  });

  const onImport = async (file: File) => {
    try {
      const parsed = JSON.parse(await file.text());
      const incoming = Array.isArray(parsed) ? parsed : parsed.snapshots;
      if (!Array.isArray(incoming)) throw new Error('unknown format');
      const next = mergeSnapshots(snaps, incoming);
      onSnapshots(next);
      toast(t.ui.growth.imported(next.length - snaps.length));
    } catch (e) {
      toast(t.ui.growth.importFail((e as Error).message));
    }
  };

  return (
    <Section id="growth" n={9} title={t.ui.growth.title} sub={t.ui.growth.sub}>
      {G ? (
        <>
          <div className="kpis" style={{ marginBottom: 12 }}>
            <Kpi
              label={t.ui.growth.followerGrowth}
              value={f.pctCh(G.followers.pct)}
              sub={`${f.f0(G.followers.a)} → ${f.f0(G.followers.b)} (${(G.followers.abs ?? 0) >= 0 ? '+' : ''}${f.f0(G.followers.abs)})`}
            />
            <Kpi
              label={t.ui.growth.erChange}
              value={f.pctCh(G.er.pct)}
              sub={`${f.f2(G.er.a)}% → ${f.f2(G.er.b)}%`}
            />
            <Kpi
              label={t.ui.growth.viewsChange}
              value={G.views.pct != null ? f.pctCh(G.views.pct) : '–'}
              sub={G.views.pct != null ? `${f.f0(G.views.a)} → ${f.f0(G.views.b)}` : t.ui.growth.noViews}
            />
            <Kpi
              label={t.ui.growth.likesChange}
              value={f.pctCh(G.likes.pct)}
              sub={`${f.f0(G.likes.a)} → ${f.f0(G.likes.b)}`}
            />
            <Kpi
              label={t.ui.growth.range}
              value={t.ui.growth.daysN(f.f0(G.days))}
              sub={`${f.dDateMs(G.from)} → ${f.dDateMs(G.to)}`}
            />
          </div>
          <div className="grid g2" style={{ marginBottom: 12 }}>
            <div className="card">
              <h3>{t.ui.growth.followersSnap}</h3>
              <ChartBox config={line(list.map((s) => s.followers), (v) => f.f0(v))} themeKey={themeKey} />
            </div>
            <div className="card">
              <h3>{t.ui.growth.erSnap}</h3>
              <ChartBox config={line(list.map((s) => s.avgER), (v) => f.f2(v) + '%')} themeKey={themeKey} />
            </div>
            {list.some((s) => s.avgViews != null) ? (
              <div className="card">
                <h3>{t.ui.growth.viewsSnap}</h3>
                <ChartBox config={line(list.map((s) => s.avgViews), (v) => f.f0(v))} themeKey={themeKey} />
              </div>
            ) : null}
          </div>
        </>
      ) : (
        <div className="card" style={{ marginBottom: 12 }}>
          <NA text={t.ui.growth.onlyOne} />
        </div>
      )}

      <div className="card no-print">
        <h3>{t.ui.growth.snapshots}</h3>
        <div className="tbl-wrap">
          <table>
            <thead>
              <tr>
                <th>{t.ui.growth.colDate}</th>
                <th className="n">{t.ui.growth.colFollowers}</th>
                <th className="n">{t.ui.growth.colER}</th>
                <th className="n">{t.ui.growth.colLikes}</th>
                <th className="n">{t.ui.growth.colPosts}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {list.map((s) => (
                <tr key={s.captureTs}>
                  <td>{f.dDateMs(s.captureTs)}</td>
                  <td className="n">{f.f0(s.followers)}</td>
                  <td className="n">{s.avgER != null ? f.f2(s.avgER) + '%' : '–'}</td>
                  <td className="n">{f.f0(s.avgLikes)}</td>
                  <td className="n">{s.postsAnalyzed}</td>
                  <td>
                    <button
                      type="button"
                      className="btn sm"
                      onClick={() => {
                        const next = snaps.filter(
                          (x) => !(x.account === A.account && x.captureTs === s.captureTs),
                        );
                        onSnapshots(next);
                      }}
                    >
                      {t.ui.growth.del}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
          <button
            type="button"
            className="btn sm"
            onClick={() =>
              download(
                `snapshot-ig-${A.account}-${new Date().toISOString().slice(0, 10)}.json`,
                snapshotsJson(snaps),
                'application/json',
              )
            }
          >
            {t.ui.growth.export}
          </button>
          <label className="btn sm" htmlFor="snapImp">
            {t.ui.growth.import}
          </label>
          <input
            ref={fileRef}
            id="snapImp"
            type="file"
            accept=".json,application/json"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (file) void onImport(file);
            }}
          />
        </div>
        <p className="na" style={{ marginTop: 8 }}>
          {t.ui.growth.note}
        </p>
      </div>
    </Section>
  );
}
