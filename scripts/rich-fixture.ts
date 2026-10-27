/**
 * A denser synthetic dataset: 12 posts, comments across posts, insights
 * breakdowns, and two snapshots. Used to exercise populated UI branches
 * (what-works, recommendations, growth, active-hours grid).
 */
import { analyze, createStore, ingestHar, makeSnapshot } from '../src/lib/core';
import type { Analysis, HarFile, Snapshot } from '../src/lib/core/types';
import { buildCtx, dict, makeFormatters, type Locale } from '../src/lib/i18n';

const NOW = Math.floor(Date.now() / 1000);

const CAPTIONS = [
  'Promo diskon 20% minggu ini — cek link di bio #promo #kopi',
  'Tips menyeduh kopi di rumah, simpan buat nanti #tips #kopi',
  'Menu baru: es kopi susu gula aren #menu #kopi',
  'Review jujur dari pelanggan setia #review #kopi',
  'Reel lucu wkwk barista kami #humor #bts',
  'Behind the scene dapur kami hari ini #bts #dapur',
  'Cara bikin cold brew anti ribet #tips #edukasi',
  'Travel ke kebun kopi Gayo #travel #kopi',
  'Kolaborasi seru bareng partner kami #collab #kopi',
  'Promo bundling 2 gelas cuma 50rb #promo #menu',
  'Fakta menarik soal biji kopi #edukasi #fakta',
  'Weekend vibes di kedai kami #lifestyle #weekend',
];

function mediaNode(i: number) {
  const isReel = i % 3 === 0;
  const isCarousel = i % 3 === 1;
  return {
    node: {
      __typename: isReel ? 'GraphVideo' : isCarousel ? 'GraphSidecar' : 'GraphImage',
      product_type: isReel ? 'clips' : null,
      shortcode: `P${100 + i}`,
      pk: String(1000 + i),
      taken_at: NOW - i * 6 * 86400 - (i % 4) * 7200,
      like_count: 120 + i * 37,
      comment_count: 6 + i,
      video_view_count: isReel ? 2200 + i * 310 : null,
      video_duration: isReel ? 12 + i : null,
      owner: { username: 'testacct', id: '1' },
      coauthor_producers: i % 4 === 0 ? [{ username: 'partner' }] : [],
      edge_media_to_caption: { edges: [{ node: { text: CAPTIONS[i] } }] },
      carousel_media_count: isCarousel ? 3 : null,
    },
  };
}

function commentNode(i: number, j: number) {
  const texts = [
    'keren banget, worth it!',
    'berapa harganya kak?',
    'mahal banget 😡',
    'mantap, recommended',
    'gimana cara ordernya?',
    'lucu banget 😂',
    '@teman coba lihat ini',
    'enak banget, suka!',
  ];
  return {
    pk: `c${i}-${j}`,
    text: texts[(i + j) % texts.length],
    created_at: NOW - i * 6 * 86400 - (i % 4) * 7200 + 600 + j * 300,
    user: { username: `fan${(i + j) % 5}` },
    comment_like_count: j,
    media_id: String(1000 + i),
  };
}

const mediaEdges = Array.from({ length: 12 }, (_, i) => mediaNode(i));
const allComments = Array.from({ length: 8 }, (_, i) =>
  Array.from({ length: 3 }, (_, j) => commentNode(i, j)),
).flat();

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const online = DAYS.flatMap((d, di) =>
  Array.from({ length: 8 }, (_, b) => ({
    dimension_values: [d, `${b * 3}-${b * 3 + 2}`],
    value: 120 + di * 18 + (b >= 3 && b <= 5 ? 220 : 0) + b * 7,
  })),
);

