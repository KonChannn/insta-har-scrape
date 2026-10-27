'use client';

import { useReport } from '../ReportContext';
import { HeatGrid, HeatLegend, Section } from './primitives';

export function TimingSection() {
  const { A, t, f, themeKey } = useReport();
  const scoreFmt = (v: number | null | undefined) => (A.followers ? f.f2(v) + '%' : f.f0(v));
  const block = (b: number) =>
    `${String(b * 3).padStart(2, '0')}.00–${String(b * 3 + 3).padStart(2, '0')}.00`;
  const minN = A.posts.length >= 30 ? 3 : 2;

  return (
    <Section
      id="waktu"
      n={6}
      title={t.ui.timing.title}
      sub={t.ui.timing.sub(A.scoreLabel)}
    >
      <div className="card" style={{ marginBottom: 12 }}>
        <div className="heat-wrap">
          <HeatGrid
            cells={A.heat}
            value={(c) => c.med}
            label={(c) => c.n}
            tip={(c, v) => `${c.n} post · ${t.ui.er.median} ${scoreFmt(v)}`}
          />
        </div>
        <HeatLegend low={t.ui.timing.low} high={t.ui.timing.high} />
      </div>

      <div className="grid g2">
        <div className="card">
          <h3>{t.ui.timing.rankDay}</h3>
          <div className="tbl-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>{t.ui.timing.colDay}</th>
                  <th className="n">{t.ui.timing.colPosts}</th>
                  <th className="n">{t.ui.timing.colMedian(A.scoreLabel)}</th>
                </tr>
              </thead>
              <tbody>
                {A.byDay.slice(0, 7).map((x, i) => (
                  <tr key={x.k}>
                    <td>{i + 1}</td>
                    <td>{t.ui.days[x.k]}</td>
                    <td className="n">{x.n}</td>
                    <td className="n">
                      <b>{scoreFmt(x.avg)}</b>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card">
          <h3>{t.ui.timing.rankBlock}</h3>
          <div className="tbl-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>{t.ui.timing.colBlock}</th>
                  <th className="n">{t.ui.timing.colPosts}</th>
                  <th className="n">{t.ui.timing.colMedian(A.scoreLabel)}</th>
                </tr>
              </thead>
              <tbody>
                {A.byBlock.slice(0, 7).map((x, i) => (
                  <tr key={x.k}>
                    <td>{i + 1}</td>
                    <td>{block(x.k)}</td>
                    <td className="n">{x.n}</td>
                    <td className="n">
                      <b>{scoreFmt(x.avg)}</b>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="na" style={{ marginTop: 8 }}>
            {t.ui.timing.minSample(minN)}
          </p>
        </div>
      </div>
    </Section>
  );
}
