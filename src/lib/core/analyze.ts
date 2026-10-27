import { erLabel, tierOf } from './benchmark';
import { CTA_RE, HASHTAG_RE, Q_RE, firstSentence, jkt, pillarsOf, sentiment } from './text';
import { audienceOf } from './audience';
import { conclude } from './conclude';
import { TYPES } from './constants';
import { isNum, mean, median, num, sum, vals } from './util';
import type {
  AccountOption,
  Analysis,
  AnalyzedPost,
  ConcludeCtx,
  ProfileRecord,
  Sentiment,
  Snapshot,
  Store,
  TypeStats,
  WorksRow,
} from './types';

/* ------------------------------------------------------------------ */
/* Account discovery                                                   */
/* ------------------------------------------------------------------ */

export function accountsIn(store: Store): AccountOption[] {
  const counts = new Map<string, number>();
  for (const p of store.posts.values()) {
    for (const u of [p.owner, ...(p.coauthors || [])]) {
      if (u) counts.set(u, (counts.get(u) || 0) + 1);
    }
  }
  const list: AccountOption[] = [...store.profiles.values()]
    .filter((p) => p.followers != null)
    .map((p) => ({ username: p.username, posts: counts.get(p.username) || 0, followers: p.followers as number }))
    .sort((a, b) => b.posts - a.posts || b.followers - a.followers);

  if (!list.length) {
    const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
    if (top) list.push({ username: top[0], posts: top[1], followers: null });
  }
  return list;
}

/* ------------------------------------------------------------------ */
/* Main analysis                                                       */
/* ------------------------------------------------------------------ */

