/** Shared domain types for the HAR analysis engine. */

export type PostType = 'reel' | 'carousel' | 'foto';
export type CommentType = 'question' | 'tag' | 'emoji' | 'diskusi' | 'singkat';
export type Sentiment = 'pos' | 'neg' | 'neu';
export type LangCode = 'id' | 'en' | 'mixed' | 'other' | 'unknown' | 'emoji';

export type AnyRecord = Record<string, any>;

/* ------------------------------------------------------------------ */
/* Raw HAR                                                             */
/* ------------------------------------------------------------------ */

export interface HarContent {
  text?: string;
  encoding?: string;
  mimeType?: string;
  size?: number;
}

export interface HarRequest {
  url?: string;
  method?: string;
  postData?: {
    text?: string;
    params?: { name?: string; value?: string }[];
    mimeType?: string;
  };
}

export interface HarEntry {
  startedDateTime?: string;
  request?: HarRequest;
  response?: { content?: HarContent };
}

export interface HarFile {
  log?: { entries?: HarEntry[] };
}

/* ------------------------------------------------------------------ */
/* Store                                                               */
/* ------------------------------------------------------------------ */

export interface PostRecord extends AnyRecord {
  code: string;
  queries: Set<string>;
  _ts: number;
}

export interface ProfileRecord extends AnyRecord {
  username: string;
  _ts: number;
}

export interface CommentRecord {
  id: string;
  user: string;
  text: string;
  t: number | null;
  likes: number | null;
  parent: string | null;
  media: string | null;
}

export interface QueryStat {
  name: string;
  doc: string;
  kind: 'GraphQL' | 'REST';
  requests: number;
  posts: Set<string>;
  comments: number;
  profiles: number;
  insights: number;
  fails: number;
  encodings: Set<string>;
}

export interface FileInfo {
  name: string;
  entries: number;
  used: number;
  captureTs: number;
}

export interface DebugCounts {
  entries: number;
  graphql: number;
  rest: number;
  skipped: number;
  decodeFail: number;
  parseFail: number;
  emptyBody: number;
}

export interface DistItem {
  label: string;
  value: number;
}

export interface BreakdownItem {
  dims: string[];
  value: number;
}

export interface TopMediaRecord {
  id: string;
  t: number | null;
  ptype: string | null;
  views?: number;
  interacted?: number;
  reach?: number;
}

export interface FollowerSplit {
  followers: number;
  nonFollowers: number;
  n: number;
}

export interface InsightsState {
  account: Record<string, number>;
  audienceHours: number[] | null;
  audienceDays: number[] | null;
  audienceRaw: { key: string; value: string }[];
  demo: Record<string, DistItem[]>;
  followerSplit: FollowerSplit | null;
  traffic: DistItem[] | null;
  metrics: Record<string, number>;
  breakdowns: Record<string, BreakdownItem[]>;
  /** Per-post metrics keyed by media pk, for responses that only carry a media id. */
  mediaMetrics: Map<string, AnyRecord>;
  topMedia: Map<string, TopMediaRecord>;
  period: { start: number; end: number } | null;
}

export interface Store {
  posts: Map<string, PostRecord>;
  profiles: Map<string, ProfileRecord>;
  comments: Map<string, CommentRecord>;
  mediaPkToCode: Map<string, string>;
  queries: Map<string, QueryStat>;
  files: FileInfo[];
  insights: InsightsState;
  debug: DebugCounts;
  captureTs: number;
}

export interface IngestContext {
  q: QueryStat;
  ts: number;
  vars: AnyRecord;
  mediaHint: string | null;
}

/* ------------------------------------------------------------------ */
/* Analysis output                                                     */
/* ------------------------------------------------------------------ */

