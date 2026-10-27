/** Small numeric helpers shared by the whole engine. */

export const isNum = (v: unknown): v is number => typeof v === 'number' && isFinite(v);

/**
 * Instagram is inconsistent: the same metric may arrive as a number, a numeric
 * string, or `{ count: n }`. Return the first usable value, else null.
 */
export function num(...vals: unknown[]): number | null {
  for (const v of vals) {
    if (isNum(v)) return v;
    if (typeof v === 'string' && /^\d+$/.test(v)) return Number(v);
    if (v && typeof v === 'object' && isNum((v as { count?: unknown }).count)) {
      return (v as { count: number }).count;
    }
  }
  return null;
}

export const mean = (a: number[]): number | null =>
  a.length ? a.reduce((s, x) => s + x, 0) / a.length : null;

export const median = (a: number[]): number | null => {
  if (!a.length) return null;
  const s = [...a].sort((x, y) => x - y);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/** Map then keep only finite numbers. */
export function vals<T>(arr: T[], f: (x: T) => unknown): number[] {
  return arr.map(f).filter(isNum);
}

export function sum(arr: number[]): number {
  return arr.reduce((s, x) => s + x, 0);
}

/** Percentage helper that tolerates a zero denominator. */
export function pct(part: number, total: number): number {
  return total ? Math.round((part / total) * 100) : 0;
}