export function analyze(
  store: Store,
  account: string,
  snapshots: Snapshot[] | null,
  ctx: ConcludeCtx,
): Analysis {
  const prof = store.profiles.get(account) || ({ username: account, _ts: 0 } as ProfileRecord);
  const F: number | null = isNum(prof.followers) ? prof.followers : null;
  const all = [...store.posts.values()];
  const mine = all.filter(
    (p) => p.owner === account || (p.coauthors || []).includes(account) || (prof.id && p.ownerId === prof.id),
  );
  const excluded = all.length - mine.length;

  const posts: AnalyzedPost[] = mine
    .filter((p) => isNum(p.t))
    .map((p) => {
      const mm = p.pk ? store.insights.mediaMetrics.get(String(p.pk)) : null;
      const pick = (name: string) => p['ins_' + name] ?? mm?.['ins_' + name] ?? null;
      const saves = pick('saves') ?? p.saves;
      const shares = pick('shares') ?? p.shares;
      const eng = (p.likes || 0) + (p.comments || 0) + (saves || 0) + (shares || 0);
      const reach = pick('reach');
      const { dow, hour } = jkt(p.t as number);
      const cap: string = p.caption || '';
      const hashtags = [...cap.matchAll(HASHTAG_RE)].map((m) => m[1].toLowerCase());
      const collab = p.owner !== account || (p.coauthors || []).length > 0;
      const pillars = pillarsOf(cap + ' ' + hashtags.map((h) => '#' + h).join(' '));
      if (collab && !pillars.includes('collab')) pillars.push('collab');
      const type = (p.type || 'foto') as AnalyzedPost['type'];
      const avgWatchRaw = pick('avgWatch');

      return {
        code: p.code,
        url: `https://www.instagram.com/${type === 'reel' ? 'reel' : 'p'}/${p.code}/`,
        t: p.t as number,
        dow,
        hour,
        type,
        owner: p.owner || null,
        collab,
        coauthors: p.coauthors || [],
        pinned: !!p.pinned,
        likesHidden: !!p.likesHidden,
        likes: p.likes ?? null,
        comments: p.comments ?? null,
        views: p.views ?? null,
        duration: p.duration ?? null,
        saves: saves ?? null,
        shares: shares ?? null,
        reposts: p.reposts ?? null,
        reach,
        impressions: pick('impressions'),
        profileVisits: pick('profile_visits'),
        eng,
        er: F ? (eng / F) * 100 : null,
        erReach: reach ? (eng / reach) * 100 : null,
        caption: cap,
        capLen: [...cap].length,
        hashtags,
        cta: CTA_RE.test(cap),
        hook: firstSentence(cap),
        hookQ: /\?/.test(firstSentence(cap)),
        hookNum: /\d/.test(firstSentence(cap)),
        carouselCount: p.carouselCount ?? null,
        queries: [...p.queries],
        avgWatch: isNum(avgWatchRaw) ? (avgWatchRaw > 600 ? avgWatchRaw / 1000 : avgWatchRaw) : null,
        totalWatch: pick('totalWatch'),
        retention: pick('retention'),
        skipRate: num(pick('skip_rate')),
        follows: pick('follows'),
        linkClicks: pick('link_clicks'),
        pillars,
      };
    })
    .sort((a, b) => b.t - a.t);

  const score = (p: AnalyzedPost): number => p.er ?? p.eng;
  const tier = tierOf(F);
  const nonPinned = posts.filter((p) => !p.pinned);
  const tsSorted = nonPinned.map((p) => p.t).sort((a, b) => a - b);
  const spanDays = tsSorted.length > 1 ? (tsSorted[tsSorted.length - 1] - tsSorted[0]) / 86400 : 0;
  const capTs = store.captureTs ? store.captureTs / 1000 : tsSorted[tsSorted.length - 1] || 0;
  const solo = posts.filter((p) => !p.collab);
  const collabs = posts.filter((p) => p.collab);

  const summary: Analysis['summary'] = {
    n: posts.length,
    pinned: posts.length - nonPinned.length,
    avgER: mean(vals(posts, (p) => p.er)),
    medER: median(vals(posts, (p) => p.er)),
    avgERReach: mean(vals(posts, (p) => p.erReach)),
    nSolo: solo.length,
    nCollab: collabs.length,
    avgERSolo: mean(vals(solo, (p) => p.er)),
    medERSolo: median(vals(solo, (p) => p.er)),
    avgERCollab: mean(vals(collabs, (p) => p.er)),
    medERCollab: median(vals(collabs, (p) => p.er)),
    avgEngSolo: mean(solo.map((p) => p.eng)),
    avgEngCollab: mean(collabs.map((p) => p.eng)),
    avgLikes: mean(vals(posts, (p) => p.likes)),
    avgComments: mean(vals(posts, (p) => p.comments)),
    avgViews: mean(vals(posts, (p) => p.views)),
    viewsN: vals(posts, (p) => p.views).length,
    avgEng: mean(posts.map((p) => p.eng)),
    freqWeek: freqOf(nonPinned, capTs),
    last30: nonPinned.filter((p) => p.t >= capTs - 30 * 86400).length,
    from: tsSorted[0] || null,
    to: tsSorted[tsSorted.length - 1] || null,
    spanDays,
    tier,
    label: null,
  };
  summary.label = erLabel(summary.avgER, tier);

  const byType = {} as Record<AnalyzedPost['type'], TypeStats>;
  for (const ty of TYPES) {
    const g = posts.filter((p) => p.type === ty);
    byType[ty] = {
      n: g.length,
      avgER: mean(vals(g, (p) => p.er)),
      medER: median(vals(g, (p) => p.er)),
      avgLikes: mean(vals(g, (p) => p.likes)),
      avgComments: mean(vals(g, (p) => p.comments)),
      avgViews: mean(vals(g, (p) => p.views)),
      avgEng: mean(g.map((p) => p.eng)),
      share: posts.length ? g.length / posts.length : 0,
    };
  }

  const ranked = [...posts].sort((a, b) => score(b) - score(a));
  const top5 = ranked.slice(0, 5);
  const bottom5 = ranked.length > 5 ? ranked.slice(-5).reverse() : [];
  const top10 = ranked.slice(0, 10);
  const bottom10 = ranked.length > 10 ? ranked.slice(-10).reverse() : [];

  // Performance heatmap: day × hour, cell value = median score.
  const heat: Analysis['heat'] = Array.from({ length: 7 }, () =>
    Array.from({ length: 24 }, () => ({ n: 0, scores: [] as number[], med: null as number | null })),
  );
  for (const p of posts) {
    const c = heat[p.dow][p.hour];
    c.n++;
    c.scores.push(score(p));
  }
  heat.forEach((r) => r.forEach((c) => { c.med = median(c.scores); }));

  const groupAvg = (keyFn: (p: AnalyzedPost) => number) => {
    const m = new Map<number, number[]>();
    for (const p of posts) {
      const k = keyFn(p);
      const g = m.get(k) || [];
      g.push(score(p));
      m.set(k, g);
    }
    return [...m.entries()].map(([k, a]) => ({ k, n: a.length, avg: median(a) }));
  };
  const minN = posts.length >= 30 ? 3 : 2;
  const pickBest = <T extends { n: number; avg: number | null }>(arr: T[]): T[] => {
    const ok = arr.filter((x) => x.n >= minN);
    const rest = arr.filter((x) => x.n < minN);
    return [
      ...ok.sort((a, b) => (b.avg ?? 0) - (a.avg ?? 0)),
      ...rest.sort((a, b) => (b.avg ?? 0) - (a.avg ?? 0)),
    ];
  };
  const byDay = pickBest(groupAvg((p) => p.dow));
  const byBlock = pickBest(groupAvg((p) => Math.floor(p.hour / 3)));
  const overallAvg = median(posts.map(score));

  // Comments (resolve comment endpoints that only carry media pk).
  const comments = [...store.comments.values()].map((c) => {
    let code = c.media;
    if (code && code.startsWith('pk:')) code = store.mediaPkToCode.get(code.slice(3)) || null;
    return { ...c, code };
  });
  const myCodes = new Set(posts.map((p) => p.code));
  const audComments = comments.filter((c) => c.user !== account && (!c.code || myCodes.has(c.code)));

  const commentHeat: number[][] = Array.from({ length: 7 }, () => new Array(24).fill(0));
  for (const c of audComments) {
    if (isNum(c.t)) {
      const { dow, hour } = jkt(c.t);
      commentHeat[dow][hour]++;
    }
  }

  let audSource: Analysis['audSource'] = null;
  if (store.insights.audienceHours) audSource = 'insights';
  else if (audComments.filter((c) => isNum(c.t)).length) audSource = 'comments';

  const sumLikes = posts.reduce((s, p) => s + (p.likes || 0), 0);
  const sumComments = posts.reduce((s, p) => s + (p.comments || 0), 0);
  const commenters = new Map<string, { user: string; n: number; posts: Set<string> }>();
  const sent: Record<Sentiment, number> = { pos: 0, neg: 0, neu: 0 };
  const sentEx: { pos: string[]; neg: string[] } = { pos: [], neg: [] };

  for (const c of audComments) {
    const e = commenters.get(c.user) || { user: c.user, n: 0, posts: new Set<string>() };
    e.n++;
    if (c.code) e.posts.add(c.code);
    commenters.set(c.user, e);
    const s = sentiment(c.text);
    sent[s]++;
    if (s !== 'neu' && sentEx[s].length < 3 && c.text.length > 6) sentEx[s].push(c.text.slice(0, 120));
  }

  const behavior: Analysis['behavior'] = {
    sumLikes,
    sumComments,
    commentsPer100Likes: sumLikes ? (sumComments / sumLikes) * 100 : null,
    likesPerComment: sumComments ? sumLikes / sumComments : null,
    commentsN: audComments.length,
    avgLen: mean(audComments.map((c) => [...c.text].length)),
    qPct: audComments.length
      ? (audComments.filter((c) => Q_RE.test(c.text.trim())).length / audComments.length) * 100
      : null,
    topCommenters: [...commenters.values()]
      .map((e) => ({ user: e.user, n: e.n, posts: e.posts.size }))
      .sort((a, b) => b.posts - a.posts || b.n - a.n)
      .slice(0, 10),
    loyal: [...commenters.values()].filter((e) => e.posts.size >= 2).length,
    uniqueCommenters: commenters.size,
    sent,
    sentEx,
  };

  /* What works ------------------------------------------------------- */
  let works: Analysis['works'] = null;
  if (ranked.length >= 6) {
    const k = Math.max(3, Math.round(ranked.length * 0.25));
    const topGroup = ranked.slice(0, k);
    const botGroup = ranked.slice(-k);
    const pct = (g: AnalyzedPost[], f: (p: AnalyzedPost) => boolean) =>
      (g.filter(f).length / g.length) * 100;
    const typeMix = (g: AnalyzedPost[]) =>
      TYPES.map((ty) => `${ctx.type(ty)} ${Math.round(pct(g, (p) => p.type === ty))}%`).join(' · ');
    const modeHour = (g: AnalyzedPost[]) => {
      const c = new Array(8).fill(0);
      g.forEach((p) => c[Math.floor(p.hour / 3)]++);
      const i = c.indexOf(Math.max(...c));
      return `${String(i * 3).padStart(2, '0')}:00–${String(i * 3 + 3).padStart(2, '0')}:00`;
    };
    const durT = mean(vals(topGroup.filter((p) => p.type === 'reel'), (p) => p.duration));
    const durB = mean(vals(botGroup.filter((p) => p.type === 'reel'), (p) => p.duration));
    const rows: WorksRow[] = [
      { label: 'typeMix', top: typeMix(topGroup), bot: typeMix(botGroup) },
      {
        label: 'captionLen',
        top: mean(topGroup.map((p) => p.capLen)),
        bot: mean(botGroup.map((p) => p.capLen)),
        unit: 'chars',
        key: 'cap',
      },
      { label: 'cta', top: pct(topGroup, (p) => p.cta), bot: pct(botGroup, (p) => p.cta), unit: '%', key: 'cta' },
      {
        label: 'hashtags',
        top: mean(topGroup.map((p) => p.hashtags.length)),
        bot: mean(botGroup.map((p) => p.hashtags.length)),
        key: 'tags',
        dec: 1,
      },
      {
        label: 'hookQuestion',
        top: pct(topGroup, (p) => p.hookQ),
        bot: pct(botGroup, (p) => p.hookQ),
        unit: '%',
        key: 'hookQ',
      },
      {
        label: 'hookNumber',
        top: pct(topGroup, (p) => p.hookNum),
        bot: pct(botGroup, (p) => p.hookNum),
        unit: '%',
        key: 'hookNum',
      },
      {
        label: 'hookLength',
        top: mean(topGroup.map((p) => [...p.hook].length)),
        bot: mean(botGroup.map((p) => [...p.hook].length)),
        unit: 'chars',
        key: 'hookLen',
      },
      { label: 'reelDuration', top: durT, bot: durB, unit: 'sec', key: 'dur' },
      {
        label: 'collab',
        top: pct(topGroup, (p) => p.collab),
        bot: pct(botGroup, (p) => p.collab),
        unit: '%',
        key: 'collab',
      },
      { label: 'postingHour', top: modeHour(topGroup), bot: modeHour(botGroup) },
    ];

    const tagStat = new Map<string, { tag: string; n: number; inTop: number; scores: number[] }>();
    for (const p of posts) {
      for (const h of new Set(p.hashtags)) {
        const s = tagStat.get(h) || { tag: h, n: 0, inTop: 0, scores: [] };
        s.n++;
        s.scores.push(score(p));
        tagStat.set(h, s);
      }
    }
    for (const p of topGroup) {
      for (const h of new Set(p.hashtags)) {
        const s = tagStat.get(h);
        if (s) s.inTop++;
      }
    }
    const topTags = [...tagStat.values()]
      .filter((s) => s.inTop > 0)
      .map((s) => ({ ...s, avg: mean(s.scores) as number }))
      .sort((a, b) => b.inTop - a.inTop || b.avg - a.avg)
      .slice(0, 12);

    works = { k, rows, topTags, top: topGroup, bot: botGroup };
  }

  const ownComments = comments.filter((c) => c.user === account && (!c.code || myCodes.has(c.code)));
  const aud = audienceOf(store, account, posts, audComments, ownComments, F, score, ctx);

  const insightsAvail: Analysis['insightsAvail'] = {
    reach: posts.some((p) => p.reach != null) || store.insights.account.reach != null || isNum(store.insights.metrics.reach_current_period),
    impressions:
      posts.some((p) => p.impressions != null) ||
      store.insights.account.impressions != null ||
      isNum(store.insights.metrics.views_current_period),
    saves: posts.some((p) => p.saves != null),
    shares: posts.some((p) => p.shares != null),
    profile_visits:
      posts.some((p) => p.profileVisits != null) ||
      store.insights.account.profile_visits != null ||
      isNum(store.insights.metrics.profile_visits_count),
    audience: aud.ins.any || store.insights.audienceRaw.length > 0,
    reposts: posts.some((p) => p.reposts != null),
  };

  const sumOf = (f: (p: AnalyzedPost) => number | null): number | null => {
    const v = vals(posts, f);
    return v.length ? sum(v) : null;
  };
  const insightTotals: Analysis['insightTotals'] = {
    reach: sumOf((p) => p.reach) ?? store.insights.account.reach ?? store.insights.metrics.reach_current_period ?? null,
    impressions:
      sumOf((p) => p.impressions) ??
      store.insights.account.impressions ??
      store.insights.metrics.views_current_period ??
      null,
    saves: sumOf((p) => p.saves),
    shares: sumOf((p) => p.shares),
    profile_visits:
      sumOf((p) => p.profileVisits) ??
      store.insights.account.profile_visits ??
      store.insights.metrics.profile_visits_count ??
      null,
    reposts: sumOf((p) => p.reposts),
    repostsN: vals(posts, (p) => p.reposts).length,
    account: store.insights.account,
    audienceRaw: store.insights.audienceRaw,
    audienceHours: store.insights.audienceHours,
  };

  const snapsAcc = (snapshots || []).filter((s) => s.account === account).sort((a, b) => a.captureTs - b.captureTs);
  const growth = growthOf(snapsAcc);

  const A = {
    aud,
    account,
    profile: prof,
    followers: F,
    posts,
    ranked,
    top5,
    bottom5,
    top10,
    bottom10,
    summary,
    byType,
    heat,
    byDay,
    byBlock,
    overallAvg,
    commentHeat,
    audSource,
    comments: audComments,
    behavior,
    works,
    insightsAvail,
    insightTotals,
    growth,
    snapshots: snapsAcc,
    captureTs: store.captureTs,
    excluded,
    scoreLabel: F ? 'ER' : 'Engagement',
  } as unknown as Analysis;

  A.conclusions = conclude(A, ctx);
  A.debug = debugInfo(store, A);
  return A;
}

