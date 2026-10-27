import { DAY_ABBR, MEDIA_PT } from './constants';
import { normalizeLabel, toDist, distKind, mergeDist, tzOffsetHours } from './insights';
import { STOP, classifyComment, detectLang, jkt, pillarsOf, sentiment } from './text';
import { isNum, mean, median, sum, vals } from './util';
import type {
  AnalyzedPost,
  AudienceCommentRow,
  AudienceInsights,
  CommentRecord,
  Conclusion,
  ConcludeCtx,
  DistItem,
  PostType,
  PublicAudience,
  Sentiment,
  Store,
} from './types';
import { audienceConclusions } from './conclude';

type CommentWithCode = CommentRecord & { code: string | null };

const DAYS_LEN = 7;

function countBy<T>(arr: T[], f: (x: T) => string): DistItem[] {
  const m = new Map<string, number>();
  for (const x of arr) {
    const k = f(x);
    m.set(k, (m.get(k) || 0) + 1);
  }
  return [...m.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
}

const top = (m: Map<string, number>, k: number): DistItem[] =>
  [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, k).map(([label, value]) => ({ label, value }));

export function audienceOf(
  store: Store,
  account: string,
  posts: AnalyzedPost[],
  audComments: CommentWithCode[],
  ownComments: CommentRecord[],
  F: number | null,
  score: (p: AnalyzedPost) => number,
  ctx: ConcludeCtx,
): { ins: AudienceInsights; pub: PublicAudience; conclusions: Conclusion[] } {
  const I = store.insights;
  const sumOf = (f: (p: AnalyzedPost) => number | null): number | null => {
    const v = vals(posts, f);
    return v.length ? sum(v) : null;
  };

  /* ---------------------------------------------------------------- */
  /* A. Insights                                                       */
  /* ---------------------------------------------------------------- */

  const byCodeAll = new Map(posts.map((p) => [p.code, p]));
  const watch = vals(posts, (p) => p.avgWatch);
  const retPost = posts.find((p) => Array.isArray(p.retention));
  const M = I.metrics;
  const BD = I.breakdowns;
  const metric = (re: RegExp): number | null => {
    const k = Object.keys(M).find((x) => re.test(x));
    return k ? M[k] : null;
  };
  const bdKey = (re: RegExp): string | undefined => Object.keys(BD).find((k) => re.test(k));

  const splitOf = (k?: string) => {
    if (!k) return null;
    const g = (d: string) => BD[k].filter((x) => x.dims[0] === d).reduce((s, x) => s + x.value, 0);
    const f = g('1');
    const nf = g('2');
    return f || nf ? { followers: f, nonFollowers: nf, unknown: g('0') } : null;
  };
  const viewsSplit = splitOf(bdKey(/(views|reach).*follow_type$/));
  const interSplit = splitOf(bdKey(/interact.*follow_type$/));

  const fm = new Map<string, { label: string; views: number | null; f: number; nf: number; inter: number | null }>();
  const fmEntry = (code: string) => {
    const label = MEDIA_PT[code] || `#${code}`;
    const e = fm.get(label) || { label, views: null as number | null, f: 0, nf: 0, inter: null as number | null };
    fm.set(label, e);
    return e;
  };
  const mfK = bdKey(/media_and_follow/);
  if (mfK) {
    for (const x of BD[mfK]) {
      const e = fmEntry(x.dims[0]);
      e.views = (e.views || 0) + x.value;
      if (x.dims[1] === '1') e.f += x.value;
      if (x.dims[1] === '2') e.nf += x.value;
    }
  }
  const imK = bdKey(/interactions_by_media_type/);
  if (imK) {
    for (const x of BD[imK]) {
      const e = fmEntry(x.dims[0]);
      e.inter = (e.inter || 0) + x.value;
    }
  }
  const formatIns = [...fm.values()].sort(
    (a, b) => (b.views || 0) - (a.views || 0) || (b.inter || 0) - (a.inter || 0),
  );

  // Active hours arrive as 3-hour buckets in Pacific time; shift to WIB.
  let activeGrid: number[][] | null = null;
  let tzShift: number | null = null;
  const hK = bdKey(/hourly|online_followers/);
  if (hK) {
    tzShift = 7 - tzOffsetHours('America/Los_Angeles', store.captureTs || Date.now());
    activeGrid = Array.from({ length: DAYS_LEN }, () => new Array(24).fill(0));
    for (const x of BD[hK]) {
      const d = DAY_ABBR[String(x.dims[0]).slice(0, 3).toLowerCase()];
      const mm = /^(\d+)-(\d+)$/.exec(x.dims[1] || '');
      if (d == null || !mm) continue;
      for (let h = +mm[1]; h <= +mm[2]; h++) {
        const abs = ((d * 24 + h + tzShift) % 168 + 168) % 168;
        activeGrid[Math.floor(abs / 24)][abs % 24] = x.value;
      }
    }
  }

  // Demographics from single-dimension breakdowns.
  for (const k in BD) {
    const kind = distKind(k);
    if (!kind || kind === 'follow' || kind === 'traffic' || BD[k].some((x) => x.dims.length !== 1)) continue;
    const dist = BD[k].map((x) => ({
      label: kind === 'gender' ? normalizeLabel('gender', x.dims[0]) : x.dims[0],
      value: x.value,
    }));
    if (!I.demo[kind]) I.demo[kind] = mergeDist([], dist);
  }

  const overview = Object.keys(M)
    .filter((k) => k !== 'ccp_views_current_period')
    .map((k) => ({ key: k, label: k, value: M[k] }));

  const topMedia = [...I.topMedia.values()]
    .map((e) => {
      const code = store.mediaPkToCode.get(e.id) || null;
      const p = code ? byCodeAll.get(code) : null;
      return {
        ...e,
        code,
        url: p ? p.url : null,
        caption: p ? p.caption.slice(0, 80) : '',
        type: p ? p.type : null,
      };
    })
    .sort((a, b) => (b.views || 0) - (a.views || 0) || (b.interacted || 0) - (a.interacted || 0));

  const followerSplit = I.followerSplit || viewsSplit;

  const ins: AudienceInsights = {
    demo: I.demo,
    period: I.period,
    overview,
    viewsSplit,
    interSplit,
    formatIns,
    activeGrid,
    tzShift,
    topMedia,
    followerSplit,
    traffic: I.traffic,
    avgWatch: watch.length
      ? mean(watch)
      : isNum(I.account.avgWatch)
        ? I.account.avgWatch > 600
          ? I.account.avgWatch / 1000
          : I.account.avgWatch
        : null,
    watchN: watch.length,
    watchByPost: posts
      .filter((p) => p.avgWatch != null)
      .map((p) => ({
        code: p.code,
        url: p.url,
        t: p.t,
        avgWatch: p.avgWatch as number,
        duration: p.duration,
      }))
      .slice(0, 20),
    retention: (I.account.retention as unknown as number[] | null) || (retPost ? retPost.retention : null),
    profileVisits:
      metric(/^profile_visits/) ?? I.account.profile_visits ?? sumOf((p) => p.profileVisits),
    follows: metric(/follows/) ?? I.account.follows ?? sumOf((p) => p.follows),
    linkClicks: metric(/link_clicks|website_clicks/) ?? I.account.link_clicks ?? sumOf((p) => p.linkClicks),
    hours: activeGrid
      ? Array.from({ length: 24 }, (_, h) => activeGrid!.reduce((s, r) => s + r[h], 0) / 7)
      : I.audienceHours,
    days: activeGrid ? activeGrid.map((r) => r.reduce((s, x) => s + x, 0) / 24) : I.audienceDays,
    hasDemo: false,
    any: false,
  };

  ins.hasDemo = ['gender', 'age', 'city', 'country', 'ageGender'].some((k) => I.demo[k]);
  ins.any =
    overview.length > 0 ||
    !!interSplit ||
    formatIns.length > 0 ||
    topMedia.length > 0 ||
    ins.hasDemo ||
    !!ins.followerSplit ||
    !!ins.traffic ||
    ins.avgWatch != null ||
    !!ins.retention ||
    ins.profileVisits != null ||
    ins.follows != null ||
    ins.linkClicks != null ||
    !!ins.hours ||
    !!ins.days;

  /* ---------------------------------------------------------------- */
  /* B. Public data                                                    */
  /* ---------------------------------------------------------------- */

  const byCode = new Map(posts.map((p) => [p.code, p]));
  const rows: AudienceCommentRow[] = audComments
    .map((c) => {
      const p = c.code ? byCode.get(c.code) : null;
      const delay = p && isNum(c.t) && c.t >= p.t ? c.t - p.t : null;
      return {
        ...c,
        type: classifyComment(c, account),
        lang: detectLang(c.text),
        sent: sentiment(c.text),
        delay,
        postType: p ? p.type : null,
        postUrl: p ? p.url : null,
      };
    })
    .sort((a, b) => (b.t || 0) - (a.t || 0));
  const n = rows.length;

  // Estimated active hours from comment timestamps.
  const heat: number[][] = Array.from({ length: DAYS_LEN }, () => new Array(24).fill(0));
  for (const c of rows) {
    if (isNum(c.t)) {
      const { dow, hour } = jkt(c.t);
      heat[dow][hour]++;
    }
  }
  const dayTotals = heat.map((r) => sum(r));
  const hourTotals = Array.from({ length: 24 }, (_, h) => sum(heat.map((r) => r[h])));
  const blocks = Array.from({ length: 8 }, (_, b) => ({
    b,
    n: hourTotals.slice(b * 3, b * 3 + 3).reduce((s, x) => s + x, 0),
  })).sort((x, y) => y.n - x.n);
  const slots: { dow: number; hour: number; n: number }[] = [];
  heat.forEach((r, d) => r.forEach((v, h) => { if (v) slots.push({ dow: d, hour: h, n: v }); }));
  slots.sort((a, b) => b.n - a.n);

  // Response speed.
  const delays = rows.map((c) => c.delay).filter(isNum);
  const B: [string, number][] = [
    ['< 1 jam', 3600],
    ['1–6 jam', 6 * 3600],
    ['6–24 jam', 86400],
    ['1–3 hari', 3 * 86400],
    ['> 3 hari', Infinity],
  ];
  const speedBuckets = B.map(([label], i) => ({
    label,
    value: delays.filter((d) => d >= (i ? B[i - 1][1] : 0) && d < B[i][1]).length,
  }));
  const firstByPost = new Map<string, number>();
  for (const c of rows) {
    if (isNum(c.delay) && c.code) {
      firstByPost.set(c.code, Math.min(firstByPost.get(c.code) ?? Infinity, c.delay));
    }
  }
  const speed: PublicAudience['speed'] = delays.length
    ? {
        n: delays.length,
        median: median(delays) as number,
        within1h: (delays.filter((d) => d < 3600).length / delays.length) * 100,
        within24h: (delays.filter((d) => d < 86400).length / delays.length) * 100,
        buckets: speedBuckets,
        firstMedian: firstByPost.size ? median([...firstByPost.values()]) : null,
        postsWithComments: firstByPost.size,
      }
    : null;

  // Interaction ratio.
  const tl = sumOf((p) => p.likes) || 0;
  const tc = sumOf((p) => p.comments) || 0;
  const ts = sumOf((p) => p.saves);
  const tsh = sumOf((p) => p.shares);
  const trp = sumOf((p) => p.reposts);
  const ratio: PublicAudience['ratio'] = {
    likes: tl,
    comments: tc,
    saves: ts,
    shares: tsh,
    reposts: trp,
    per100: {
      comments: tl ? (tc / tl) * 100 : null,
      saves: tl && ts != null ? (ts / tl) * 100 : null,
      shares: tl && tsh != null ? (tsh / tl) * 100 : null,
      reposts: tl && trp != null ? (trp / tl) * 100 : null,
    },
  };

  // Comment type / sentiment / language.
  const typeEx: Record<string, string[]> = {};
  for (const c of rows) {
    (typeEx[c.type] = typeEx[c.type] || []);
    const x = c.text.slice(0, 90);
    if (typeEx[c.type].length < 2 && c.text.length > 2 && !typeEx[c.type].includes(x)) typeEx[c.type].push(x);
  }
  const types = (['question', 'tag', 'emoji', 'diskusi', 'singkat'] as const).map((k) => ({
    key: k,
    label: k,
    value: rows.filter((c) => c.type === k).length,
    ex: typeEx[k] || [],
  }));

  const sent: Record<Sentiment, number> = {
    pos: rows.filter((c) => c.sent === 'pos').length,
    neu: rows.filter((c) => c.sent === 'neu').length,
    neg: rows.filter((c) => c.sent === 'neg').length,
  };
  const exOf = (k: Sentiment) =>
    [...new Set(rows.filter((c) => c.sent === k && c.text.length > 6).map((c) => c.text.slice(0, 120)))].slice(0, 3);
  const sentEx = { pos: exOf('pos'), neg: exOf('neg') };

  const langs = countBy(rows, (c) => c.lang);
  const langKnown = langs.filter((l) => !/unknown|emoji/.test(l.label));

  // Format preference.
  const formats = (['reel', 'carousel', 'foto'] as PostType[])
    .map((t) => {
      const g = posts.filter((p) => p.type === t);
      const cs = rows.filter((c) => c.postType === t);
      const gl = sum(g.map((p) => p.likes || 0));
      const gc = sum(g.map((p) => p.comments || 0));
      return {
        type: t,
        n: g.length,
        medScore: median(g.map(score)),
        avgLikes: mean(vals(g, (p) => p.likes)),
        avgComments: mean(vals(g, (p) => p.comments)),
        avgViews: mean(vals(g, (p) => p.views)),
        c100: gl ? (gc / gl) * 100 : null,
        read: cs.length,
        posPct: cs.length ? (cs.filter((c) => c.sent === 'pos').length / cs.length) * 100 : null,
      };
    })
    .filter((f) => f.n);
  const fmtOk = formats.filter((f) => f.n >= 2);
  const favFormat =
    [...(fmtOk.length ? fmtOk : formats)].sort((a, b) => (b.medScore || 0) - (a.medScore || 0))[0] || null;
  const talkFormat =
    [...(fmtOk.length ? fmtOk : formats)]
      .filter((f) => f.c100 != null)
      .sort((a, b) => (b.c100 as number) - (a.c100 as number))[0] || null;

  // Topics / pillars.
  const pm = new Map<string, AnalyzedPost[]>();
  for (const p of posts) {
    for (const k of p.pillars.length ? p.pillars : ['lainnya']) {
      const g = pm.get(k) || [];
      g.push(p);
      pm.set(k, g);
    }
  }
  const pillars = [...pm.entries()].map(([k, g]) => {
    const codes = new Set(g.map((p) => p.code));
    const cs = rows.filter((c) => c.code && codes.has(c.code));
    const gl = sum(g.map((p) => p.likes || 0));
    const gc = sum(g.map((p) => p.comments || 0));
    return {
      key: k,
      label: k,
      n: g.length,
      share: (g.length / posts.length) * 100,
      medScore: median(g.map(score)),
      avgComments: mean(vals(g, (p) => p.comments)),
      c100: gl ? (gc / gl) * 100 : null,
      read: cs.length,
      posPct: cs.length ? (cs.filter((c) => c.sent === 'pos').length / cs.length) * 100 : null,
    };
  });
  const minP = posts.length >= 20 ? 3 : 2;
  pillars.sort((a, b) => Number(b.n >= minP) - Number(a.n >= minP) || (b.medScore || 0) - (a.medScore || 0));

  // Loyal audience.
  const cm = new Map<
    string,
    { user: string; n: number; posts: Set<string>; first: number; last: number; pos: number; neg: number; q: number }
  >();
  for (const c of rows) {
    const e = cm.get(c.user) || {
      user: c.user,
      n: 0,
      posts: new Set<string>(),
      first: Infinity,
      last: 0,
      pos: 0,
      neg: 0,
      q: 0,
    };
    e.n++;
    if (c.code) e.posts.add(c.code);
    if (isNum(c.t)) {
      e.first = Math.min(e.first, c.t);
      e.last = Math.max(e.last, c.t);
    }
    if (c.sent === 'pos') e.pos++;
    if (c.sent === 'neg') e.neg++;
    if (c.type === 'question') e.q++;
    cm.set(c.user, e);
  }
  const postsWithRead = new Set(rows.map((c) => c.code).filter(Boolean)).size;
  const isRepeat = (e: { posts: Set<string>; n: number }) =>
    postsWithRead >= 2 ? e.posts.size >= 2 : e.n >= 2;
  const commenters = [...cm.values()]
    .map((e) => ({
      user: e.user,
      n: e.n,
      posts: e.posts.size,
      first: isFinite(e.first) ? e.first : null,
      last: e.last || null,
      pos: e.pos,
      neg: e.neg,
      q: e.q,
      repeat: isRepeat(e),
    }))
    .sort((a, b) => b.posts - a.posts || b.n - a.n);
  const repeaters = commenters.filter((e) => e.repeat);
  const loyal: PublicAudience['loyal'] = {
    unique: commenters.length,
    repeat: repeaters.length,
    repeatPct: commenters.length ? (repeaters.length / commenters.length) * 100 : null,
    commentsFromRepeatPct: n ? (sum(repeaters.map((e) => e.n)) / n) * 100 : null,
    rule: postsWithRead >= 2 ? 'multi' : 'single',
    postsWithRead,
  };

  // Interest signals.
  const themeCount = new Map<string, number>();
  for (const c of rows) {
    for (const k of pillarsOf(c.text)) themeCount.set(k, (themeCount.get(k) || 0) + 1);
  }
  const wordCount = new Map<string, number>();
  const emojiCount = new Map<string, number>();
  for (const c of rows) {
    for (const w of new Set(c.text.toLowerCase().replace(/@[\w.]+/g, ' ').match(/\p{L}{3,}/gu) || [])) {
      if (!STOP.has(w)) wordCount.set(w, (wordCount.get(w) || 0) + 1);
    }
    for (const e of c.text.match(/\p{Extended_Pictographic}/gu) || []) {
      emojiCount.set(e, (emojiCount.get(e) || 0) + 1);
    }
  }
  const tagMap = new Map<string, number[]>();
  for (const p of posts) {
    for (const h of new Set(p.hashtags)) {
      const g = tagMap.get(h) || [];
      g.push(score(p));
      tagMap.set(h, g);
    }
  }
  const interest: PublicAudience['interest'] = {
    topics: pillars.filter((p) => p.key !== 'lainnya' && p.n >= minP).slice(0, 3),
    commentThemes: top(themeCount, 5),
    words: top(wordCount, 15).filter((x) => x.value >= 2),
    emojis: top(emojiCount, 10),
    hashtags: [...tagMap.entries()]
      .filter(([, a]) => a.length >= 2)
      .map(([tag, a]) => ({ tag, n: a.length, med: median(a) }))
      .sort((a, b) => (b.med || 0) - (a.med || 0))
      .slice(0, 8),
  };

  const pub: PublicAudience = {
    n,
    totalComments: tc,
    heat,
    dayTotals,
    hourTotals,
    blocks,
    slots: slots.slice(0, 5),
    speed,
    ratio,
    types,
    sent,
    sentEx,
    langs,
    langKnown,
    formats,
    favFormat,
    talkFormat,
    pillars,
    commenters,
    loyal,
    interest,
    ownReplies: ownComments.length,
    replyPerAud: n ? (ownComments.length / n) * 100 : null,
    rows,
  };

  return { ins, pub, conclusions: audienceConclusions(ins, pub, F, ctx) };
}
