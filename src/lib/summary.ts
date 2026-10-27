import type { Analysis, Snapshot } from '@/lib/core/types';
import { isNum, mean, median } from '@/lib/core/util';
import { bouncePct } from '@/lib/metrics';
import type { Dict, Formatters } from '@/lib/i18n';
import { renderMsg } from '@/lib/i18n';

export type SummaryFormat = 'plain' | 'wa' | 'md';

export function buildSummary(
  A: Analysis,
  t: Dict,
  f: Formatters,
  fmt: SummaryFormat,
): string {
  const S = A.summary;
  const P = A.profile;
  const C = A.conclusions;
  const B = fmt === 'wa' ? '*' : fmt === 'md' ? '**' : '';
  const I = fmt === 'plain' ? '' : '_';
  const bold = (s: string) => (B ? B + s + B : s);
  const bullet = fmt === 'md' ? '- ' : '• ';
  const head = (s: string) => (fmt === 'md' ? `### ${s}` : fmt === 'wa' ? `*${s}*` : s.toUpperCase());
  const plain = (h: string) =>
    h
      .replace(/<b>(.*?)<\/b>/g, (_, x) => bold(x))
      .replace(/<i>(.*?)<\/i>/g, (_, x) => I + x + I)
      .replace(/<[^>]+>/g, '');

  const out: string[] = [];
  const block = (title: string, lines: (string | false | null | undefined)[]) => {
    const clean = lines.filter(Boolean) as string[];
    if (clean.length) out.push('', head(title), ...clean);
  };

  out.push(`${fmt === 'md' ? '## ' : ''}${bold(t.ui.sum.title(A.account))}`);
  out.push(
    t.ui.sum.meta(
      A.captureTs ? f.dDateMs(A.captureTs) : '–',
      S.n,
      f.dDate(S.from),
      f.dDate(S.to),
    ),
  );

  block(t.ui.sum.profile, [
    `${bullet}${t.ui.sum.followers}: ${bold(f.f0(P.followers))} · ${t.ui.sum.following}: ${f.f0(P.following)} · ${t.ui.sum.totalPosts}: ${f.f0(P.mediaCount)}`,
    P.category ? `${bullet}${t.ui.sum.category}: ${P.category}` : '',
  ]);

  block(t.ui.sum.performance, [
    S.avgER != null
      ? `${bullet}${t.ui.sum.erAvg}: ${bold(f.f2(S.avgER) + '%')} (${t.ui.sum.median} ${f.f2(S.medER)}%)${
          S.label ? ` — ${t.ui.er.level[S.label.key]}, ${S.tier ? t.ui.tiers[S.tier.key] : ''}` : ''
        }`
      : `${bullet}${t.ui.er.interactions}: ${bold(f.f0(S.avgEng))} (${t.ui.er.noFollowers})`,
    `${bullet}${t.ui.sum.avgLikes}: ${f.f0(S.avgLikes)} · ${t.ui.sum.comments}: ${f.f1(S.avgComments)}${
      S.viewsN ? ` · ${t.ui.sum.views}: ${f.f0(S.avgViews)}` : ''
    }`,
    (() => {
      const watches = A.posts.map((p) => p.avgWatch).filter(isNum);
      if (!watches.length) return '';
      const bounces = A.posts.map((p) => bouncePct(p)).filter(isNum);
      return `${bullet}${t.ui.postinsights.colAvgWatch}: ${bold(f.f1(mean(watches)) + 's')}${
        bounces.length ? ` · ${t.ui.postinsights.colBounce}: ${f.f0(median(bounces))}%` : ''
      }`;
    })(),
    S.freqWeek != null
      ? `${bullet}${t.ui.sum.freq}: ${f.f1(S.freqWeek)} ${t.ui.sum.perWeek} (${t.ui.sum.last30(S.last30)})`
      : '',
    S.nCollab && S.avgERSolo != null
      ? `${bullet}${t.ui.sum.withoutCollab}: ${f.f2(S.avgERSolo)}% (${S.nSolo}) · ${t.ui.sum.withCollab}: ${f.f2(
          S.avgERCollab,
        )}% (${S.nCollab})`
      : '',
  ]);

  const typeLines = (['reel', 'carousel', 'foto'] as const)
    .filter((ty) => A.byType[ty].n)
    .map((ty) => {
      const b = A.byType[ty];
      return `${bullet}${t.ui.types[ty]}: ${b.n} (${f.f0(b.share * 100)}%) · ${
        A.followers ? `${t.ui.er.avg} ${f.f2(b.avgER)}%` : `${f.f0(b.avgEng)} ${t.ui.sum.interactions}`
      } · ${f.f0(b.avgLikes)} likes${ty === 'reel' && b.avgViews != null ? ` · ${f.f0(b.avgViews)} views` : ''}`;
    });
  block(t.ui.sum.byType, typeLines);

  if (A.byDay[0] && A.byBlock[0] && A.posts.length >= 6) {
    const bl = (k: number) => `${String(k * 3).padStart(2, '0')}.00–${String(k * 3 + 3).padStart(2, '0')}.00 WIB`;
    block(t.ui.sum.timing, [
      `${bullet}${t.ui.sum.day}: ${bold(t.ui.days[A.byDay[0].k])} · ${t.ui.sum.time}: ${bold(bl(A.byBlock[0].k))}`,
    ]);
  }

  block(
    t.ui.sum.top3,
    A.top5.slice(0, 3).map((p, i) => {
      const sc = A.followers ? `ER ${f.f2(p.er)}%` : `${f.f0(p.eng)} ${t.ui.sum.interactions}`;
      return `${i + 1}. ${t.ui.types[p.type]} · ${f.dDate(p.t)} · ${bold(sc)} · ${f.f0(p.likes)} likes — ${p.url}`;
    }),
  );

  if (A.growth) {
    const G = A.growth;
    block(t.ui.sum.growth, [
      G.followers.pct != null
        ? `${bullet}${t.ui.sum.followers} ${f.pctCh(G.followers.pct)} (${f.f0(G.followers.a)} → ${f.f0(
            G.followers.b,
          )}) ${t.ui.growth.daysN(f.f0(G.days))}`
        : '',
      G.er.pct != null ? `${bullet}${t.ui.sum.erAvg} ${f.pctCh(G.er.pct)} (${f.f2(G.er.a)}% → ${f.f2(G.er.b)}%)` : '',
    ]);
  }

  block(
    t.ui.sum.audience,
    A.aud.conclusions.map((c) => `${bullet}${plain(renderMsg(t, c.text))}`),
  );
  block(
    t.ui.sum.insights,
    C.ins.map((x, i) => `${i + 1}. ${plain(renderMsg(t, x.text))}`),
  );
  block(
    t.ui.sum.recs,
    C.recs.map((x, i) => `${i + 1}. ${plain(renderMsg(t, x.text))}`),
  );

  out.push('', I + t.ui.sum.footer + I);
  return out.join('\n');
}