/* ------------------------------------------------------------------ */
/* Derived helpers                                                     */
/* ------------------------------------------------------------------ */

/** Average posts/week over the last 90 days (or the whole span if shorter). */
export function freqOf(list: { t: number }[], end: number): number | null {
  if (!list.length || !end) return null;
  const winStart = end - 90 * 86400;
  const oldest = Math.min(...list.map((p) => p.t));
  const start = Math.max(winStart, oldest);
  const days = (end - start) / 86400;
  if (days < 7) return null;
  return list.filter((p) => p.t >= start && p.t <= end).length / (days / 7);
}

export function growthOf(snaps: Snapshot[]): Analysis['growth'] {
  if (snaps.length < 2) return null;
  const a = snaps[0];
  const b = snaps[snaps.length - 1];
  const ch = (x: number | null, y: number | null) =>
    isNum(x) && isNum(y) && x !== 0 ? ((y - x) / x) * 100 : null;
  const days = (b.captureTs - a.captureTs) / 86400000;
  return {
    from: a.captureTs,
    to: b.captureTs,
    days,
    followers: {
      a: a.followers,
      b: b.followers,
      pct: ch(a.followers, b.followers),
      abs: isNum(a.followers) && isNum(b.followers) ? b.followers - a.followers : null,
    },
    er: { a: a.avgER, b: b.avgER, pct: ch(a.avgER, b.avgER) },
    views: { a: a.avgViews, b: b.avgViews, pct: ch(a.avgViews, b.avgViews) },
    likes: { a: a.avgLikes, b: b.avgLikes, pct: ch(a.avgLikes, b.avgLikes) },
  };
}

