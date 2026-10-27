'use client';

import { useReport } from '../ReportContext';
import type { MouseEvent } from 'react';
import { AudienceSection } from './AudienceSection';
import { CompareSection } from './CompareSection';
import { ConclusionSection } from './ConclusionSection';
import { ContentSection } from './ContentSection';
import { DebugSection } from './DebugSection';
import { EngagementSection } from './EngagementSection';
import { GrowthSection } from './GrowthSection';
import { InsightsSection } from './InsightsSection';
import { PostInsightsSection } from './PostInsightsSection';
import { SummarySection } from './SummarySection';
import { TimingSection } from './TimingSection';
import { WorksSection } from './WorksSection';

export function Dashboard() {
  const { A, t, f, mode } = useReport();
  const owned = mode === 'owned';

  const nav: [string, string][] = [
    ['ringkasan', t.ui.nav.summary],
    ['er', t.ui.nav.er],
    ...(owned ? ([['postinsights', t.ui.nav.posts]] as [string, string][]) : []),
    ['konten', t.ui.nav.content],
    ['compare', t.ui.nav.compare],
    ['waktu', t.ui.nav.timing],
    ['behavior', t.ui.nav.behavior],
    ...(owned ? ([['insights', t.ui.nav.insights]] as [string, string][]) : []),
    ['growth', t.ui.nav.growth],
    ['works', t.ui.nav.works],
    ['kesimpulan', t.ui.nav.conclusion],
  ];

  const go = (e: MouseEvent, id: string) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + scrollY - 70, behavior: 'smooth' });
  };

  return (
    <>
      <div className="print-only" style={{ margin: '8px 0 14px' }}>
        <h1 style={{ margin: 0 }}>Instagram @{A.account}</h1>
        <div style={{ color: '#555' }}>
          {t.ui.printMeta(A.account, f.dDateMs(A.captureTs), A.summary.n)}
        </div>
      </div>

      <nav className="sections no-print" aria-label={t.ui.misc.tabs}>
        {nav.map(([id, label]) => (
          <a key={id} href={`#${id}`} onClick={(e) => go(e, id)}>
            {label}
          </a>
        ))}
      </nav>

      <SummarySection />
      <EngagementSection />
      {owned ? <PostInsightsSection /> : null}
      <ContentSection />
      <CompareSection />
      <TimingSection />
      <AudienceSection />
      {owned ? <InsightsSection /> : null}
      <GrowthSection />
      <WorksSection />
      <ConclusionSection />
      <DebugSection />

      <div className="foot">
        {t.ui.footer} · {f.dDateMs(Date.now())}
      </div>
    </>
  );
}
