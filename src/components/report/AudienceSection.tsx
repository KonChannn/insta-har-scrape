'use client';

import type { DistItem } from '@/lib/core/types';
import { metricLabel } from '@/lib/metrics';
import { commentersCsv, download } from '@/lib/summary';
import { renderMsg } from '@/lib/i18n';
import { useMemo, useState, Fragment, type ReactNode } from 'react';
import { useReport } from '../ReportContext';
import { ChartBox, chartPalette } from './ChartBox';
import {
  Card,
  Chip,
  DistBars,
  Duration,
  HeatGrid,
  HeatLegend,
  Hint,
  KeyValue,
  NA,
  Rich,
  Section,
  SourceBadge,
} from './primitives';

export function AudienceSection() {
  const { A, t, f, themeKey, toast } = useReport();
  const { ins, pub, conclusions } = A.aud;
  const palette = chartPalette(themeKey);
  const blockLabel = (b: number) =>
    `${String(b * 3).padStart(2, '0')}.00–${String(b * 3 + 3).padStart(2, '0')}.00`;

  const demoBlock = (label: string, d: DistItem[] | undefined, kind?: string) => (
    <div>
      <div className="mini-h">{label}</div>
      <DistBars
        items={d}
        limit={6}
        label={kind ? (v) => (t.ui.dist as Record<string, Record<string, string>>)[kind]?.[v] ?? v : undefined}
      />
    </div>
  );

  const splitBar = (title: string, s: { followers: number; nonFollowers: number }) => {
    const tot = s.followers + s.nonFollowers || 1;
    return (
      <div key={title}>
        <div className="mini-h">{title}</div>
        <div className="stack">
          <span style={{ flex: s.followers, background: 'var(--s1)' }} />
          <span style={{ flex: s.nonFollowers, background: 'var(--s2)' }} />
        </div>
        <div className="legend-row" style={{ marginBottom: 10 }}>
          <span>
            <span className="sw" style={{ background: 'var(--s1)' }} />
            {t.ui.audience.followers} <b>{f.f1((s.followers / tot) * 100)}%</b> ({f.f0(s.followers)})
          </span>
          <span>
            <span className="sw" style={{ background: 'var(--s2)' }} />
            {t.ui.audience.nonFollowers} <b>{f.f1((s.nonFollowers / tot) * 100)}%</b> ({f.f0(s.nonFollowers)})
          </span>
        </div>
      </div>
    );
  };

  let split: ReactNode = (
    <>
      <NA /> <Hint>{t.ui.audience.splitHint}</Hint>
    </>
  );
  if (ins.viewsSplit || ins.interSplit) {
    split = (
      <>
        {ins.viewsSplit ? splitBar(t.ui.audience.views, ins.viewsSplit) : null}
        {ins.interSplit ? splitBar(t.ui.audience.interactions, ins.interSplit) : null}
      </>
    );
  } else if (ins.followerSplit) {
    split = splitBar(t.ui.audience.splitTitle, ins.followerSplit);
  }

  const watch =
    ins.avgWatch != null || ins.retention ? (
      <>
        {ins.avgWatch != null ? (
          <>
            <KeyValue label={t.ui.audience.avgWatch} value={<b>{f.f1(ins.avgWatch)}s</b>} />
            <KeyValue label={t.ui.audience.watchN} value={<b>{ins.watchN || '–'}</b>} />
          </>
        ) : null}
        {ins.watchByPost.length ? (
          <div className="tbl-wrap scroll-y sm">
            <table>
              <thead>
                <tr>
                  <th>{t.ui.audience.colReel}</th>
                  <th className="n">{t.ui.audience.colWatch}</th>
                  <th className="n">{t.ui.audience.colDuration}</th>
                  <th className="n">{t.ui.audience.colWatched}</th>
                </tr>
              </thead>
              <tbody>
                {ins.watchByPost.map((w) => (
                  <tr key={w.code}>
                    <td>
                      <a href={w.url} target="_blank" rel="noopener noreferrer">
                        {w.code}
                      </a>
                    </td>
                    <td className="n">{f.f1(w.avgWatch)}s</td>
                    <td className="n">{w.duration ? f.f0(w.duration) + 's' : '–'}</td>
                    <td className="n">{w.duration ? f.f0((w.avgWatch / w.duration) * 100) + '%' : '–'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
        {ins.retention ? (
          <ChartBox
            themeKey={themeKey}
            variant="short"
            config={{
              type: 'line',
              data: {
                labels: ins.retention.map((_, i) => i),
                datasets: [
                  {
                    data: ins.retention,
                    borderColor: palette.accent,
                    backgroundColor: palette.accent,
                    borderWidth: 2,
                    pointRadius: 0,
                    tension: 0.2,
                  },
                ],
              },
              options: {
                plugins: {
                  legend: { display: false },
                  tooltip: { callbacks: { label: (c: any) => f.f1(c.raw) } },
                },
                scales: {
                  y: { beginAtZero: true, grid: { color: palette.border } },
                  x: { grid: { display: false } },
                },
              } as any,
            }}
          />
        ) : (
          <p className="na">
            {t.ui.audience.retentionTitle}: {t.ui.na}
          </p>
        )}
      </>
    ) : (
      <>
        <NA /> <Hint>{t.ui.audience.watchHint}</Hint>
      </>
    );

  const bestWin = (h: number[]) => {
    let b = 0;
    let bv = -1;
    for (let i = 0; i < 24; i++) {
      const v = h[i] + h[(i + 1) % 24] + h[(i + 2) % 24];
      if (v > bv) {
        bv = v;
        b = i;
      }
    }
    return `${String(b).padStart(2, '0')}.00–${String((b + 3) % 24).padStart(2, '0')}.00`;
  };

  const active = ins.activeGrid ? (
    <>
      <div className="heat-wrap">
        <HeatGrid
          cells={ins.activeGrid}
          value={(c) => c}
          label={() => ''}
          tip={(_, v) => t.ui.audience.onlineApprox(f.f0(v))}
        />
      </div>
      <HeatLegend low={t.ui.audience.little} high={t.ui.audience.many} />
      <KeyValue label={t.ui.audience.busiest} value={<b>{bestWin(ins.hours ?? [])} WIB</b>} />
      <KeyValue
        label={t.ui.audience.busiestDay}
        value={<b>{t.ui.days[(ins.days ?? []).indexOf(Math.max(...(ins.days ?? [0])))]}</b>}
      />
      <p className="na">{t.ui.audience.ptNote(ins.tzShift ?? 0)}</p>
    </>
  ) : ins.hours || ins.days ? (
    <>
      {ins.hours ? (
        <ChartBox
          themeKey={themeKey}
          variant="short"
          config={{
            type: 'bar',
            data: {
              labels: Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0')),
              datasets: [{ data: ins.hours, backgroundColor: palette.accent, borderRadius: 3 }],
            },
            options: {
              plugins: { legend: { display: false } },
              scales: {
                y: { grid: { color: palette.border }, beginAtZero: true },
                x: { grid: { display: false } },
              },
            } as any,
          }}
        />
      ) : (
        <p className="na">
          {t.ui.audience.hours}: {t.ui.na}
        </p>
      )}
      {ins.days ? (
        <>
          <div className="mini-h" style={{ marginTop: 8 }}>
            {t.ui.audience.days}
          </div>
          <DistBars items={ins.days.map((v, i) => ({ label: t.ui.days[i], value: v }))} limit={7} />
        </>
      ) : (
        <p className="na">
          {t.ui.audience.days}: {t.ui.na}
        </p>
      )}
      <p className="na">{t.ui.audience.tzNote}</p>
    </>
  ) : (
    <>
      <NA /> <Hint>{t.ui.audience.activeHint}</Hint>
    </>
  );

  /* ---------------- public data ---------------- */

  const noC = (
    <>
      <NA /> <Hint>{t.ui.audience.commentHint(t.ui.misc.noComments)}</Hint>
    </>
  );

  const heat =
    pub.n > 0 ? (
      <>
        <div className="heat-wrap">
          <HeatGrid
            cells={pub.heat}
            value={(c) => c}
            label={(_, v) => v || ''}
            tip={(_, v) => t.ui.audience.heatTip(f.f0(v))}
          />
        </div>
        <HeatLegend low={t.ui.audience.fewComments} high={t.ui.audience.manyComments} />
        <div className="split" style={{ marginTop: 12 }}>
          <div>
            <div className="mini-h">{t.ui.audience.activeDay}</div>
            <DistBars
              items={pub.dayTotals.map((v, i) => ({ label: t.ui.days[i], value: v }))}
              limit={7}
            />
          </div>
          <div>
            <div className="mini-h">{t.ui.audience.activeBlock}</div>
            <DistBars
              items={pub.blocks
                .filter((b) => b.n)
                .map((b) => ({ label: blockLabel(b.b), value: b.n }))}
              limit={8}
            />
          </div>
        </div>
        <p className="na" style={{ marginTop: 8 }}>
          {t.ui.audience.heatNote(f.f0(pub.n))}
        </p>
      </>
    ) : (
      noC
    );

  const sp = pub.speed;
  const speed = sp ? (
    <>
      <KeyValue label={t.ui.audience.medianDelay} value={<b><Duration seconds={sp.median} /></b>} />
      <KeyValue label={t.ui.audience.firstDelay} value={<b><Duration seconds={sp.firstMedian} /></b>} />
      <KeyValue label={t.ui.audience.within1h} value={<b>{f.f0(sp.within1h)}%</b>} />
      <KeyValue label={t.ui.audience.within24h} value={<b>{f.f0(sp.within24h)}%</b>} />
      <DistBars items={sp.buckets.filter((b) => b.value)} limit={5} />
      <p className="na">
        {t.ui.audience.speedNote(f.f0(sp.n), f.f0(sp.postsWithComments))}
      </p>
    </>
  ) : (
    noC
  );

  const r = pub.ratio;
  const p100 = r.per100;
  const ratio = (
    <>
      <div className="ratio">
        {(
          [
            ['likes', '100', r.likes],
            ['comments', f.f1(p100.comments), r.comments],
            ['saves', f.f1(p100.saves), r.saves],
            ['shares', f.f1(p100.shares), r.shares],
          ] as const
        ).map(([key, v, total], i) => (
          <Fragment key={key}>
            {i ? <span className="rsep">:</span> : null}
            <div>
              <div className="rv">{v == null ? '–' : key === 'likes' ? '100' : v}</div>
              <div className="rl">
                {key === 'comments'
                  ? t.ui.content.colComments
                  : key === 'saves'
                    ? t.ui.insights.saves
                    : key === 'shares'
                      ? t.ui.insights.shares
                      : t.ui.content.colLikes}
              </div>
              <div className="rt">{total == null ? t.ui.na : t.ui.audience.ratioTotal(f.f0(total))}</div>
            </div>
          </Fragment>
        ))}
      </div>
      <p className="na">
        {t.ui.audience.ratioNote}
        {r.reposts != null ? t.ui.audience.repostNote(f.f1(p100.reposts)) : ''}
      </p>
    </>
  );

  const types = pub.n ? (
    <>
      <DistBars
        items={pub.types.map((x) => ({ label: t.ui.commentTypes[x.key], value: x.value }))}
        limit={5}
      />
      <div className="exs">
        {pub.types
          .filter((x) => x.ex.length)
          .map((x) => (
            <div key={x.key}>
              <b>{t.ui.commentTypes[x.key]}:</b> {x.ex.map((e) => `“${e}”`).join(' · ')}
            </div>
          ))}
      </div>
    </>
  ) : (
    noC
  );

  const st = pub.sent;
  const stot = st.pos + st.neu + st.neg;
  const sentB = stot ? (
    <>
      <div className="stack">
        <span style={{ flex: st.pos, background: 'var(--good)' }} />
        <span style={{ flex: st.neu, background: 'var(--neutral)' }} />
        <span style={{ flex: st.neg, background: 'var(--bad)' }} />
      </div>
      <div className="legend-row">
        <span>
          <span className="sw" style={{ background: 'var(--good)' }} />
          {t.ui.audience.positive} <b>{f.f0((st.pos / stot) * 100)}%</b>
        </span>
        <span>
          <span className="sw" style={{ background: 'var(--neutral)' }} />
          {t.ui.audience.neutral} <b>{f.f0((st.neu / stot) * 100)}%</b>
        </span>
        <span>
          <span className="sw" style={{ background: 'var(--bad)' }} />
          {t.ui.audience.negative} <b>{f.f0((st.neg / stot) * 100)}%</b>
        </span>
      </div>
      <div className="exs">
        {pub.sentEx.pos.length ? (
          <div>
            <b>{t.ui.audience.positive}:</b> {pub.sentEx.pos.map((e) => `“${e}”`).join(' · ')}
          </div>
        ) : null}
        {pub.sentEx.neg.length ? (
          <div>
            <b>{t.ui.audience.negative}:</b> {pub.sentEx.neg.map((e) => `“${e}”`).join(' · ')}
          </div>
        ) : null}
      </div>
      <p className="na">{t.ui.audience.lexiconNote}</p>
    </>
  ) : (
    noC
  );

  const langs = pub.n ? (
    <>
      <DistBars items={pub.langs} raw label={(v) => t.ui.langs[v as keyof typeof t.ui.langs] ?? v} />
      <p className="na">{t.ui.audience.langNote}</p>
    </>
  ) : (
    noC
  );

  const reply = pub.n ? (
    <>
      <KeyValue label={t.ui.audience.replies(A.account)} value={<b>{f.f0(pub.ownReplies)}</b>} />
      <KeyValue label={t.ui.audience.replyPer100} value={<b>{f.f0(pub.replyPerAud)}</b>} />
      <p className="na">{t.ui.audience.replyNote}</p>
    </>
  ) : (
    noC
  );

  const formats = pub.formats.length ? (
    <>
      <div className="tbl-wrap">
        <table>
          <thead>
            <tr>
              <th>{t.ui.audience.colFormat}</th>
              <th className="n">{t.ui.content.colPosts}</th>
              <th className="n">{t.ui.audience.medScore(A.scoreLabel)}</th>
              <th className="n">{t.ui.content.colLikes}</th>
              <th className="n">{t.ui.content.colComments}</th>
              <th className="n">{t.ui.audience.colPer100}</th>
              <th className="n">{t.ui.content.colViews}</th>
              <th className="n">{t.ui.audience.colPos}</th>
            </tr>
          </thead>
          <tbody>
            {pub.formats.map((row) => (
              <tr key={row.type} className={pub.favFormat?.type === row.type ? 'hl' : undefined}>
                <td>
                  <span
                    className="sw"
                    style={{
                      background:
                        row.type === 'reel'
                          ? 'var(--s1)'
                          : row.type === 'carousel'
                            ? 'var(--s2)'
                            : 'var(--s3)',
                    }}
                  />
                  {t.ui.types[row.type]}
                  {pub.favFormat?.type === row.type ? (
                    <span className="badge b-great"> {t.ui.audience.fmtFav}</span>
                  ) : null}
                </td>
                <td className="n">{row.n}</td>
                <td className="n">
                  <b>{A.followers ? f.f2(row.medScore) + '%' : f.f0(row.medScore)}</b>
                </td>
                <td className="n">{f.f0(row.avgLikes)}</td>
                <td className="n">{f.f1(row.avgComments)}</td>
                <td className="n">{f.f1(row.c100)}</td>
                <td className="n">{row.avgViews != null ? f.f0(row.avgViews) : '–'}</td>
                <td className="n">{row.posPct != null ? f.f0(row.posPct) + '%' : '–'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pub.talkFormat && pub.favFormat && pub.talkFormat.type !== pub.favFormat.type ? (
        <p className="na">
          {t.ui.audience.talkNote(t.ui.types[pub.talkFormat.type], f.f1(pub.talkFormat.c100))}
        </p>
      ) : null}
    </>
  ) : (
    <NA />
  );

  const pillars = pub.pillars.length ? (
    <>
      <div className="tbl-wrap">
        <table>
          <thead>
            <tr>
              <th>{t.ui.audience.colTopic}</th>
              <th className="n">{t.ui.content.colPosts}</th>
              <th className="n">{t.ui.audience.colPillarShare}</th>
              <th className="n">{t.ui.audience.medScore(A.scoreLabel)}</th>
              <th className="n">{t.ui.content.colComments}</th>
              <th className="n">{t.ui.audience.colPer100}</th>
              <th className="n">{t.ui.audience.colPos}</th>
            </tr>
          </thead>
          <tbody>
            {pub.pillars.map((p) => (
              <tr key={p.key}>
                <td>{t.ui.pillars[p.key] ?? p.key}</td>
                <td className="n">{p.n}</td>
                <td className="n">{f.f0(p.share)}%</td>
                <td className="n">
                  <b>{A.followers ? f.f2(p.medScore) + '%' : f.f0(p.medScore)}</b>
                </td>
                <td className="n">{f.f1(p.avgComments)}</td>
                <td className="n">{f.f1(p.c100)}</td>
                <td className="n">{p.posPct != null ? f.f0(p.posPct) + '%' : '–'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="na">{t.ui.audience.pillarNote}</p>
    </>
  ) : (
    <NA />
  );

  const L = pub.loyal;
  const loyal = pub.n ? (
    <>
      <div className="kpis tight">
        <div className="kpi">
          <div className="l">{t.ui.audience.unique}</div>
          <div className="v">{f.f0(L.unique)}</div>
        </div>
        <div className="kpi">
          <div className="l">{t.ui.audience.repeat}</div>
          <div className="v">{f.f0(L.repeat)}</div>
          <div className="s">{L.repeatPct != null ? t.ui.audience.repeatPct(f.f0(L.repeatPct)) : ''}</div>
        </div>
        <div className="kpi">
          <div className="l">{t.ui.audience.fromRepeat}</div>
          <div className="v">{L.commentsFromRepeatPct != null ? f.f0(L.commentsFromRepeatPct) + '%' : '–'}</div>
        </div>
      </div>
      <p className="na" style={{ margin: '8px 0' }}>
        {t.ui.audience.rule(L.rule === 'multi' ? t.ui.audience.ruleMulti : t.ui.audience.ruleSingle)}
      </p>
      <div className="tbl-wrap scroll-y">
        <table>
          <thead>
            <tr>
              <th>{t.ui.audience.colAccount}</th>
              <th className="n">{t.ui.audience.colCount}</th>
              <th className="n">{t.ui.audience.colPostsN}</th>
              <th className="n">{t.ui.audience.colPosN}</th>
              <th className="n">{t.ui.audience.colNegN}</th>
              <th className="n">{t.ui.audience.colQN}</th>
              <th>{t.ui.audience.colLast}</th>
            </tr>
          </thead>
          <tbody>
            {pub.commenters.map((c) => (
              <tr key={c.user}>
                <td>
                  <a
                    href={`https://www.instagram.com/${encodeURIComponent(c.user)}/`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    @{c.user}
                  </a>
                  {c.repeat ? <span className="chip"> {t.ui.audience.loyalChip}</span> : null}
                </td>
                <td className="n">{c.n}</td>
                <td className="n">{c.posts}</td>
                <td className="n">{c.pos}</td>
                <td className="n">{c.neg}</td>
                <td className="n">{c.q}</td>
                <td style={{ whiteSpace: 'nowrap' }}>{c.last ? f.dDate(c.last) : '–'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button
        type="button"
        className="btn sm no-print"
        style={{ marginTop: 8 }}
        onClick={() => {
          download(`ig-${A.account}-commenters.csv`, commentersCsv(A, f), 'text/csv;charset=utf-8');
          toast(t.ui.audience.csvCommenters.replace('⬇ ', ''));
        }}
      >
        {t.ui.audience.csvCommenters}
      </button>
    </>
  ) : (
    noC
  );

  const I = pub.interest;
  const chips = (arr: { label: string; value: number }[], map?: (l: string) => string) =>
    arr.length ? (
      arr.map((x) => (
        <Chip key={x.label}>
          {map ? map(x.label) : x.label} · {f.f0(x.value)}
        </Chip>
      ))
    ) : (
      <NA />
    );

  const interest = (
    <>
      <div className="mini-h">{t.ui.audience.topicsResponded}</div>
      <p>
        {I.topics.length
          ? I.topics.map((x) => (
              <Chip key={x.key}>
                {t.ui.pillars[x.key] ?? x.key} · {A.followers ? f.f2(x.medScore) + '%' : f.f0(x.medScore)}
              </Chip>
            ))
          : <NA />}
      </p>
      <div className="mini-h">{t.ui.audience.commentThemes}</div>
      <p>{pub.n ? chips(I.commentThemes, (l) => t.ui.pillars[l] ?? l) : <NA />}</p>
      <div className="mini-h">{t.ui.audience.words}</div>
      <p>{pub.n ? chips(I.words) : <NA />}</p>
      <div className="mini-h">{t.ui.audience.emojis}</div>
      <p>{pub.n ? chips(I.emojis) : <NA />}</p>
      <div className="mini-h">{t.ui.audience.hashtags}</div>
      <p>
        {I.hashtags.length
          ? I.hashtags.map((x) => (
              <Chip key={x.tag}>
                #{x.tag} · {A.followers ? f.f2(x.med) + '%' : f.f0(x.med)}
              </Chip>
            ))
          : <NA />}
      </p>
    </>
  );

  return (
    <Section
      id="behavior"
      n={7}
      title={t.ui.audience.title}
      sub={t.ui.audience.sub(f.f0(pub.n), f.f0(pub.totalComments))}
    >
      <h3 className="subhead">
        {t.ui.audience.fromInsights} <SourceBadge src="ins" />
      </h3>
      {ins.any ? null : (
        <div className="card note">
          <NA text={t.ui.audience.noInsights} /> <Hint>{t.ui.audience.noInsightsHint}</Hint>
        </div>
      )}

      {ins.overview.length ? (
        <div className="grid g2" style={{ marginBottom: 12 }}>
          <Card
            title={
              t.ui.audience.overview +
              (ins.period ? ` (${f.dDate(ins.period.start)} – ${f.dDate(ins.period.end)})` : '')
            }
            src="ins"
          >
            {ins.overview.map((m) => (
              <KeyValue key={m.key} label={metricLabel(t, m.key)} value={<b>{f.f0(m.value)}</b>} />
            ))}
          </Card>
          <Card title={t.ui.audience.formatViews} src="ins">
            {ins.formatIns.length ? (
              <>
                <div className="tbl-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>{t.ui.audience.colFormat}</th>
                        <th className="n">{t.ui.audience.colViews}</th>
                        <th className="n">{t.ui.audience.colNonF}</th>
                        <th className="n">{t.ui.audience.colInteractions}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ins.formatIns.map((x) => (
                        <tr key={x.label}>
                          <td>{x.label}</td>
                          <td className="n">{x.views != null ? f.f0(x.views) : '–'}</td>
                          <td className="n">{x.views ? f.f0((x.nf / x.views) * 100) + '%' : '–'}</td>
                          <td className="n">{x.inter != null ? f.f0(x.inter) : '–'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="na">{t.ui.audience.formatNote}</p>
              </>
            ) : (
              <NA />
            )}
          </Card>
        </div>
      ) : null}

      {ins.topMedia.length ? (
        <div style={{ marginBottom: 12 }}>
          <Card title={t.ui.audience.topContent} src="ins">
            <div className="tbl-wrap">
              <table>
                <thead>
                  <tr>
                    <th>{t.ui.audience.colPost}</th>
                    <th>{t.ui.audience.colDate}</th>
                    <th>{t.ui.audience.colCaption}</th>
                    <th className="n">{t.ui.audience.colViews}</th>
                    <th className="n">{t.ui.audience.colInteracted}</th>
                  </tr>
                </thead>
                <tbody>
                  {ins.topMedia.map((m) => (
                    <tr key={m.id}>
                      <td>
                        {m.url ? (
                          <a href={m.url} target="_blank" rel="noopener noreferrer">
                            {m.code}
                          </a>
                        ) : (
                          m.id
                        )}{' '}
                        <span className="chip">
                          {m.type ? t.ui.types[m.type] : m.ptype ?? ''}
                        </span>
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>{f.dDate(m.t)}</td>
                      <td>
                        <div className="cap">{m.caption}</div>
                      </td>
                      <td className="n">{m.views != null ? f.f0(m.views) : '–'}</td>
                      <td className="n">{m.interacted != null ? f.f0(m.interacted) : '–'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      ) : null}

      <div className="grid g3">
        <Card title={t.ui.audience.demographics} src="ins" className="span2">
          {ins.hasDemo ? (
            <div className="mini-grid">
              {demoBlock(t.ui.audience.gender, ins.demo.gender, 'gender')}
              {demoBlock(t.ui.audience.age, ins.demo.age || ins.demo.ageGender)}
              {demoBlock(t.ui.audience.city, ins.demo.city)}
              {demoBlock(t.ui.audience.country, ins.demo.country)}
            </div>
          ) : (
            <>
              <NA /> <Hint>{t.ui.audience.demoHint}</Hint>
            </>
          )}
        </Card>
        <Card title={t.ui.audience.splitTitle} src="ins">
          {split}
        </Card>
        <Card title={t.ui.audience.traffic} src="ins">
          {ins.traffic ? (
            <DistBars
              items={ins.traffic}
              raw
              label={(v) => t.ui.dist.traffic[v] ?? v}
            />
          ) : (
            <>
              <NA /> <Hint>{t.ui.audience.trafficHint}</Hint>
            </>
          )}
        </Card>
        <Card title={t.ui.audience.watch} src="ins">
          {watch}
        </Card>
        <Card title={t.ui.audience.actions} src="ins">
          <KeyValue label={t.ui.audience.profileVisits} value={ins.profileVisits != null ? <b>{f.f0(ins.profileVisits)}</b> : <NA />} />
          <KeyValue label={t.ui.audience.follows} value={ins.follows != null ? <b>{f.f0(ins.follows)}</b> : <NA />} />
          <KeyValue label={t.ui.audience.linkClicks} value={ins.linkClicks != null ? <b>{f.f0(ins.linkClicks)}</b> : <NA />} />
        </Card>
        <Card title={t.ui.audience.active} src="ins" className={ins.activeGrid ? 'span-all' : ''}>
          {active}
        </Card>
      </div>

      <h3 className="subhead">
        {t.ui.audience.fromPublic} <SourceBadge src="pub" />
      </h3>
      <Card title={t.ui.audience.heatTitle} src="pub">
        {heat}
      </Card>
      <div className="grid g3" style={{ marginTop: 12 }}>
        <Card title={t.ui.audience.speed} src="pub">{speed}</Card>
        <Card title={t.ui.audience.ratio} src="pub">{ratio}</Card>
        <Card title={t.ui.audience.types} src="pub">{types}</Card>
        <Card title={t.ui.audience.sentiment} src="pub">{sentB}</Card>
        <Card title={t.ui.audience.languages} src="pub">{langs}</Card>
        <Card title={t.ui.audience.reply} src="pub">{reply}</Card>
      </div>
      <div className="grid g2" style={{ marginTop: 12 }}>
        <Card title={t.ui.audience.formats} src="pub">{formats}</Card>
        <Card title={t.ui.audience.pillars} src="pub">{pillars}</Card>
        <Card title={t.ui.audience.loyal} src="pub">{loyal}</Card>
        <Card title={t.ui.audience.interest} src="pub">{interest}</Card>
      </div>

      <div style={{ marginTop: 12 }}>
        <Card title={t.ui.audience.allComments(f.f0(pub.n))} src="pub">
          <CommentsTable />
        </Card>
      </div>

      <h3 className="subhead">{t.ui.audience.concl}</h3>
      <div className="card">
        {conclusions.length ? (
          <ol className="list-insights">
            {conclusions.map((c, i) => (
              <li key={i}>
                <Rich text={renderMsg(t, c.text)} />
                <span className="why">
                  <SourceBadge src={c.src ?? 'pub'} />
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <NA text={t.ui.audience.noConcl} />
        )}
      </div>
    </Section>
  );
}

function CommentsTable() {
  const { A, t, f } = useReport();
  const rows = A.aud.pub.rows;
  const MAXR = 1500;
  const [q, setQ] = useState('');
  const [type, setType] = useState('');
  const [sent, setSent] = useState('');
  const [lang, setLang] = useState('');

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return rows
      .filter(
        (c) =>
          (!s || (c.user + ' ' + c.text).toLowerCase().includes(s)) &&
          (!type || c.type === type) &&
          (!sent || c.sent === sent) &&
          (!lang || c.lang === lang),
      )
      .slice(0, MAXR);
  }, [rows, q, type, sent, lang]);

  if (!rows.length) {
    return (
      <>
        <NA /> <Hint>{t.ui.audience.commentHint(t.ui.misc.noComments)}</Hint>
      </>
    );
  }

  const sentLabel = { pos: t.ui.audience.positive, neu: t.ui.audience.neutral, neg: t.ui.audience.negative };

  return (
    <>
      <div className="filters no-print">
        <input
          type="search"
          className="btn"
          placeholder={t.ui.audience.search}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label={t.ui.audience.search}
        />
        <select className="btn" value={type} onChange={(e) => setType(e.target.value)} aria-label={t.ui.audience.colType}>
          <option value="">{t.ui.audience.allTypes}</option>
          {A.aud.pub.types.map((x) => (
            <option key={x.key} value={x.key}>
              {t.ui.commentTypes[x.key]}
            </option>
          ))}
        </select>
        <select className="btn" value={sent} onChange={(e) => setSent(e.target.value)} aria-label={t.ui.audience.colSent}>
          <option value="">{t.ui.audience.allSent}</option>
          {(['pos', 'neu', 'neg'] as const).map((k) => (
            <option key={k} value={k}>
              {sentLabel[k]}
            </option>
          ))}
        </select>
        <select className="btn" value={lang} onChange={(e) => setLang(e.target.value)} aria-label={t.ui.audience.colLang}>
          <option value="">{t.ui.audience.allLang}</option>
          {A.aud.pub.langs.map((l) => (
            <option key={l.label} value={l.label}>
              {t.ui.langs[l.label as keyof typeof t.ui.langs] ?? l.label}
            </option>
          ))}
        </select>
        <span className="na">{t.ui.audience.commentsCount(filtered.length)}</span>
      </div>
      <div className="tbl-wrap scroll-y tall">
        <table>
          <thead>
            <tr>
              <th>{t.ui.audience.colTime}</th>
              <th>{t.ui.audience.colAccount}</th>
              <th>{t.ui.audience.colComment}</th>
              <th>{t.ui.audience.colPost}</th>
              <th>{t.ui.audience.colType}</th>
              <th>{t.ui.audience.colSent}</th>
              <th>{t.ui.audience.colLang}</th>
              <th className="n">{t.ui.audience.colDelay}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id}>
                <td style={{ whiteSpace: 'nowrap' }}>{c.t ? f.dTime(c.t).replace(' WIB', '') : '–'}</td>
                <td>@{c.user}</td>
                <td className="ctext">{c.text}</td>
                <td>
                  {c.postUrl ? (
                    <a href={c.postUrl} target="_blank" rel="noopener noreferrer">
                      {c.code}
                    </a>
                  ) : (
                    '–'
                  )}
                </td>
                <td>{t.ui.commentTypes[c.type]}</td>
                <td>
                  <span
                    className="sw"
                    style={{
                      background:
                        c.sent === 'pos' ? 'var(--good)' : c.sent === 'neg' ? 'var(--bad)' : 'var(--neutral)',
                    }}
                  />
                  {sentLabel[c.sent]}
                </td>
                <td>{t.ui.langs[c.lang]}</td>
                <td className="n">
                  <Duration seconds={c.delay} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length > MAXR ? (
        <p className="na">{t.ui.audience.showingMax(MAXR, rows.length)}</p>
      ) : null}
    </>
  );
}
