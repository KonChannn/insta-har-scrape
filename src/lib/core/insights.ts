import {
  DAY_ABBR,
  DAY_NAMES,
  DIST_LABEL_KEYS,
  DIST_VAL_KEYS,
  INSIGHT_KEYS,
  PERIOD_METRIC_MAP,
  TRAFFIC_KEY,
} from './constants';
import { isNum } from './util';
import type {
  AnyRecord,
  BreakdownItem,
  DistItem,
  FollowerSplit,
  IngestContext,
  InsightsState,
  PostRecord,
  Store,
} from './types';

/** Pull a number out of the many wrappers Instagram uses. */
export function insightNum(v: unknown): number | null {
  if (isNum(v)) return v;
  if (v && typeof v === 'object') {
    const o = v as AnyRecord;
    for (const k of ['value', 'count', 'total', 'total_value', 'metric_value']) {
      if (isNum(o[k])) return o[k];
      if (o[k] && typeof o[k] === 'object' && isNum(o[k].value)) return o[k].value;
    }
  }
  return null;
}

/** Best-effort parse of a 24-slot hourly series. */
export function toHours(v: unknown): number[] | null {
  if (Array.isArray(v) && v.length === 24 && v.every((x) => insightNum(x) != null)) {
    return v.map((x) => insightNum(x) as number);
  }
  if (
    Array.isArray(v) &&
    v.length >= 20 &&
    v.every((x) => x && typeof x === 'object')
  ) {
    const out = new Array(24).fill(0);
    let ok = 0;
    for (const x of v as AnyRecord[]) {
      const h = insightNum(x.hour ?? x.key ?? (x.label != null ? parseInt(String(x.label), 10) : null));
      const val = insightNum(x.value != null ? x.value : x.count);
      if (h != null && h >= 0 && h < 24 && val != null) {
        out[h] += val;
        ok++;
      }
    }
    return ok >= 20 ? out : null;
  }
  if (v && typeof v === 'object' && !Array.isArray(v)) {
    const o = v as AnyRecord;
    const ks = Object.keys(o).filter((k) => /^\d{1,2}$/.test(k));
    if (ks.length === 24) {
      return Array.from({ length: 24 }, (_, i) => insightNum(o[i]) ?? 0);
    }
  }
  return null;
}

export function toDays(v: unknown): number[] | null {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null;
  const o = v as AnyRecord;
  const out: (number | null)[] = new Array(7).fill(null);
  for (const k in o) {
    const i = DAY_NAMES.findIndex((d) => d.includes(k.toLowerCase()));
    if (i >= 0) out[i] = insightNum(o[k]);
  }
  return out.filter((x) => x != null).length >= 5 ? out.map((x) => x ?? 0) : null;
}

export function toSeries(v: unknown): number[] | null {
  if (!Array.isArray(v) || v.length < 3) return null;
  const s = v.map((x) => insightNum(x) ?? (x && typeof x === 'object' ? insightNum(x.retention ?? x.ratio) : null));
  return s.every((x) => x != null) ? (s as number[]) : null;
}

export function deepTotal(v: unknown): number | null {
  if (isNum(v)) return v;
  if (Array.isArray(v)) {
    for (const x of v) {
      const r = deepTotal(x);
      if (r != null) return r;
    }
    return null;
  }
  if (v && typeof v === 'object') {
    for (const k of ['total_value', 'value', 'results']) {
      if (k in (v as AnyRecord)) {
        const r = deepTotal((v as AnyRecord)[k]);
        if (r != null) return r;
      }
    }
  }
  return null;
}

function ensureMediaMetrics(store: Store, hint: string): AnyRecord {
  let mm = store.insights.mediaMetrics.get(hint);
  if (!mm) {
    mm = {};
    store.insights.mediaMetrics.set(hint, mm);
  }
  return mm;
}

/** Resolve the media pk from the request variables to a known post. */
function resolvedPost(store: Store, ctx: IngestContext): PostRecord | null {
  if (!ctx.mediaHint) return null;
  const code = store.mediaPkToCode.get(ctx.mediaHint);
  return code ? store.posts.get(code) ?? null : null;
}

/**
 * Where a metric should be written: the current post, the post identified by
 * the request's `media_id`, or a pending bucket keyed by that media pk.
 */