export function makeSnapshot(A: Analysis): Snapshot {
  return {
    account: A.account,
    captureTs: A.captureTs || Date.now(),
    createdAt: Date.now(),
    followers: A.followers,
    following: A.profile.following ?? null,
    mediaCount: A.profile.mediaCount ?? null,
    avgER: A.summary.avgER,
    avgLikes: A.summary.avgLikes,
    avgComments: A.summary.avgComments,
    avgViews: A.summary.avgViews,
    postsAnalyzed: A.summary.n,
    freqWeek: A.summary.freqWeek,
    posts: A.posts.slice(0, 300).map((p) => ({
      c: p.code,
      t: p.t,
      ty: p.type,
      er: p.er,
      l: p.likes,
      cm: p.comments,
      v: p.views,
    })),
  };
}

function debugInfo(store: Store, A: Analysis): Analysis['debug'] {
  const mine = [...store.posts.values()].filter(
    (p) => p.owner === A.account || (p.coauthors || []).includes(A.account),
  );
  const fieldCount = (f: string) => mine.filter((p) => p[f] != null && p[f] !== '').length;
  const fields = [
    ['likes', 'Likes'],
    ['comments', 'Comments'],
    ['views', 'Views/plays'],
    ['duration', 'Video duration'],
    ['caption', 'Caption'],
    ['saves', 'Saves'],
    ['shares', 'Shares'],
    ['reposts', 'Reposts'],
    ['reach', 'Reach'],
    ['impressions', 'Impressions'],
  ].map(([key, label]) => ({
    key,
    label,
    n: key === 'duration' ? mine.filter((p) => p.type === 'reel' && p.duration != null).length : fieldCount(key),
    of: key === 'duration' ? mine.filter((p) => p.type === 'reel').length : mine.length,
  }));

  const pf = A.profile;
  const profFields = [
    ['followers', 'Followers'],
    ['following', 'Following'],
    ['mediaCount', 'Post count'],
    ['bio', 'Bio'],
    ['category', 'Category'],
    ['fullName', 'Name'],
  ].map(([k, label]) => ({ label, ok: pf[k] != null && pf[k] !== '' }));

  return {
    files: store.files,
    counts: { ...store.debug },
    queries: [...store.queries.values()]
      .map((q) => ({
        name: q.name,
        doc: q.doc,
        kind: q.kind,
        requests: q.requests,
        posts: q.posts.size,
        comments: q.comments,
        profiles: q.profiles,
        insights: q.insights,
        fails: q.fails,
        encodings: [...q.encodings].join(', '),
      }))
      .sort((a, b) => b.posts - a.posts || b.requests - a.requests),
    totalPosts: store.posts.size,
    accountPosts: mine.length,
    excluded: A.excluded,
    comments: store.comments.size,
    accountComments: A.comments.length,
    fields,
    profFields,
    missing: [
      ...fields.filter((f) => f.n === 0).map((f) => 'Post: ' + f.label),
      ...profFields.filter((f) => !f.ok).map((f) => 'Profile: ' + f.label),
      ...(A.comments.length ? [] : ['Comment text']),
      ...(A.insightsAvail.audience ? [] : ['Audience insights']),
    ],
  };
}

export { erLabel, tierOf };
