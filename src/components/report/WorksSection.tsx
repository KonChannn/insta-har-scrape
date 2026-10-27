'use client';

import type { WorksRow } from '@/lib/core/types';
import { useReport } from '../ReportContext';
import { NA, Section } from './primitives';

export function WorksSection() {
  const { A, t, f } = useReport();
  const W = A.works;

  if (!W) {
    return (
      <Section id="works" n={10} title={t.ui.works.title}>
        <div className="card">
          <NA text={t.ui.works.need6} />
        </div>
      </Section>
    );
  }

  const fmtVal = (r: WorksRow, v: number | string | null): string => {
    if (typeof v === 'string') return v;
    if (v == null) return '–';
    if (r.unit === '%') return f.f0(v) + '%';
    if (r.unit === 'chars') return `${f.f0(v)} ${t.ui.works.chars}`;
    if (r.unit === 'sec') return `${f.f0(v)} ${t.ui.works.sec}`;
    return r.dec ? f.f1(v) : f.f0(v);
  };

  const flag = (r: WorksRow) => {
    if (typeof r.top !== 'number' || typeof r.bot !== 'number') return null;
    const diff = r.unit === '%' ? r.top - r.bot : r.bot ? (r.top / r.bot - 1) * 100 : 0;
    const threshold = r.unit === '%' ? 15 : 25;
    if (Math.abs(diff) < threshold) return <span className="badge b-na">{t.ui.works.similar}</span>;
    return diff > 0 ? (
      <span className="badge b-great">{t.ui.works.higherTop}</span>
    ) : (
      <span className="badge b-low">{t.ui.works.lowerTop}</span>
    );
  };

  const hooks = W.top.slice(0, 5).filter((p) => p.hook);

  return (
    <Section id="works" n={10} title={t.ui.works.title} sub={t.ui.works.sub(W.k, A.scoreLabel)}>
      <div className="card" style={{ marginBottom: 12 }}>
        <div className="tbl-wrap">
          <table>
            <thead>
              <tr>
                <th>{t.ui.works.colFactor}</th>
                <th>{t.ui.works.colTop(W.k)}</th>
                <th>{t.ui.works.colBottom(W.k)}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {W.rows.map((r) => (
                <tr key={r.label}>
                  <td>{t.ui.works.labels[r.label as keyof typeof t.ui.works.labels] ?? r.label}</td>
                  <td>
                    <b>{fmtVal(r, r.top)}</b>
                  </td>
                  <td>{fmtVal(r, r.bot)}</td>
                  <td>{flag(r)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="na" style={{ marginTop: 8 }}>
          {t.ui.works.note}
        </p>
      </div>

      <div className="grid g2">
        <div className="card">
          <h3>{t.ui.works.hashtags}</h3>
          {W.topTags.length ? (
            <div className="tbl-wrap">
              <table>
                <thead>
                  <tr>
                    <th>{t.ui.works.colTag}</th>
                    <th className="n">{t.ui.works.colInTop}</th>
                    <th className="n">{t.ui.works.colUsed}</th>
                    <th className="n">{t.ui.works.colAvg(A.scoreLabel)}</th>
                  </tr>
                </thead>
                <tbody>
                  {W.topTags.map((x) => (
                    <tr key={x.tag}>
                      <td>#{x.tag}</td>
                      <td className="n">{x.inTop}</td>
                      <td className="n">{x.n}</td>
                      <td className="n">
                        {A.followers ? f.f2(x.avg) + '%' : f.f0(x.avg)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <NA />
          )}
        </div>
        <div className="card">
          <h3>{t.ui.works.hooks}</h3>
          {hooks.length ? (
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {hooks.map((p) => (
                <li key={p.code} style={{ margin: '4px 0' }}>
                  <span className="chip">{t.ui.types[p.type]}</span> “{p.hook.slice(0, 140)}”{' '}
                  <span style={{ color: 'var(--muted)' }}>
                    — {A.followers ? f.f2(p.er) + '%' : f.f0(p.eng)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <NA text={t.ui.works.noCaptions} />
          )}
        </div>
      </div>
    </Section>
  );
}
