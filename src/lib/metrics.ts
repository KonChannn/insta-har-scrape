import type { AnalyzedPost } from '@/lib/core/types';
import type { Dict } from '@/lib/i18n';

const isNum = (v: unknown): v is number => typeof v === 'number' && isFinite(v);

/** Human label for an Instagram metric key, with a readable fallback. */
export function metricLabel(t: Dict, key: string): string {
  const map: Record<string, string> = {
    views_current_period: t.ui.insights.views,
    reach_current_period: t.ui.insights.accountsReached,
    viewers_current_period: t.ui.insights.viewers,
    fb_views_current_period: t.ui.insights.fbViews,
    total_interactions: t.ui.insights.totalInteractions,
    engaged_accounts: t.ui.insights.engagedAccounts,
    profile_visits_count: t.ui.audience.profileVisits,
    profile_visits: t.ui.audience.profileVisits,
    bio_link_clicks: t.ui.audience.linkClicks,
    link_clicks: t.ui.audience.linkClicks,
    contact_button_clicks: t.ui.insights.contactClicks,
    reach: t.ui.insights.reach,
    impressions: t.ui.insights.impressions,
    saves: t.ui.insights.saves,
    shares: t.ui.insights.shares,
    follows: t.ui.audience.follows,
    accounts_engaged: t.ui.insights.engagedAccounts,
    skip_rate: t.ui.postinsights.colSkip,
    avgWatch: t.ui.postinsights.colAvgWatch,
    totalWatch: t.ui.postinsights.colTotalWatch,
  };
  if (map[key]) return map[key];
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Instagram sometimes returns 0.42 and sometimes 42. Normalise to percent. */
export function asPercent(v: number | null | undefined): number | null {
  if (!isNum(v)) return null;
  return v <= 1 ? v * 100 : v;
}

/** Views ÷ reach, as a percentage. Optionally pass the preferred views value. */
export function viewRate(
  p: Pick<AnalyzedPost, 'views' | 'impressions' | 'reach'>,
  viewsOverride?: number | null,
): number | null {
  const views = viewsOverride ?? p.views ?? p.impressions;
  if (!isNum(views) || !isNum(p.reach) || p.reach <= 0) return null;
  return (views / p.reach) * 100;
}

/** Share of the video actually watched (clamped to 0–100). */
export function watchedPct(p: Pick<AnalyzedPost, 'avgWatch' | 'duration'>): number | null {  if (!isNum(p.avgWatch) || !isNum(p.duration) || p.duration <= 0) return null;
  return Math.min(100, Math.max(0, (p.avgWatch / p.duration) * 100));
}

/** Estimated bounce: the part of the video the average viewer did not watch. */
export function bouncePct(p: Pick<AnalyzedPost, 'avgWatch' | 'duration'>): number | null {
  const w = watchedPct(p);
  return w == null ? null : 100 - w;
}

/** Instagram's reported skip rate, normalised to percent. */
export function skipPct(p: Pick<AnalyzedPost, 'skipRate'>): number | null {
  return asPercent(p.skipRate);
}
