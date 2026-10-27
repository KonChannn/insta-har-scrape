'use client';

import { isNum, mean, median } from '@/lib/core/util';
import { bouncePct, skipPct, viewRate, watchedPct } from '@/lib/metrics';
import { useReport } from '../ReportContext';
import { Duration, Kpi, NA, Section } from './primitives';

export function PostInsightsSection() {
  const { A, t, f } = useReport();

  const list = A.posts
    .filter(
      (p) =>
        p.reach != null ||
        p.impressions != null ||
        p.avgWatch != null ||
        p.totalWatch != null ||
        p.skipRate != null,
    )
    .sort((a, b) => (b.impressions ?? b.views ?? 0) - (a.impressions ?? a.views ?? 0));

  const totalReach = list.reduce((s, p) => s + (p.reach ?? 0), 0);
  const watches = list.map((p) => p.avgWatch).filter(isNum);
  const bounces = list.map((p) => bouncePct(p)).filter(isNum);

  return (
    <Section id="postinsights" n={3} title={t.ui.postinsights.title} sub={t.ui.postinsights.sub}>
      {list.length ? (
        <>
          <div className="kpis" style={{ marginBottom: 12 }}>
            <Kpi label={t.ui.postinsights.kpiPosts} value={f.f0(list.length)} sub={`/ ${A.posts.length}`} />
            <Kpi label={t.ui.postinsights.kpiReach} value={f.f0(totalReach)} />
            <Kpi
              label={t.ui.postinsights.kpiWatch}
              value={watches.length ? `${f.f1(mean(watches))}s` : '–'}
              sub={`${watches.length} post`}
            />
            <Kpi
              label={t.ui.postinsights.kpiBounce}
              value={bounces.length ? `${f.f0(median(bounces))}%` : '–'}
              sub={bounces.length ? `${bounces.length} post` : undefined}
            />
          </div>

          <div className="card">
            <div className="ah">
              <h3>{t.ui.postinsights.title}</h3>
              <span className="na">{t.ui.postinsights.sortHint}</span>
            </div>
            <div className="tbl-wrap scroll-y tall">
              <table>
                <thead>
                  <tr>
                    <th>{t.ui.postinsights.colPost}</th>
                    <th className="n">{t.ui.postinsights.colViews}</th>
                    <th className="n">{t.ui.postinsights.colReach}</th>
                    <th className="n">{t.ui.postinsights.colViewRate}</th>
                    <th className="n">{t.ui.postinsights.colAvgWatch}</th>
                    <th className="n">{t.ui.postinsights.colWatched}</th>
                    <th className="n">{t.ui.postinsights.colBounce}</th>
                    <th className="n">{t.ui.postinsights.colSkip}</th>
                    <th className="n">{t.ui.postinsights.colTotalWatch}</th>
                    <th className="n">{t.ui.postinsights.colSaves}</th>
                    <th className="n">{t.ui.postinsights.colShares}</th>
                    <th className="n">{t.ui.postinsights.colER}</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((p) => {
                    const views = p.impressions ?? p.views;
                    const rate = viewRate(p, views);
                    const watched = watchedPct(p);
                    const bounce = bouncePct(p);
                    const skip = skipPct(p);
                    return (
                      <tr key={p.code}>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <a href={p.url} target="_blank" rel="noopener noreferrer">
                            {f.dDate(p.t)}
                          </a>{' '}
                          <span className="chip">{t.ui.types[p.type]}</span>
                          <div className="na">{p.code}</div>
                        </td>
                        <td className="n">{views != null ? f.f0(views) : '–'}</td>
                        <td className="n">{p.reach != null ? f.f0(p.reach) : '–'}</td>
                        <td className="n">{rate != null ? `${f.f0(rate)}%` : '–'}</td>
                        <td className="n">{p.avgWatch != null ? `${f.f1(p.avgWatch)}s` : '–'}</td>
                        <td className="n">{watched != null ? `${f.f0(watched)}%` : '–'}</td>
                        <td className="n">{bounce != null ? `${f.f0(bounce)}%` : '–'}</td>
                        <td className="n">{skip != null ? `${f.f0(skip)}%` : '–'}</td>
                        <td className="n">
                          {p.totalWatch != null ? <Duration seconds={p.totalWatch} /> : '–'}
                        </td>
                        <td className="n">{p.saves != null ? f.f0(p.saves) : '–'}</td>
                        <td className="n">{p.shares != null ? f.f0(p.shares) : '–'}</td>
                        <td className="n">{A.followers ? f.f2(p.er) + '%' : f.f0(p.eng)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="na" style={{ marginTop: 8 }}>
              {t.ui.postinsights.note}
            </p>
          </div>
        </>
      ) : (
        <div className="card">
          <NA text={t.ui.postinsights.empty} />
        </div>
      )}
    </Section>
  );
}
