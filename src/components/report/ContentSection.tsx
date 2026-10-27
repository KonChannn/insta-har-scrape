'use client';

import { TYPES } from '@/lib/core/constants';
import type { AnalyzedPost } from '@/lib/core/types';
import type { ChartConfiguration } from 'chart.js';
import { useReport } from '../ReportContext';
import { ChartBox, chartPalette } from './ChartBox';
import { NA, Section } from './primitives';

function PostTable({ list }: { list: AnalyzedPost[] }) {
  const { A, t, f } = useReport();
  if (!list.length) return <NA text={t.ui.content.notEnough} />;

  return (
    <div className="tbl-wrap">
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>{t.ui.content.colType}</th>
            <th>{t.ui.audience.colTime}</th>
            <th>{t.ui.audience.colCaption}</th>
            <th className="n">{t.ui.content.colLikes}</th>
            <th className="n">{t.ui.content.colComments}</th>
            <th className="n">{t.ui.content.colViews}</th>
            <th className="n">{A.scoreLabel}</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {list.map((p, i) => (
            <tr key={p.code}>
              <td>{i + 1}</td>
              <td>
                <span
                  className="sw"
                  style={{
                    background:
                      p.type === 'reel' ? 'var(--s1)' : p.type === 'carousel' ? 'var(--s2)' : 'var(--s3)',
                  }}
                />
                {t.ui.types[p.type]}
                {p.collab ? <span className="chip"> {t.ui.content.collab}</span> : null}
                {p.pinned ? <span className="chip"> {t.ui.content.pinned}</span> : null}
              </td>
              <td style={{ whiteSpace: 'nowrap' }}>{f.dTime(p.t)}</td>
              <td>
                <div className="cap">{p.caption.slice(0, 220) || <span className="na">{t.ui.content.noCaption}</span>}</div>
              </td>
              <td className="n">{f.f0(p.likes)}</td>
              <td className="n">{f.f0(p.comments)}</td>
              <td className="n">{p.views != null ? f.f0(p.views) : '–'}</td>
              <td className="n">
                <b>{A.followers ? f.f2(p.er) + '%' : f.f0(p.eng)}</b>
              </td>
              <td>
                <a href={p.url} target="_blank" rel="noopener noreferrer">
                  {t.ui.content.view}
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ContentSection() {
  const { A, t, f, themeKey } = useReport();
  const palette = chartPalette(themeKey);
  const types = TYPES.filter((ty) => A.byType[ty].n);

  const config: ChartConfiguration = {
    type: 'bar',
    data: {
      labels: types.map((ty) => `${t.ui.types[ty]} (${A.byType[ty].n})`),
      datasets: [
        {
          data: types.map((ty) => (A.followers ? A.byType[ty].avgER : A.byType[ty].avgEng)),
          backgroundColor: types.map((ty) =>
            ty === 'reel' ? palette.s1 : ty === 'carousel' ? palette.s2 : palette.s3,
          ),
          borderRadius: 4,
          borderSkipped: 'start',
          maxBarThickness: 64,
        },
      ],
    },
    options: {
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (c: any) =>
              `${t.ui.er.avg}: ${A.followers ? f.f2(c.raw) + '%' : f.f0(c.raw)}`,
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: { color: palette.border, drawTicks: false },
          ticks: { callback: (v: any) => (A.followers ? f.f1(Number(v)) + '%' : f.compact(Number(v))) },
        },
        x: { grid: { display: false } },
      },
    } as any,
  };

  return (
    <Section id="konten" n={4} title={t.ui.content.title} sub={t.ui.content.sub}>
      <div className="grid g2" style={{ marginBottom: 12 }}>
        <div className="card">
          <h3>{t.ui.content.chartTitle(A.scoreLabel)}</h3>
          <ChartBox config={config} themeKey={themeKey} />
        </div>
        <div className="card">
          <h3>{t.ui.content.tableTitle}</h3>
          <div className="tbl-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t.ui.content.colType}</th>
                  <th className="n">{t.ui.content.colPosts}</th>
                  <th className="n">{t.ui.content.colShare}</th>
                  <th className="n">{A.followers ? t.ui.content.colER : t.ui.content.colEng}</th>
                  <th className="n">{t.ui.content.colLikes}</th>
                  <th className="n">{t.ui.content.colComments}</th>
                  <th className="n">{t.ui.content.colViews}</th>
                </tr>
              </thead>
              <tbody>
                {TYPES.map((ty) => {
                  const b = A.byType[ty];
                  return (
                    <tr key={ty}>
                      <td>
                        <span
                          className="sw"
                          style={{
                            background:
                              ty === 'reel' ? 'var(--s1)' : ty === 'carousel' ? 'var(--s2)' : 'var(--s3)',
                          }}
                        />
                        {t.ui.types[ty]}
                      </td>
                      <td className="n">{b.n}</td>
                      <td className="n">{f.f0(b.share * 100)}%</td>
                      <td className="n">
                        <b>{A.followers ? (b.avgER != null ? f.f2(b.avgER) + '%' : '–') : f.f0(b.avgEng)}</b>
                      </td>
                      <td className="n">{f.f0(b.avgLikes)}</td>
                      <td className="n">{f.f1(b.avgComments)}</td>
                      <td className="n">
                        {ty === 'reel' ? (b.avgViews != null ? f.f0(b.avgViews) : <span className="na">n/a</span>) : '–'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {A.summary.viewsN ? null : (
            <p className="na" style={{ marginTop: 10 }}>
              {t.ui.content.noViews}
            </p>
          )}
        </div>
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        <h3>{t.ui.content.top}</h3>
        <PostTable list={A.top10} />
      </div>
      <div className="card">
        <h3>{t.ui.content.bottom}</h3>
        <PostTable list={A.bottom10} />
      </div>
    </Section>
  );
}