/* ------------------------------------------------------------------ */
/* Files                                                               */
/* ------------------------------------------------------------------ */

export function download(name: string, content: string, type: string): void {
  const blob = new Blob([content], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(a.href);
    a.remove();
  }, 500);
}

const csvCell = (v: unknown): string => {
  if (v == null) return '';
  const s = String(v);
  return /[",\n\r;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
};

export function toCsv(head: string[], rows: unknown[][]): string {
  return '\ufeff' + [head, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n');
}

const dataDate = (iso: string) => iso;

export function postsCsv(A: Analysis, f: Formatters): string {
  const head = [
    'shortcode',
    'url',
    'type',
    'posted_wib',
    'day',
    'hour_wib',
    'owner',
    'collab',
    'pinned',
    'likes',
    'comments',
    'views',
    'duration_sec',
    'saves',
    'shares',
    'reposts',
    'reach',
    'engagement',
    'er_followers_pct',
    'er_reach_pct',
    'hashtag_count',
    'hashtags',
    'has_cta',
    'caption_length',
    'caption',
  ];
  const rows = A.posts.map((p) => [
    p.code,
    p.url,
    p.type,
    dataDate(f.isoJkt(p.t)),
    p.dow,
    p.hour,
    p.owner,
    p.collab ? 1 : 0,
    p.pinned ? 1 : 0,
    p.likes,
    p.comments,
    p.views,
    p.duration != null ? Math.round(p.duration * 10) / 10 : '',
    p.saves,
    p.shares,
    p.reposts,
    p.reach,
    p.eng,
    p.er != null ? p.er.toFixed(3) : '',
    p.erReach != null ? p.erReach.toFixed(3) : '',
    p.hashtags.length,
    p.hashtags.map((h) => '#' + h).join(' '),
    p.cta ? 1 : 0,
    p.capLen,
    p.caption,
  ]);
  return toCsv(head, rows);
}

export function commentsCsv(A: Analysis, f: Formatters): string {
  const head = [
    'post_shortcode',
    'post_type',
    'posted_wib',
    'username',
    'comment',
    'comment_likes',
    'type',
    'sentiment',
    'lang',
    'minutes_after_post',
    'is_reply',
  ];
  const rows = A.aud.pub.rows.map((c) => [
    c.code || '',
    c.postType || '',
    dataDate(f.isoJkt(c.t)),
    c.user,
    c.text,
    c.likes,
    c.type,
    c.sent,
    c.lang,
    c.delay != null ? Math.round(c.delay / 60) : '',
    c.parent ? 1 : 0,
  ]);
  return toCsv(head, rows);
}

export function commentersCsv(A: Analysis, f: Formatters): string {
  const head = [
    'username',
    'comments',
    'posts',
    'repeat_commenter',
    'positive',
    'negative',
    'questions',
    'first_wib',
    'last_wib',
  ];
  const rows = A.aud.pub.commenters.map((c) => [
    c.user,
    c.n,
    c.posts,
    c.repeat ? 1 : 0,
    c.pos,
    c.neg,
    c.q,
    dataDate(f.isoJkt(c.first)),
    dataDate(f.isoJkt(c.last)),
  ]);
  return toCsv(head, rows);
}

export function snapshotsJson(snaps: Snapshot[]): string {
  return JSON.stringify({ app: 'ig-har-analyzer', version: 2, snapshots: snaps }, null, 1);
}

export function reportJson(A: Analysis): string {
  return JSON.stringify(
    {
      app: 'ig-har-analyzer',
      version: 2,
      account: A.account,
      captureTs: A.captureTs,
      profile: A.profile,
      summary: A.summary,
      byType: A.byType,
      timing: { byDay: A.byDay, byBlock: A.byBlock },
      posts: A.posts,
      behavior: A.behavior,
      audience: { ins: A.aud.ins, pub: { ...A.aud.pub, rows: undefined } },
      conclusions: A.conclusions,
    },
    null,
    1,
  );
}