function targetFor(store: Store, media: PostRecord | null, ctx: IngestContext): AnyRecord | null {
  if (media) return media;
  if (!ctx.mediaHint) return null;
  return resolvedPost(store, ctx) ?? ensureMediaMetrics(store, ctx.mediaHint);
}

/**
 * Professional Dashboard shape:
 * `{ metric: { results: [{ value, dimension_values }] } }`
 *
 * When the response is scoped to a single media id, scalar results are written
 * onto that post (or onto `mediaMetrics` until the post is known) instead of
 * overwriting the account-level metrics.
 */
export function parseResultSets(
  store: Store,
  o: AnyRecord,
  ctx: IngestContext,
  media: PostRecord | null = null,
): void {
  const I = store.insights;
  const target = targetFor(store, media, ctx);
  let found = 0;
  for (const k in o) {
    const node = o[k];
    const rs: AnyRecord[] | null =
      node && typeof node === 'object' && Array.isArray(node.results) ? node.results : null;
    if (!rs) continue;
    const val = (x: AnyRecord) => (x && typeof x === 'object' ? insightNum(x.value) ?? insightNum(x.total_value) : null);
    const dims = rs.filter((x) => x && Array.isArray(x.dimension_values) && x.dimension_values.length);
    if (!dims.length) {
      const v = rs.length ? val(rs[0]) : null;
      if (v != null) {
        if (target) {
          const norm = PERIOD_METRIC_MAP[k] ?? INSIGHT_KEYS[k] ?? k;
          target['ins_' + norm] = v;
        } else {
          I.metrics[k] = v;
        }
        found++;
      }
      continue;
    }
    // Per-post responses should not pollute the account-level breakdowns.
    if (target) continue;
    I.breakdowns[k] = dims
      .map((x) => ({ dims: x.dimension_values.map(String), value: val(x) }))
      .filter((x) => x.value != null) as BreakdownItem[];
    found++;
  }
  if (found) {
    ctx.q.insights += found;
    const v = ctx.vars || {};
    if (isNum(v.currentPeriodStart) && isNum(v.currentPeriodEnd)) {
      I.period = { start: v.currentPeriodStart, end: v.currentPeriodEnd };
    }
  }
}

/** "Top content" rows emitted by the account insights query. */
export function addTopMedia(store: Store, o: AnyRecord, ctx: IngestContext): void {
  const id = String(o.instagram_media_id);
  const e: import('./types').TopMediaRecord = store.insights.topMedia.get(id) || {
    id,
    t: insightNum(o.creation_time),
    ptype: o.instagram_media_product_type || null,
  };
  for (const k in o) {
    if (/views_count/i.test(k)) {
      const v = deepTotal(o[k]);
      if (v != null) e.views = v;
    } else if (/interact/i.test(k)) {
      const v = deepTotal(o[k]);
      if (v != null) e.interacted = v;
    } else if (/reach/i.test(k)) {
      const v = deepTotal(o[k]);
      if (v != null) e.reach = v;
    }
  }
  store.insights.topMedia.set(id, e);
  ctx.q.insights++;
}

/** Hours between the given IANA zone and UTC, for a specific instant. */
export function tzOffsetHours(tz: string, ms: number): number {
  try {
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat('en-US', {
        timeZone: tz,
        hourCycle: 'h23',
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
      })
        .formatToParts(new Date(ms))
        .map((x) => [x.type, x.value]),
    );
    return Math.round(
      (Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute) - ms) / 3600000,
    );
  } catch {
    return -8;
  }
}

/** Canonical, locale-neutral labels for known dimensions. */
export function normalizeLabel(kind: string | null, label: string): string {
  const l = String(label)
    .toLowerCase()
    .replace(/_(count|value|reach|impressions|pct|percentage)$/, '');
  if (kind === 'gender') {
    if (/^(f|female|perempuan|wanita|women)$/.test(l)) return 'female';
    if (/^(m|male|laki-laki|pria|men)$/.test(l)) return 'male';
    if (/^(u|unknown)$/.test(l)) return 'unknown';
    return label;
  }
  if (kind === 'traffic') {
    const map: Record<string, string> = {
      explore: 'explore',
      home: 'home',
      feed: 'home',
      home_feed: 'home',
      reels: 'reels',
      reels_tab: 'reels',
      clips: 'reels',
      hashtag: 'hashtag',
      hashtags: 'hashtag',
      profile: 'profile',
      search: 'search',
      stories: 'stories',
      story: 'stories',
      other: 'other',
      others: 'other',
    };
    return map[l] || label;
  }
  return label;
}