export interface AnalyzedPost {
  code: string;
  url: string;
  t: number;
  dow: number;
  hour: number;
  type: PostType;
  owner: string | null;
  collab: boolean;
  coauthors: string[];
  pinned: boolean;
  likesHidden: boolean;
  likes: number | null;
  comments: number | null;
  views: number | null;
  duration: number | null;
  saves: number | null;
  shares: number | null;
  reposts: number | null;
  reach: number | null;
  impressions: number | null;
  profileVisits: number | null;
  eng: number;
  er: number | null;
  erReach: number | null;
  caption: string;
  capLen: number;
  hashtags: string[];
  cta: boolean;
  hook: string;
  hookQ: boolean;
  hookNum: boolean;
  carouselCount: number | null;
  queries: string[];
  avgWatch: number | null;
  totalWatch: number | null;
  retention: number[] | null;
  skipRate: number | null;
  follows: number | null;
  linkClicks: number | null;
  pillars: string[];
}

export interface TypeStats {
  n: number;
  avgER: number | null;
  medER: number | null;
  avgLikes: number | null;
  avgComments: number | null;
  avgViews: number | null;
  avgEng: number | null;
  share: number;
}

export interface HeatCell {
  n: number;
  scores: number[];
  med: number | null;
}

export interface WorksRow {
  label: string;
  top: number | string | null;
  bot: number | string | null;
  unit?: string;
  key?: string;
  dec?: number;
}

export interface Works {
  k: number;
  rows: WorksRow[];
  topTags: { tag: string; n: number; inTop: number; avg: number }[];
  top: AnalyzedPost[];
  bot: AnalyzedPost[];
}

export interface Behavior {
  sumLikes: number;
  sumComments: number;
  commentsPer100Likes: number | null;
  likesPerComment: number | null;
  commentsN: number;
  avgLen: number | null;
  qPct: number | null;
  topCommenters: { user: string; n: number; posts: number }[];
  loyal: number;
  uniqueCommenters: number;
  sent: Record<Sentiment, number>;
  sentEx: { pos: string[]; neg: string[] };
}

export interface GrowthPoint {
  a: number | null;
  b: number | null;
  pct: number | null;
  abs?: number | null;
}

export interface Growth {
  from: number;
  to: number;
  days: number;
  followers: GrowthPoint;
  er: GrowthPoint;
  views: GrowthPoint;
  likes: GrowthPoint;
}

export interface Snapshot {
  account: string;
  captureTs: number;
  createdAt: number;
  followers: number | null;
  following: number | null;
  mediaCount: number | null;
  avgER: number | null;
  avgLikes: number | null;
  avgComments: number | null;
  avgViews: number | null;
  postsAnalyzed: number;
  freqWeek: number | null;
  posts: {
    c: string;
    t: number;
    ty: PostType;
    er: number | null;
    l: number | null;
    cm: number | null;
    v: number | null;
  }[];
}

/* ------------------------------------------------------------------ */
/* Audience output                                                     */
/* ------------------------------------------------------------------ */

export interface AudienceInsights {
  demo: Record<string, DistItem[]>;
  period: { start: number; end: number } | null;
  overview: { key: string; label: string; value: number }[];
  viewsSplit: { followers: number; nonFollowers: number; unknown: number } | null;
  interSplit: { followers: number; nonFollowers: number; unknown: number } | null;
  formatIns: { label: string; views: number | null; f: number; nf: number; inter: number | null }[];
  activeGrid: number[][] | null;
  tzShift: number | null;
  topMedia: {
    id: string;
    t: number | null;
    ptype: string | null;
    views?: number;
    interacted?: number;
    reach?: number;
    code: string | null;
    url: string | null;
    caption: string;
    type: PostType | null;
  }[];
  followerSplit: FollowerSplit | { followers: number; nonFollowers: number; unknown?: number } | null;
  traffic: DistItem[] | null;
  avgWatch: number | null;
  watchN: number;
  watchByPost: { code: string; url: string; t: number; avgWatch: number; duration: number | null }[];
  retention: number[] | null;
  profileVisits: number | null;
  follows: number | null;
  linkClicks: number | null;
  hours: number[] | null;
  days: number[] | null;
  hasDemo: boolean;
  any: boolean;
}

