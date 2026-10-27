'use client';

import { useReport } from '../ReportContext';
import { Kpi, Section } from './primitives';

export function SummarySection() {
  const { A, t, f, mode } = useReport();
  const P = A.profile;
  const S = A.summary;
  const initial = (A.account || '?')[0].toUpperCase();

  return (
    <Section
      id="ringkasan"
      n={1}
      title={t.ui.summary.title}
      sub={t.ui.summary.sub(f.dDateMs(A.captureTs), f.dDate(S.from), f.dDate(S.to))}
    >
      <div className="card" style={{ marginBottom: 12 }}>
        <div className="profile">
          <div className="avatar">{initial}</div>
          <div className="meta">
            <div className="name">
              @{A.account}{' '}
              {P.verified ? <span className="badge b-good">{t.ui.summary.verified}</span> : null}{' '}
              <span className={`badge ${mode === 'owned' ? 'b-great' : 'b-est'}`}>
                {mode === 'owned' ? t.ui.mode.ownedBadge : t.ui.mode.osintBadge}
              </span>
            </div>
            <div style={{ color: 'var(--text-2)' }}>
              {P.fullName}
              {P.category ? (
                <>
                  {' '}
                  · <span className="chip">{P.category}</span>
                </>
              ) : null}
            </div>
            {P.bio ? <div className="bio">{P.bio}</div> : null}
            <div style={{ marginTop: 6 }}>
              <a
                href={`https://www.instagram.com/${encodeURIComponent(A.account)}/`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {t.ui.summary.openProfile}
              </a>
            </div>
          </div>
          <div className="split" style={{ flex: '0 1 360px' }}>
            <Kpi label={t.ui.summary.followers} value={f.f0(P.followers)} />
            <Kpi label={t.ui.summary.following} value={f.f0(P.following)} />
            <Kpi
              label={t.ui.summary.totalPosts}
              value={f.f0(P.mediaCount)}
              sub={t.ui.summary.analyzedN(S.n)}
            />
          </div>
        </div>
      </div>

      <div className="kpis">
        <Kpi
          label={t.ui.summary.avgER}
          value={S.avgER != null ? f.f2(S.avgER) + '%' : '–'}
          sub={
            S.medER != null ? (
              <>
                {t.ui.summary.median(f.f2(S.medER))} ·{' '}
                <span className={`badge b-${S.label?.key ?? 'na'}`}>
                  {S.label ? t.ui.er.level[S.label.key] : t.ui.naShort}
                </span>
              </>
            ) : (
              t.ui.summary.needFollowers
            )
          }
        />
        <Kpi label={t.ui.summary.avgLikes} value={f.f0(S.avgLikes)} />
        <Kpi label={t.ui.summary.avgComments} value={f.f1(S.avgComments)} />
        <Kpi
          label={t.ui.summary.avgViews}
          value={S.viewsN ? f.f0(S.avgViews) : '–'}
          sub={S.viewsN ? t.ui.summary.videoN(S.viewsN) : t.ui.summary.noViews}
        />
        <Kpi
          label={t.ui.summary.freq}
          value={
            S.freqWeek != null ? (
              <>
                {f.f1(S.freqWeek)}
                <span style={{ fontSize: 13, fontWeight: 500 }}>{t.ui.summary.perWeek}</span>
              </>
            ) : (
              '–'
            )
          }
          sub={t.ui.summary.freqSub(S.last30)}
        />
      </div>
    </Section>
  );
}