export function toDist(v: unknown): DistItem[] | null {
  const out: DistItem[] = [];
  if (Array.isArray(v)) {
    for (const item of v) {
      if (!item || typeof item !== 'object') return null;
      const x = item as AnyRecord;
      let label: string | null = null;
      if (Array.isArray(x.dimension_values)) label = x.dimension_values.join(' · ');
      else {
        for (const k of DIST_LABEL_KEYS) {
          if ((typeof x[k] === 'string' && x[k]) || (typeof x[k] === 'number' && k === 'key')) {
            label = String(x[k]);
            break;
          }
        }
      }
      let val: number | null = null;
      for (const k of DIST_VAL_KEYS) {
        val = insightNum(x[k]);
        if (val != null) break;
      }
      if (label == null || val == null) return null;
      out.push({ label, value: val });
    }
  } else if (v && typeof v === 'object') {
    const o = v as AnyRecord;
    const keys = Object.keys(o).filter(
      (k) => !/^(__typename|id|pk|count|total|name|title|description|period|end_time)$/.test(k),
    );
    for (const k of keys) {
      const val = insightNum(o[k]);
      if (val != null) out.push({ label: k, value: val });
    }
    if (out.length < keys.length * 0.7) return null;
  }
  return out.length >= 2 ? out : null;
}

export function distKind(name: string | null | undefined): string | null {
  const n = String(name || '').toLowerCase();
  if (/follow(er)?_?type|follower_vs|non_?follower/.test(n)) return 'follow';
  if (/gender|sex/.test(n) && /(^|[^a-z])age/.test(n)) return 'ageGender';
  if (/gender|sex/.test(n)) return 'gender';
  if (/(^|[^a-z])ages?([^a-z]|$)|age_?(range|group|bucket)/.test(n)) return 'age';
  if (/cit(y|ies)|kota/.test(n)) return 'city';
  if (/countr|negara/.test(n)) return 'country';
  if (/source|surface|traffic|discovery|media_product_type/.test(n)) return 'traffic';
  return null;
}

export function mergeDist(a: DistItem[] | null | undefined, b: DistItem[]): DistItem[] {
  const m = new Map((a || []).map((x) => [x.label, x.value]));
  for (const x of b) m.set(x.label, (m.get(x.label) || 0) + x.value);
  return [...m.entries()].map(([label, value]) => ({ label, value }));
}

export function addSplit(I: InsightsState, f: number, nf: number): void {
  const s: FollowerSplit = I.followerSplit || { followers: 0, nonFollowers: 0, n: 0 };
  s.followers += f;
  s.nonFollowers += nf;
  s.n++;
  I.followerSplit = s;
}

export function assignDist(store: Store, name: string, dist: DistItem[], ctx: IngestContext): void {
  const kind = distKind(name);
  if (!kind) return;
  const I = store.insights;
  if (kind === 'follow') {
    const f = dist.find((x) => /follow/i.test(x.label) && !/non/i.test(x.label));
    const nf = dist.find((x) => /non/i.test(x.label));
    if (f && nf) addSplit(I, f.value, nf.value);
  } else if (kind === 'traffic') {
    I.traffic = mergeDist(
      I.traffic,
      dist.map((x) => ({ ...x, label: normalizeLabel('traffic', x.label) })),
    );
  } else {
    if (kind === 'gender') dist = dist.map((x) => ({ ...x, label: normalizeLabel('gender', x.label) }));
    const tot = (d: DistItem[] | undefined) => (d || []).reduce((s, x) => s + x.value, 0);
    if (!I.demo[kind] || tot(dist) > tot(I.demo[kind])) I.demo[kind] = dist;
  }
  ctx.q.insights++;
}

