import type { PostType } from './types';

/** Asia/Jakarta, no DST. */
export const TZ_OFFSET = 7 * 3600;

export const TYPES: PostType[] = ['reel', 'carousel', 'foto'];

export const TYPE_NAME: Record<PostType, string> = {
  reel: 'Reel',
  carousel: 'Carousel',
  foto: 'Foto',
};

export const DAY_NAMES = [
  ['monday', 'senin', 'mon'],
  ['tuesday', 'selasa', 'tue'],
  ['wednesday', 'rabu', 'wed'],
  ['thursday', 'kamis', 'thu'],
  ['friday', 'jumat', 'fri'],
  ['saturday', 'sabtu', 'sat'],
  ['sunday', 'minggu', 'sun'],
];

export const DAY_ABBR: Record<string, number> = {
  mon: 0,
  tue: 1,
  wed: 2,
  thu: 3,
  fri: 4,
  sat: 5,
  sun: 6,
};

/**
 * Content pillars. Detection is keyword-based and intentionally multi-label:
 * a post can be both "promo" and "kuliner".
 */
export const PILLARS: [key: string, label: string, re: RegExp][] = [
  ['promo', 'Promo & penawaran', /promo|diskon|discount|\bsale\b|gratis|\bfree\b|voucher|cashback|bundling|\bharga\b|\bprice\b|murah|\d+\s?% ?off|buy 1|beli 1|giveaway/i],
  ['produk', 'Produk / menu', /\bmenu\b|produk|product|new arrival|launch|varian|\brasa\b|flavou?r|koleksi|collection|ready stock|best ?seller|signature/i],
  ['edukasi', 'Edukasi & tips', /\btips?\b|\bcara\b|how to|tutorial|resep|recipe|panduan|guide|fakta|tahukah|did you know|belajar|\bstep\b|rekomendasi/i],
  ['review', 'Review & testimoni', /review|testimoni|ulasan|kata mereka|pelanggan|customer|unboxing|cobain|nyobain|first impression|jujur/i],
  ['kuliner', 'Kuliner & makanan', /makan|kuliner|\bfood|kopi|coffee|resto|\bcafe|jajan|mukbang|masak|cooking|dessert|minuman|sarapan|breakfast|lunch|dinner|foodie/i],
  ['lifestyle', 'Lifestyle & keseharian', /daily|sehari|vlog|routine|rutinitas|weekend|day in|keseharian|\blife\b|grwm|get ready/i],
  ['humor', 'Humor & hiburan', /wkwk|haha|lucu|kocak|ngakak|prank|meme|funny|\blol\b|sketsa|komedi/i],
  ['trend', 'Trend & challenge', /challenge|\btrend|viral|\bfyp\b|\bpov\b|transition|sound/i],
  ['keluarga', 'Keluarga & relationship', /family|keluarga|\banak\b|mama|papa|\bibu\b|ayah|suami|istri|pacar|couple|\bbaby\b|parenting|mertua|adik|kakak/i],
  ['beauty', 'Beauty & fashion', /skincare|make ?up|beauty|outfit|fashion|ootd|glow|serum|lipsti|hijab|style/i],
  ['travel', 'Travel & tempat', /travel|liburan|\btrip\b|staycation|jalan-jalan|hotel|pantai|explore|hidden gem|lokasi|tempat baru|spot/i],
  ['event', 'Event & momen', /\bevent|acara|grand opening|opening|launching|anniversary|lebaran|ramadan|natal|christmas|imlek|merdeka|halloween|valentine/i],
  ['bts', 'Behind the scenes', /behind the scene|\bbts\b|proses|process|dapur|kitchen|persiapan|making of/i],
  ['collab', 'Kolaborasi & endorse', /#ad\b|#endorse|paid partnership|sponsored|endorse|bekerja sama|in collaboration/i],
];

export const PILLAR_LABEL: Record<string, string> = {
  ...Object.fromEntries(PILLARS.map(([k, l]) => [k, l])),
  lainnya: 'Lainnya / tidak terklasifikasi',
};

export const COMMENT_TYPES: Record<string, string> = {
  question: 'Pertanyaan',
  tag: 'Tag teman',
  emoji: 'Emoji saja',
  diskusi: 'Diskusi / opini',
  singkat: 'Reaksi singkat',
};

/** Metric synonyms found across Instagram's GraphQL and REST payloads. */
export const INSIGHT_KEYS: Record<string, string> = {
  reach: 'reach',
  reach_count: 'reach',
  accounts_reached: 'reach',
  reach_total: 'reach',
  impressions: 'impressions',
  impression_count: 'impressions',
  impressions_count: 'impressions',
  views_count: 'impressions',
  saves: 'saves',
  save_count: 'saves',
  saved_count: 'saves',
  saved: 'saves',
  shares: 'shares',
  share_count: 'shares',
  shares_count: 'shares',
  skip_rate: 'skip_rate',
  reels_skip_rate: 'skip_rate',
  skip_rate_percentage: 'skip_rate',
  avg_skip_rate: 'skip_rate',
  profile_visits: 'profile_visits',
  profile_visits_count: 'profile_visits',
  profile_views: 'profile_visits',
  website_clicks: 'link_clicks',
  link_clicks: 'link_clicks',
  bio_link_clicked: 'link_clicks',
  bio_link_clicks: 'link_clicks',
  profile_links_taps: 'link_clicks',
  external_link_taps: 'link_clicks',
  link_taps: 'link_clicks',
  accounts_engaged: 'accounts_engaged',
  total_interactions: 'total_interactions',
  follows: 'follows',
  follows_count: 'follows',
};

export const METRIC_LABEL: Record<string, string> = {
  views_current_period: 'Views',
  reach_current_period: 'Accounts reached',
  viewers_current_period: 'Akun yang menonton (viewers)',
  fb_views_current_period: 'Views dari Facebook (crosspost)',
  total_interactions: 'Total interaksi',
  engaged_accounts: 'Accounts engaged',
  profile_visits_count: 'Profile visits',
  bio_link_clicks: 'Klik link di bio',
  contact_button_clicks: 'Klik tombol kontak',
};

/**
 * Account-level result-set keys that should map onto per-post fields when the
 * response carries a media id.
 */
export const PERIOD_METRIC_MAP: Record<string, string> = {
  views_current_period: 'impressions',
  reach_current_period: 'reach',
  viewers_current_period: 'viewers',
  fb_views_current_period: 'impressions',
  total_interactions: 'total_interactions',
  engaged_accounts: 'accounts_engaged',
  profile_visits_count: 'profile_visits',
  bio_link_clicks: 'link_clicks',
  contact_button_clicks: 'contact_clicks',
  average_watch_time: 'avgWatch',
  ig_reels_avg_watch_time: 'avgWatch',
  total_watch_time: 'totalWatch',
  ig_reels_video_view_total_time: 'totalWatch',
  skip_rate: 'skip_rate',
  reels_skip_rate: 'skip_rate',
};

export const FOLLOW_TYPE: Record<string, string> = {
  '0': 'Tidak diketahui',
  '1': 'Followers',
  '2': 'Non-followers',
};

export const MEDIA_PT: Record<string, string> = {
  '1': 'Live',
  '2': 'Post (foto/carousel)',
  '3': 'Stories',
  '5': 'Video',
  '16': 'Reels',
};

export const TRAFFIC_KEY =
  /^(explore|home|feed|home_feed|reels|reels_tab|clips|hashtag|hashtags|profile|search|stories|story|other|others)(_(count|value|reach|impressions|pct|percentage))?$/i;

export const DIST_LABEL_KEYS = [
  'label',
  'key',
  'name',
  'dimension_value',
  'bucket',
  'age_range',
  'gender',
  'city',
  'country',
  'title',
  'source',
  'surface',
  'type',
];

export const DIST_VAL_KEYS = ['value', 'count', 'percentage', 'percent', 'share', 'total', 'reach', 'impressions'];
