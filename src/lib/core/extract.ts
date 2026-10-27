import { addTopMedia, collectInsights } from './insights';
import { num } from './util';
import type {
  AnyRecord,
  CommentRecord,
  IngestContext,
  PostRecord,
  PostType,
  ProfileRecord,
  Store,
} from './types';

/** ISO-8601 duration (PT1M30S) → seconds. Used by some reel payloads. */
export function isoDur(s: string | undefined): number | null {
  const m = /PT(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?/.exec(s || '');
  if (!m) return null;
  const v = (+m[1] || 0) * 3600 + (+m[2] || 0) * 60 + (+m[3] || 0);
  return v > 0 ? v : null;
}

/**
 * Merge a freshly parsed record into an existing one. Later responses win for
 * numbers/strings; for arrays the longer version is kept (more complete page).
 */
export function mergeInto(target: AnyRecord, src: AnyRecord, newer: boolean): void {
  for (const k in src) {
    const v = src[k];
    if (v == null || v === '') continue;
    if (target[k] == null || target[k] === '') target[k] = v;
    else if (Array.isArray(v)) {
      if (v.length > target[k].length) target[k] = v;
    } else if (typeof v === 'string') {
      if (newer || v.length > target[k].length) target[k] = v;
    } else if (typeof v === 'number' && newer) target[k] = v;
    else if (typeof v === 'boolean') target[k] = target[k] || v;
  }
}

export function isMedia(o: AnyRecord): boolean {
  return (
    (typeof o.code === 'string' || typeof o.shortcode === 'string') &&
    (o.taken_at != null || o.taken_at_timestamp != null) &&
    ('media_type' in o ||
      '__typename' in o ||
      'like_count' in o ||
      'edge_media_preview_like' in o ||
      'edge_liked_by' in o)
  );
}

export function isProfile(o: AnyRecord): boolean {
  return (
    typeof o.username === 'string' &&
    (num(o.follower_count) != null ||
      num(o.edge_followed_by) != null ||
      (num(o.media_count) != null && 'biography' in o))
  );
}

export function isComment(o: AnyRecord): boolean {
  const u = o.user || o.owner;
  return (
    typeof o.text === 'string' &&
    (o.created_at != null || o.created_at_utc != null) &&
    !!u &&
    typeof u.username === 'string' &&
    !o.code &&
    !o.shortcode &&
    o.media_type == null
  );
}

function classifyType(o: AnyRecord): PostType {
  const pt = o.product_type;
  const mt = o.media_type;
  const tn = o.__typename;
  if (pt === 'clips' || pt === 'igtv') return 'reel';
  if (
    mt === 8 ||
    pt === 'carousel_container' ||
    tn === 'GraphSidecar' ||
    tn === 'XDTGraphSidecar' ||
    (Array.isArray(o.carousel_media) && o.carousel_media.length) ||
    o.edge_sidecar_to_children
  )
    return 'carousel';
  if (mt === 2 || o.is_video === true || tn === 'GraphVideo') return 'reel';
  return 'foto';
}

export function addMedia(store: Store, o: AnyRecord, ctx: IngestContext): PostRecord {
  const code: string = o.code || o.shortcode;
  const owner = o.user || o.owner || {};
  let caption = '';
  if (o.caption && typeof o.caption.text === 'string') caption = o.caption.text;
  else if (typeof o.caption === 'string') caption = o.caption;
  else {
    try {
      caption = o.edge_media_to_caption.edges[0].node.text || '';
    } catch {
      /* no caption */
    }
  }

  const rec: AnyRecord = {
    code,
    pk: o.pk ? String(o.pk) : o.id ? String(o.id).split('_')[0] : null,
    t: num(o.taken_at, o.taken_at_timestamp),
    type: classifyType(o),
    productType: o.product_type || o.__typename || null,
    owner: owner.username || null,
    ownerId: owner.pk
      ? String(owner.pk)
      : owner.id
        ? String(owner.id)
        : o.owner_id && o.owner_id.pk
          ? String(o.owner_id.pk)
          : null,
    coauthors: (o.coauthor_producers || []).map((x: AnyRecord) => x && x.username).filter(Boolean),
    likes: num(o.like_count, o.edge_media_preview_like, o.edge_liked_by),
    comments: num(o.comment_count, o.edge_media_to_comment, o.edge_media_to_parent_comment),
    views: num(
      o.play_count,
      o.ig_play_count,
      o.clips_play_count,
      o.video_play_count,
      o.view_count,
      o.video_view_count,
    ),
    duration:
      num(o.video_duration) ??
      isoDur((/mediaPresentationDuration="([^"]+)"/.exec(o.video_dash_manifest || '') || [])[1]),
    saves: num(o.save_count, o.saved_count),
    shares: num(o.share_count, o.reshare_count, o.direct_share_count),
    reposts: num(o.media_repost_count),
    caption,
    pinned:
      (Array.isArray(o.timeline_pinned_user_ids) && o.timeline_pinned_user_ids.length > 0) ||
      o.is_pinned === true ||
      null,
    likesHidden: o.like_and_view_counts_disabled === true || null,
    carouselCount: num(o.carousel_media_count) ?? (Array.isArray(o.carousel_media) ? o.carousel_media.length : null),
    paidPartnership: o.is_paid_partnership === true || null,
  };

  let p = store.posts.get(code);
  if (!p) {
    p = { code, queries: new Set(), _ts: 0 } as PostRecord;
    store.posts.set(code, p);
  }
  const newer = ctx.ts >= p._ts;
  mergeInto(p, rec, newer);
  if (newer) p._ts = ctx.ts;
  p.queries.add(ctx.q.name);
  ctx.q.posts.add(code);
  if (rec.pk) store.mediaPkToCode.set(rec.pk, code);
  return p;
}

export function addProfile(store: Store, o: AnyRecord, ctx: IngestContext): void {
  const rec: AnyRecord = {
    username: o.username,
    id: o.pk ? String(o.pk) : o.id ? String(o.id) : null,
    fullName: o.full_name || '',
    followers: num(o.follower_count, o.edge_followed_by),
    following: num(o.following_count, o.edge_follow),
    mediaCount: num(o.media_count, o.edge_owner_to_timeline_media),
    bio: typeof o.biography === 'string' ? o.biography : '',
    category: o.category || o.category_name || o.business_category_name || '',
    verified: o.is_verified === true || null,
    isPrivate: o.is_private === true || null,
    clipsCount: num(o.total_clips_count),
  };
  let p = store.profiles.get(o.username);
  if (!p) {
    p = { username: o.username, _ts: 0 } as ProfileRecord;
    store.profiles.set(o.username, p);
  }
  const newer = ctx.ts >= p._ts;
  mergeInto(p, rec, newer);
  if (newer) p._ts = ctx.ts;
  ctx.q.profiles++;
}

export function addComment(
  store: Store,
  o: AnyRecord,
  ctx: IngestContext,
  media: PostRecord | null,
): void {
  const u = o.user || o.owner;
  const id = String(
    o.pk || o.id || u.username + '|' + (o.created_at || o.created_at_utc) + '|' + o.text.slice(0, 30),
  );
  if (store.comments.has(id)) return;
  let mediaRef = media ? media.code : null;
  if (!mediaRef) {
    const mid = o.media_id ? String(o.media_id).split('_')[0] : ctx.mediaHint;
    mediaRef = mid ? 'pk:' + mid : null;
  }
  const rec: CommentRecord = {
    id,
    user: u.username,
    text: o.text,
    t: num(o.created_at, o.created_at_utc),
    likes: num(o.comment_like_count, o.edge_liked_by),
    parent: o.parent_comment_id ? String(o.parent_comment_id) : null,
    media: mediaRef,
  };
  store.comments.set(id, rec);
  ctx.q.comments++;
}

/**
 * Recursive, schema-agnostic traversal. Every object that looks like a post,
 * profile, comment, or insights block is picked up; the nearest post is carried
 * down as context so nested metrics attach to the right media.
 */
export function walk(
  store: Store,
  o: unknown,
  ctx: IngestContext,
  key: string | null,
  media: PostRecord | null,
  depth: number,
): void {
  if (depth > 80 || o == null || typeof o !== 'object') return;
  if (Array.isArray(o)) {
    for (const v of o) walk(store, v, ctx, key, media, depth + 1);
    return;
  }

  const obj = o as AnyRecord;
  let m = media;

  if (obj.instagram_media_id != null && obj.creation_time != null) {
    addTopMedia(store, obj, ctx);
    return;
  }
  if (isMedia(obj)) m = addMedia(store, obj, ctx);
  else if (isProfile(obj)) addProfile(store, obj, ctx);
  else if (key !== 'caption' && key !== 'edge_media_to_caption' && isComment(obj))
    addComment(store, obj, ctx, media);

  collectInsights(store, obj, ctx, m, key);

  for (const k in obj) {
    const v = obj[k];
    if (v && typeof v === 'object') walk(store, v, ctx, k, m, depth + 1);
  }
}
