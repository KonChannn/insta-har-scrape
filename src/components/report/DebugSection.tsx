'use client';

import { useReport } from '../ReportContext';
import { download, reportJson } from '@/lib/summary';

export function DebugSection() {
  const { A, t, f } = useReport();
  const D = A.debug;

  return (
    <details className="debug">
      <summary>{t.ui.debug.title}</summary>

      <h4>{t.ui.debug.files}</h4>
      <div className="tbl-wrap">
        <table>
          <thead>
            <tr>
              <th>{t.ui.debug.colName}</th>
              <th className="n">{t.ui.debug.colEntries}</th>
              <th className="n">{t.ui.debug.colUsed}</th>
              <th>{t.ui.debug.colRecorded}</th>
            </tr>
          </thead>
          <tbody>
            {D.files.map((file) => (
              <tr key={file.name}>
                <td>{file.name}</td>
                <td className="n">{file.entries}</td>
                <td className="n">{file.used}</td>
                <td>{file.captureTs ? new Date(file.captureTs).toLocaleString() : '–'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h4>{t.ui.debug.summary}</h4>
      <p className="mono">
        {t.ui.debug.counts(D.counts)}
        <br />
        {t.ui.debug.posts(D.totalPosts, D.accountPosts, A.account, D.excluded)}
        <br />
        {t.ui.debug.comments(D.comments, D.accountComments)}
      </p>
      <button
        type="button"
        className="btn sm no-print"
        onClick={() => download(`ig-${A.account}-report.json`, reportJson(A), 'application/json')}
      >
        {t.ui.debug.exportJson}
      </button>

      <h4>{t.ui.debug.queries}</h4>
      <div className="tbl-wrap">
        <table>
          <thead>
            <tr>
              <th>{t.ui.debug.colFriendly}</th>
              <th>{t.ui.debug.colDoc}</th>
              <th>{t.ui.debug.colKind}</th>
              <th className="n">{t.ui.debug.colReq}</th>
              <th className="n">{t.ui.debug.colPost}</th>
              <th className="n">{t.ui.debug.colComment}</th>
              <th className="n">{t.ui.debug.colProfile}</th>
              <th className="n">{t.ui.debug.colInsight}</th>
              <th className="n">{t.ui.debug.colFail}</th>
              <th>{t.ui.debug.colEncoding}</th>
            </tr>
          </thead>
          <tbody>
            {D.queries.map((q) => (
              <tr key={q.name + q.doc}>
                <td className="mono">{q.name}</td>
                <td className="mono">{q.doc}</td>
                <td>{q.kind}</td>
                <td className="n">{q.requests}</td>
                <td className="n">{q.posts}</td>
                <td className="n">{q.comments}</td>
                <td className="n">{q.profiles}</td>
                <td className="n">{q.insights}</td>
                <td className="n">{q.fails}</td>
                <td className="mono">{q.encodings}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h4>{t.ui.debug.availability}</h4>
      <p>
        {D.fields.map((field) => (
          <span className="chip" key={field.key}>
            {field.n ? '✓' : '✗'} {field.label} {field.n}/{field.of}
          </span>
        ))}
      </p>
      <p>
        {D.profFields.map((field) => (
          <span className="chip" key={field.label}>
            {field.ok ? '✓' : '✗'} {t.ui.debug.fieldProfile(field.label)}
          </span>
        ))}
      </p>

      <h4>{t.ui.debug.missing}</h4>
      <p>
        {D.missing.length ? (
          D.missing.map((m) => (
            <span className="chip" key={m}>
              {m}
            </span>
          ))
        ) : (
          t.ui.debug.available
        )}
      </p>

      {A.insightTotals.audienceRaw.length ? (
        <>
          <h4>{t.ui.debug.rawAudience}</h4>
          {A.insightTotals.audienceRaw.map((a) => (
            <p className="mono" key={a.key}>
              {a.key}: {a.value}
            </p>
          ))}
        </>
      ) : null}

      <p className="na">{t.ui.debug.privacy}</p>
      <p className="na">
        {f.dDateMs(A.captureTs)} · {A.debug.counts.graphql} GraphQL · {A.debug.counts.rest} REST
      </p>
    </details>
  );
}
