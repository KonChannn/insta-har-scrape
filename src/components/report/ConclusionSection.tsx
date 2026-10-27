'use client';

import { copyText } from '@/lib/clipboard';
import { renderMsg } from '@/lib/i18n';
import { buildSummary, download, type SummaryFormat } from '@/lib/summary';
import { useMemo, useState } from 'react';
import { useReport } from '../ReportContext';
import { NA, Rich, Section } from './primitives';

export function ConclusionSection() {
  const { A, t, f, toast } = useReport();
  const C = A.conclusions;
  const [fmt, setFmt] = useState<SummaryFormat>('plain');
  const text = useMemo(() => buildSummary(A, t, f, fmt), [A, t, f, fmt]);

  const copy = async () => {
    toast((await copyText(text)) ? t.ui.conclusion.copied : t.ui.conclusion.copyFail);
  };

  return (
    <Section id="kesimpulan" n={11} title={t.ui.conclusion.title} sub={t.ui.conclusion.sub}>
      <div className="grid g2">
        <div className="card">
          <h3>{t.ui.conclusion.ins}</h3>
          <ol className="list-insights">
            {C.ins.map((x, i) => (
              <li key={i}>
                <Rich text={renderMsg(t, x.text)} />
                {x.why ? (
                  <span className="why">
                    📊 <Rich text={renderMsg(t, x.why)} />
                  </span>
                ) : null}
              </li>
            ))}
          </ol>
        </div>
        <div className="card">
          <h3>{t.ui.conclusion.recs}</h3>
          {C.recs.length ? (
            <ol className="list-insights recs">
              {C.recs.map((x, i) => (
                <li key={i}>
                  <Rich text={renderMsg(t, x.text)} />
                  {x.why ? (
                    <span className="why">
                      📊 <Rich text={renderMsg(t, x.why)} />
                    </span>
                  ) : null}
                </li>
              ))}
            </ol>
          ) : (
            <NA text={t.ui.conclusion.noRecs} />
          )}
        </div>
      </div>

      <div className="card no-print" id="copyCard" style={{ marginTop: 12 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 8 }}>
          <h3 style={{ margin: 0, flex: '1 1 auto' }}>{t.ui.conclusion.summaryCard}</h3>
          <select
            className="btn sm"
            value={fmt}
            onChange={(e) => setFmt(e.target.value as SummaryFormat)}
            aria-label={t.ui.conclusion.summaryCard}
          >
            {(['plain', 'wa', 'md'] as const).map((k) => (
              <option key={k} value={k}>
                {t.ui.conclusion.formats[k]}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="btn sm"
            onClick={() =>
              download(`ig-${A.account}-report.md`, buildSummary(A, t, f, 'md'), 'text/markdown;charset=utf-8')
            }
          >
            {t.ui.conclusion.downloadMd}
          </button>
          <button type="button" className="btn sm primary" onClick={copy}>
            {t.ui.conclusion.copy}
          </button>
        </div>
        <textarea
          id="sumText"
          className="sumtext"
          readOnly
          spellCheck={false}
          value={text}
          rows={Math.min(24, text.split('\n').length + 1)}
          aria-label={t.ui.conclusion.summaryCard}
        />
        <p className="hint">{t.ui.conclusion.summaryNote}</p>
      </div>
    </Section>
  );
}