export interface AudienceCommentRow {
  id: string;
  user: string;
  text: string;
  t: number | null;
  likes: number | null;
  parent: string | null;
  media: string | null;
  code: string | null;
  type: CommentType;
  lang: LangCode;
  sent: Sentiment;
  delay: number | null;
  postType: PostType | null;
  postUrl: string | null;
}

export interface PublicAudience {
  n: number;
  totalComments: number;
  heat: number[][];
  dayTotals: number[];
  hourTotals: number[];
  blocks: { b: number; n: number }[];
  slots: { dow: number; hour: number; n: number }[];
  speed: {
    n: number;
    median: number;
    within1h: number;
    within24h: number;
    buckets: { label: string; value: number }[];
    firstMedian: number | null;
    postsWithComments: number;
  } | null;
  ratio: {
    likes: number;
    comments: number;
    saves: number | null;
    shares: number | null;
    reposts: number | null;
    per100: Record<'comments' | 'saves' | 'shares' | 'reposts', number | null>;
  };
  types: { key: CommentType; label: string; value: number; ex: string[] }[];
  sent: Record<Sentiment, number>;
  sentEx: { pos: string[]; neg: string[] };
  langs: DistItem[];
  langKnown: DistItem[];
  formats: {
    type: PostType;
    n: number;
    medScore: number | null;
    avgLikes: number | null;
    avgComments: number | null;
    avgViews: number | null;
    c100: number | null;
    read: number;
    posPct: number | null;
  }[];
  favFormat: PublicAudience['formats'][number] | null;
  talkFormat: PublicAudience['formats'][number] | null;
  pillars: {
    key: string;
    label: string;
    n: number;
    share: number;
    medScore: number | null;
    avgComments: number | null;
    c100: number | null;
    read: number;
    posPct: number | null;
  }[];
  commenters: {
    user: string;
    n: number;
    posts: number;
    first: number | null;
    last: number | null;
    pos: number;
    neg: number;
    q: number;
    repeat: boolean;
  }[];
  loyal: {
    unique: number;
    repeat: number;
    repeatPct: number | null;
    commentsFromRepeatPct: number | null;
    rule: 'multi' | 'single';
    postsWithRead: number;
  };
  interest: {
    topics: PublicAudience['pillars'];
    commentThemes: { label: string; value: number }[];
    words: { label: string; value: number }[];
    emojis: { label: string; value: number }[];
    hashtags: { tag: string; n: number; med: number | null }[];
  };
  ownReplies: number;
  replyPerAud: number | null;
  rows: AudienceCommentRow[];
}

export interface Conclusion {
  text: Msg;
  why?: Msg;
  whyRaw?: string;
  src?: 'ins' | 'pub';
}

export interface Msg {
  id: MessageId;
  p?: Record<string, any>;
}

export type MessageId =
  | 'erBench'
  | 'erNoFollowers'
  | 'collabGain'
  | 'typeBest'
  | 'recMoreType'
  | 'dayTime'
  | 'recSchedule'
  | 'frequency'
  | 'recFreqUp'
  | 'recFreqDown'
  | 'worksPattern'
  | 'recCta'
  | 'recCaptionLong'
  | 'recCaptionShort'
  | 'recDuration'
  | 'recCollab'
  | 'conversation'
  | 'recConversation'
  | 'sentimentSummary'
  | 'recFaq'
  | 'growthFollowers'
  | 'recHashtags'
  | 'recViewsMissing'
  | 'audDemo'
  | 'audLang'
  | 'audNonFollower'
  | 'audFormat'
  | 'audTopics'
  | 'audHoursIns'
  | 'audHoursPub'
  | 'audInteraction'
  | 'noPosts'
  | 'whyErBench'
  | 'whyErNoFollowers'
  | 'whyCollab'
  | 'whyTypeBest'
  | 'whyRecType'
  | 'whyDayTime'
  | 'whyRecSchedule'
  | 'whyFrequency'
  | 'whyRecFreqUp'
  | 'whyRecFreqDown'
  | 'whyWorks'
  | 'whyRecCta'
  | 'whyRecCaption'
  | 'whyRecDuration'
  | 'whyRecCollab'
  | 'whyConversation'
  | 'whyRecConversation'
  | 'whySentiment'
  | 'whyRecFaq'
  | 'whyGrowth'
  | 'whyRecHashtags'
  | 'whyRecViews';