/** Collect a metric-looking field on the current object (or current post). */
export function collectInsights(
  store: Store,
  o: AnyRecord,
  ctx: IngestContext,
  media: PostRecord | null,
  key: string | null,
): void {
  const m = media ?? resolvedPost(store, ctx);
  const target = targetFor(store, media, ctx);
  let found = 0;
  for (const k in o) {
    const norm = INSIGHT_KEYS[k];
    if (!norm) continue;
    // `saved`/`shares` on a media node are often booleans; only accept numbers.
    const v = insightNum(o[k]);
    if (v == null) continue;
    if (m && !/insight|metric/i.test(key || '') && (norm === 'saves' || norm === 'shares')) {
      if (m['ins_' + norm] == null || ctx.ts >= m._ts) m['ins_' + norm] = v;
    } else if (target) {
      target['ins_' + norm] = v;
    } else {
      const a = store.insights.account;
      if (a[norm] == null || v > a[norm]) a[norm] = v;
    }
    found++;
  }
  if (found) ctx.q.insights++;
  collectAudienceInsights(store, o, ctx, m, key);

  // online / active hour arrays (best effort)
  for (const k in o) {
    if (!/online|active.*hour|hourly/i.test(k)) continue;
    const hrs = toHours(o[k]);
    if (hrs) {
      store.insights.audienceHours = hrs;
      ctx.q.insights++;
    }
  }
  if (
    /^(gender|genders|age|ages|age_range|top_cities|top_countries|cities|countries|follower_demographics|audience_[a-z_]+)$/i.test(
      key || '',
    ) &&
    store.insights.audienceRaw.length < 12
  ) {
    try {
      store.insights.audienceRaw.push({ key: key || '', value: JSON.stringify(o).slice(0, 400) });
    } catch {
      /* ignore circular payloads */
    }
  }
}

export function collectAudienceInsights(
  store: Store,
  o: AnyRecord,
  ctx: IngestContext,
  media: PostRecord | null,
  key: string | null,
): void {
  const I = store.insights;
  parseResultSets(store, o, ctx, media);
  const target = targetFor(store, media, ctx);

  if (Array.isArray(o.breakdowns)) {
    for (const b of o.breakdowns) {
      if (!b || !Array.isArray(b.results)) continue;
      const dist = toDist(b.results);
      if (dist) assignDist(store, (b.dimension_keys || []).join('_') + '_' + (o.name || key || ''), dist, ctx);
    }
  }

  const keys = Object.keys(o);
  for (const k of keys) {
    const v = o[k];
    if (v && typeof v === 'object' && distKind(k)) {
      const dist = toDist(v);
      if (dist) assignDist(store, k, dist, ctx);
    }
    if (/online|active/i.test(k)) {
      const d = toDays(v);
      if (d) {
        I.audienceDays = d;
        ctx.q.insights++;
      }
    }
    const setM = (name: string, val: number | number[] | null) => {
      if (val == null) return;
      if (target) target['ins_' + name] = val;
      else I.account[name] = val as number;
      ctx.q.insights++;
    };
    if (/^(avg|average)_?(watch|view)_?(time|duration)|^ig_reels_avg_watch_time$|^avg_time_watched$/i.test(k))
      setM('avgWatch', insightNum(v));
    else if (/^total_?(watch|view)_?time|^ig_reels_video_view_total_time$|^total_time_watched$/i.test(k))
      setM('totalWatch', insightNum(v));
    else if (/retention/i.test(k)) setM('retention', toSeries(v));
  }

  const nfKey = ctx.mediaHint ? null : keys.find((k) => /non_?follower/i.test(k) && insightNum(o[k]) != null);
  if (nfKey && distKind(key) !== 'follow') {
    const fKey = keys.find((k) => /follower/i.test(k) && !/non|count/i.test(k) && insightNum(o[k]) != null);
    if (fKey) {
      addSplit(I, insightNum(o[fKey]) as number, insightNum(o[nfKey]) as number);
      ctx.q.insights++;
    }
  }

  const trKeys = ctx.mediaHint ? [] : keys.filter((k) => TRAFFIC_KEY.test(k) && insightNum(o[k]) != null);
  if (trKeys.length >= 3 && distKind(key) !== 'traffic') {
    I.traffic = mergeDist(
      I.traffic,
      trKeys.map((k) => ({ label: normalizeLabel('traffic', k), value: insightNum(o[k]) as number })),
    );
    ctx.q.insights++;
  }
}

export { DAY_ABBR, MEDIA_PT } from './constants';