const insights = {
  data: {
    account_insights: {
      views_current_period: { results: [{ value: 48000 }] },
      reach_current_period: { results: [{ value: 31000 }] },
      profile_visits_count: { results: [{ value: 640 }] },
      bio_link_clicks: { results: [{ value: 96 }] },
      views_by_follow_type: {
        results: [
          { dimension_values: ['1'], value: 15000 },
          { dimension_values: ['2'], value: 33000 },
        ],
      },
      interactions_by_follow_type: {
        results: [
          { dimension_values: ['1'], value: 1400 },
          { dimension_values: ['2'], value: 900 },
        ],
      },
      online_followers: { results: online },
      gender: {
        results: [
          { dimension_values: ['F'], value: 62 },
          { dimension_values: ['M'], value: 38 },
        ],
      },
      age: {
        results: [
          { dimension_values: ['18-24'], value: 30 },
          { dimension_values: ['25-34'], value: 45 },
          { dimension_values: ['35-44'], value: 25 },
        ],
      },
      city: {
        results: [
          { dimension_values: ['Jakarta'], value: 400 },
          { dimension_values: ['Bandung'], value: 250 },
          { dimension_values: ['Surabaya'], value: 150 },
        ],
      },
      media_and_follow: {
        results: [
          { dimension_values: ['16', '1'], value: 5000 },
          { dimension_values: ['16', '2'], value: 12000 },
          { dimension_values: ['2', '1'], value: 8000 },
          { dimension_values: ['2', '2'], value: 9000 },
        ],
      },
      interactions_by_media_type: {
        results: [
          { dimension_values: ['16'], value: 1600 },
          { dimension_values: ['2'], value: 900 },
        ],
      },
      retention: [100, 88, 72, 60, 51, 44, 38, 30],
      avg_watch_time: 7.4,
    },
    top_media: Array.from({ length: 4 }, (_, i) => ({
      instagram_media_id: String(1000 + i * 3),
      creation_time: NOW - i * 6 * 86400,
      views_count: { results: [{ value: 9000 - i * 1200 }] },
      interactions_count: { results: [{ value: 1400 - i * 180 }] },
    })),
  },
};

function gql(name: string, doc: string, body: unknown, variables: Record<string, unknown> = { username: 'testacct' }) {
  const vars = encodeURIComponent(JSON.stringify(variables));
  return {
    startedDateTime: new Date(NOW * 1000).toISOString(),
    request: {
      url: `https://www.instagram.com/graphql/query/?query_hash=${doc}&variables=${vars}`,
      postData: { text: `fb_api_req_friendly_name=${name}&doc_id=${doc}&variables=${vars}` },
    },
    response: { content: { text: JSON.stringify(body) } },
  };
}

export const richHar: HarFile = {
  log: {
    entries: [
      gql('ProfilePageQuery', '111', {
        data: {
          user: {
            username: 'testacct',
            pk: '1',
            full_name: 'Test Account',
            follower_count: 12000,
            following_count: 130,
            media_count: 12,
            biography: 'Coffee & content',
            category_name: 'Food & Drink',
            is_verified: false,
            edge_owner_to_timeline_media: { count: 12, edges: mediaEdges },
          },
        },
      }),
      gql('CommentsQuery', '222', { comments: allComments }),
      gql('InsightsQuery', '333', insights),
      // Per-post Insights response: only a media id in the request variables.
      gql(
        'PostInsightsQuery',
        '444',
        {
          data: {
            media_insights: {
              views_current_period: { results: [{ value: 4800 }] },
              reach_current_period: { results: [{ value: 3000 }] },
              average_watch_time: 4.2,
              total_watch_time: 4200,
              skip_rate: 0.31,
              saves: 18,
              shares: 4,
            },
          },
        },
        { media_id: '1000' },
      ),
    ],
  },
};

export function buildRichAnalysis(locale: Locale = 'id'): {
  A: Analysis;
  t: (typeof dict)['id'];
  f: ReturnType<typeof makeFormatters>;
  locale: Locale;
} {
  const store = createStore();
  ingestHar(store, richHar, 'rich.har');

  const t = dict[locale];
  const f = makeFormatters(locale);
  const ctx = buildCtx(t, f, 12000);

  const base = analyze(store, 'testacct', [], ctx);
  const current = makeSnapshot(base);
  const previous: Snapshot = {
    ...current,
    captureTs: current.captureTs - 30 * 86400000,
    createdAt: Date.now() - 30 * 86400000,
    followers: 11000,
    avgER: 5.2,
    avgLikes: 300,
    avgComments: 9,
    avgViews: 2100,
    postsAnalyzed: 8,
    posts: [],
  };

  return { A: analyze(store, 'testacct', [previous, current], ctx), t, f, locale };
}