export interface Analysis {
  aud: {
    ins: AudienceInsights;
    pub: PublicAudience;
    conclusions: Conclusion[];
  };
  account: string;
  profile: ProfileRecord;
  followers: number | null;
  posts: AnalyzedPost[];
  ranked: AnalyzedPost[];
  top5: AnalyzedPost[];
  bottom5: AnalyzedPost[];
  top10: AnalyzedPost[];
  bottom10: AnalyzedPost[];
  summary: {
    n: number;
    pinned: number;
    avgER: number | null;
    medER: number | null;
    avgERReach: number | null;
    nSolo: number;
    nCollab: number;
    avgERSolo: number | null;
    medERSolo: number | null;
    avgERCollab: number | null;
    medERCollab: number | null;
    avgEngSolo: number | null;
    avgEngCollab: number | null;
    avgLikes: number | null;
    avgComments: number | null;
    avgViews: number | null;
    viewsN: number;
    avgEng: number | null;
    freqWeek: number | null;
    last30: number;
    from: number | null;
    to: number | null;
    spanDays: number;
    tier: { key: 'nano' | 'micro' | 'mid' | 'macro'; t: number[] } | null;
    label: { key: 'low' | 'avg' | 'good' | 'great' } | null;
  };
  byType: Record<PostType, TypeStats>;
  heat: HeatCell[][];
  byDay: { k: number; n: number; avg: number | null }[];
  byBlock: { k: number; n: number; avg: number | null }[];
  overallAvg: number | null;
  commentHeat: number[][];
  audSource: 'insights' | 'comments' | null;
  comments: AudienceCommentRow[];
  behavior: Behavior;
  works: Works | null;
  insightsAvail: {
    reach: boolean;
    impressions: boolean;
    saves: boolean;
    shares: boolean;
    profile_visits: boolean;
    audience: boolean;
    reposts: boolean;
  };
  insightTotals: {
    reach: number | null;
    impressions: number | null;
    saves: number | null;
    shares: number | null;
    profile_visits: number | null;
    reposts: number | null;
    repostsN: number;
    account: Record<string, number>;
    audienceRaw: { key: string; value: string }[];
    audienceHours: number[] | null;
  };
  growth: Growth | null;
  snapshots: Snapshot[];
  captureTs: number;
  excluded: number;
  scoreLabel: 'ER' | 'Engagement';
  conclusions: { ins: Conclusion[]; recs: Conclusion[] };
  debug: {
    files: FileInfo[];
    counts: DebugCounts;
    queries: {
      name: string;
      doc: string;
      kind: string;
      requests: number;
      posts: number;
      comments: number;
      profiles: number;
      insights: number;
      fails: number;
      encodings: string;
    }[];
    totalPosts: number;
    accountPosts: number;
    excluded: number;
    comments: number;
    accountComments: number;
    fields: { key: string; label: string; n: number; of: number }[];
    profFields: { label: string; ok: boolean }[];
    missing: string[];
  };
  [key: string]: any;
}

export interface AccountOption {
  username: string;
  posts: number;
  followers: number | null;
}

export interface ConcludeCtx {
  f0: (v: number | null | undefined) => string;
  f1: (v: number | null | undefined) => string;
  f2: (v: number | null | undefined) => string;
  /** "3.20%" or "1,234 interactions", depending on locale + follower data. */
  score: (v: number | null | undefined) => string;
  day: (dow: number) => string;
  type: (t: PostType) => string;
  pillar: (key: string) => string;
  lang: (code: LangCode) => string;
  commentType: (key: CommentType) => string;
  tier: (key: 'nano' | 'micro' | 'mid' | 'macro') => string;
  level: (key: 'low' | 'avg' | 'good' | 'great') => string;
  distLabel: (kind: string, label: string) => string;
}
