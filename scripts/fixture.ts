/**
 * Synthetic Instagram HAR used by the smoke tests.
 * Mirrors the real payload shapes closely enough to exercise every detector.
 */
import { analyze, createStore, ingestHar } from '../src/lib/core';
import type { Analysis, HarFile } from '../src/lib/core/types';
import { buildCtx, dict, makeFormatters, type Locale } from '../src/lib/i18n';

const NOW = Math.floor(Date.now() / 1000);
const POST_A = NOW - 5 * 86400;
const POST_B = NOW - 3 * 86400;

const profile = {
  data: {
    user: {
      username: 'testacct',
      pk: '1',
      full_name: 'Test Account',
      follower_count: 10000,
      following_count: 120,
      media_count: 2,
      biography: 'Coffee & content',
      category_name: 'Creator',
      is_verified: true,
      edge_owner_to_timeline_media: {
        count: 2,
        edges: [
          {
            node: {
              __typename: 'GraphSidecar',
              shortcode: 'AAA1',
              pk: '123',
              taken_at: POST_A,
              like_count: 500,
              comment_count: 10,
              owner: { username: 'testacct', id: '1' },
              edge_media_to_caption: {
                edges: [{ node: { text: 'Promo kopi spesial minggu ini #kopi #promo' } }],
              },
              carousel_media_count: 3,
            },
          },
          {
            node: {
              __typename: 'GraphVideo',
              product_type: 'clips',
              shortcode: 'BBB2',
              pk: '456',
              taken_at: POST_B,
              like_count: 1000,
              comment_count: 20,
              video_view_count: 5000,
              video_duration: 15,
              owner: { username: 'testacct', id: '1' },
              edge_media_to_caption: {
                edges: [{ node: { text: 'Tips menyeduh kopi di rumah' } }],
              },
            },
          },
        ],
      },
    },
  },
};

const comments = {
  comments: [
    {
      pk: 'c1',
      text: 'keren banget, worth it!',
      created_at: POST_A + 3600,
      user: { username: 'fan1' },
      comment_like_count: 3,
      media_id: '123',
    },
    {
      pk: 'c2',
      text: 'berapa harganya kak?',
      created_at: POST_A + 7200,
      user: { username: 'fan2' },
      comment_like_count: 1,
      media_id: '123',
    },
    {
      pk: 'c3',
      text: 'mahal banget 😡',
      created_at: POST_B + 1800,
      user: { username: 'fan1' },
      comment_like_count: 0,
      media_id: '456',
    },
  ],
};

const insights = {
  data: {
    account_insights: {
      views_current_period: { results: [{ value: 12000 }] },
      reach_current_period: { results: [{ value: 9000 }] },
      profile_visits_count: { results: [{ value: 240 }] },
      views_by_follow_type: {
        results: [
          { dimension_values: ['1'], value: 8000 },
          { dimension_values: ['2'], value: 4000 },
        ],
      },
      gender: {
        results: [
          { dimension_values: ['F'], value: 60 },
          { dimension_values: ['M'], value: 40 },
        ],
      },
    },
    top_media: [
      {
        instagram_media_id: '456',
        creation_time: POST_B,
        views_count: { results: [{ value: 5000 }] },
        interactions_count: { results: [{ value: 1020 }] },
      },
    ],
  },
};

function gqlEntry(name: string, doc: string, body: unknown, at: number) {
  const vars = encodeURIComponent(JSON.stringify({ username: 'testacct' }));
  return {
    startedDateTime: new Date(at * 1000).toISOString(),
    request: {
      url: `https://www.instagram.com/graphql/query/?query_hash=${doc}&variables=${vars}`,
      postData: {
        text: `fb_api_req_friendly_name=${name}&doc_id=${doc}&variables=${vars}`,
      },
    },
    response: { content: { text: JSON.stringify(body) } },
  };
}

export const har: HarFile = {
  log: {
    entries: [
      gqlEntry('ProfilePageQuery', '111', profile, NOW),
      gqlEntry('CommentsQuery', '222', comments, NOW),
      gqlEntry('InsightsQuery', '333', insights, NOW),
    ],
  },
};

export function makeStore() {
  const store = createStore();
  ingestHar(store, har, 'fixture.har');
  return store;
}

export function buildAnalysis(locale: Locale = 'id'): {
  A: Analysis;
  t: (typeof dict)['id'];
  f: ReturnType<typeof makeFormatters>;
  locale: Locale;
} {
  const store = makeStore();
  const t = dict[locale];
  const f = makeFormatters(locale);
  const ctx = buildCtx(t, f, 10000);
  return { A: analyze(store, 'testacct', null, ctx), t, f, locale };
}

export { NOW, POST_A, POST_B };
