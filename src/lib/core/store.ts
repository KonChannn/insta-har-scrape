import type { Store } from './types';

/** Fresh, isolated store for one upload session. */
export function createStore(): Store {
  return {
    posts: new Map(),
    profiles: new Map(),
    comments: new Map(),
    mediaPkToCode: new Map(),
    queries: new Map(),
    files: [],
    insights: {
      account: {},
      audienceHours: null,
      audienceDays: null,
      audienceRaw: [],
      demo: {},
      followerSplit: null,
      traffic: null,
      metrics: {},
      breakdowns: {},
      mediaMetrics: new Map(),
      topMedia: new Map(),
      period: null,
    },
    debug: {
      entries: 0,
      graphql: 0,
      rest: 0,
      skipped: 0,
      decodeFail: 0,
      parseFail: 0,
      emptyBody: 0,
    },
    captureTs: 0,
  };
}
