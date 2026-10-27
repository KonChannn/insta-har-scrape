'use client';

import { metricLabel } from '@/lib/metrics';
import type { ReactNode } from 'react';
import { useReport } from '../ReportContext';
import { NA, Section } from './primitives';

export function InsightsSection() {
  const { A, t, f, mode } = useReport();
  const av = A.insightsAvail;
  const T = A.insightTotals;
  const ins = A.aud.ins;

  const row = (label: string, ok: boolean, value: ReactNode, note = '') => (
    <tr key={label}>
      <td>{label}</td>
      <td>{ok ? <b>{value}</b> : <NA />}</td>
      <td style={{ color: 'var(--muted)', fontSize: 12 }}>{note}</td>
    </tr>
  );

  return (
    <Section id="insights" n={8} title={t.ui.insights.title} sub={t.ui.insights.sub}>
      {mode === 'osint' ? (
        <div className="card note">
          <span className="badge b-est">{t.ui.mode.osintBadge}</span>{' '}
          <span className="na">{t.ui.insights.modeNote}</span>
        </div>
      ) : null}

      {ins.overview.length ? (
        <div className="card" style={{ marginBottom: 12 }}>
          <h3>
            {t.ui.insights.allMetrics}
            {ins.period ? ` · ${t.ui.insights.period} ${f.dDate(ins.period.start)} – ${f.dDate(ins.period.end)}` : ''}
          </h3>
          <div className="tbl-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t.ui.insights.colMetric}</th>
                  <th className="n">{t.ui.insights.colValue}</th>
                  <th>{t.ui.insights.colNote}</th>
                </tr>
              </thead>
              <tbody>
                {ins.overview.map((m) => (
                  <tr key={m.key}>
                    <td>{metricLabel(t, m.key)}</td>
                    <td className="n">
                      <b>{f.f0(m.value)}</b>
                    </td>
                    <td className="mono" style={{ color: 'var(--muted)' }}>
                      {m.key}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="na" style={{ marginTop: 8 }}>
            {t.ui.insights.allMetricsNote}
          </p>
        </div>
      ) : null}

      <div className="card">
        <div className="tbl-wrap">
          <table>
            <thead>
              <tr>
                <th>{t.ui.insights.colMetric}</th>
                <th>{t.ui.insights.colValue}</th>
                <th>{t.ui.insights.colNote}</th>
              </tr>
            </thead>
            <tbody>
              {row(t.ui.insights.reach, av.reach, f.f0(T.reach), t.ui.insights.reachNote)}
              {row(t.ui.insights.impressions, av.impressions, f.f0(T.impressions), t.ui.insights.impressionsNote)}
              {row(t.ui.insights.saves, av.saves, f.f0(T.saves))}
              {row(t.ui.insights.shares, av.shares, f.f0(T.shares))}
              {row(t.ui.insights.profileVisits, av.profile_visits, f.f0(T.profile_visits))}
              {row(
                t.ui.insights.audience,
                av.audience,
                T.audienceRaw.length
                  ? T.audienceRaw.map((a) => a.key).join(', ')
                  : t.ui.insights.audienceHours,
                t.ui.insights.audienceNote,
              )}
              {row(
                t.ui.insights.repost,
                av.reposts,
                t.ui.insights.repostValue(f.f0(T.reposts), f.f0(T.repostsN)),
                t.ui.insights.repostNote,
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Section>
  );
}
