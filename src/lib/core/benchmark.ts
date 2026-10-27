import { isNum } from './util';

export type TierKey = 'nano' | 'micro' | 'mid' | 'macro';
export type LevelKey = 'low' | 'avg' | 'good' | 'great';

/** Follower-count buckets with industry-typical ER bands (heuristic). */
export function tierOf(F: number | null): { key: TierKey; t: number[] } | null {
  if (!isNum(F)) return null;
  if (F < 10000) return { key: 'nano', t: [1, 3, 6] };
  if (F < 100000) return { key: 'micro', t: [0.8, 2, 4] };
  if (F < 1000000) return { key: 'mid', t: [0.5, 1.5, 3] };
  return { key: 'macro', t: [0.3, 1, 2] };
}

export function erLabel(er: number | null, tier: { t: number[] } | null): { key: LevelKey } | null {
  if (!isNum(er) || !tier) return null;
  const [a, b, c] = tier.t;
  if (er < a) return { key: 'low' };
  if (er < b) return { key: 'avg' };
  if (er < c) return { key: 'good' };
  return { key: 'great' };
}
