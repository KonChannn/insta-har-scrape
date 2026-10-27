import { parseBodies, decodeContent } from './decode';
import { walk } from './extract';
import type { AnyRecord, FileInfo, HarEntry, HarFile, HarRequest, QueryStat, Store } from './types';

const REST_RE =
  /\/api\/v1\/(feed\/user\/|users\/web_profile_info|users\/\d+\/info|media\/\d+\/(comments|info)|clips\/user|feed\/reels_media)|web_profile_info|\/api\/v1\/insights|\/api\/v1\/business/;

/**
 * Extract only the GraphQL metadata we need. Headers, cookies and tokens are
 * intentionally ignored — this is what makes the tool safe to run on a HAR.
 */
export function requestMeta(req: HarRequest): { name: string; doc: string; vars: AnyRecord } {
  const p = new URLSearchParams();
  const pd = req.postData || {};
  // postData.text is already decoded by URLSearchParams; HAR `params` may be
  // URL-encoded, so decode defensively.
  if (typeof pd.text === 'string' && pd.text.includes('=')) {
    try {
      new URLSearchParams(pd.text).forEach((v, k) => p.append(k, v));
    } catch {
      /* ignore malformed body */
    }
  } else if (Array.isArray(pd.params)) {
    const dec = (v: unknown) => {
      try {
        return decodeURIComponent(String(v || '').replace(/\+/g, ' '));
      } catch {
        return String(v || '');
      }
    };
    pd.params.forEach((x) => x && x.name && p.append(dec(x.name), dec(x.value)));
  }
  try {
    new URL(req.url || '').searchParams.forEach((v, k) => p.append(k, v));
  } catch {
    /* relative or malformed URL */
  }

  let vars: AnyRecord = {};
  const vs = p.get('variables');
  if (vs) vars = (() => {
    try {
      return JSON.parse(vs);
    } catch {
      return {};
    }
  })();

  return {
    name: p.get('fb_api_req_friendly_name') || p.get('query_name') || '',
    doc: p.get('doc_id') || p.get('query_hash') || p.get('query_id') || '',
    vars,
  };
}

export function ingestHar(store: Store, har: HarFile, fileName: string): FileInfo {
  const entries = har && har.log && Array.isArray(har.log.entries) ? har.log.entries : null;
  if (!entries) throw new Error('Not a valid HAR file (log.entries not found).');

  const finfo: FileInfo = { name: fileName, entries: entries.length, used: 0, captureTs: 0 };

  for (const e of entries) {
    store.debug.entries++;
    const url = (e.request && e.request.url) || '';
    const ts = Date.parse(e.startedDateTime || '') || 0;
    if (ts > finfo.captureTs) finfo.captureTs = ts;

    const isG = /\/graphql\/query|\/api\/graphql/.test(url);
    const isR = !isG && /instagram\.com/.test(url) && REST_RE.test(url);
    if (!isG && !isR) {
      store.debug.skipped++;
      continue;
    }
    if (isG) store.debug.graphql++;
    else store.debug.rest++;
    finfo.used++;

    let name: string;
    let doc: string;
    let vars: AnyRecord = {};
    if (isG) {
      ({ name, doc, vars } = requestMeta(e.request || {}));
    } else {
      let path = url;
      try {
        path = new URL(url).pathname;
      } catch {
        /* keep full url */
      }
      name = 'REST ' + path.replace(/\d{5,}/g, '{id}').replace(/\/[^/]+_\d+\//, '/{id}/');
      doc = '-';
    }

    const qkey = (name || '(tanpa nama)') + '|' + (doc || '?');
    let q = store.queries.get(qkey);
    if (!q) {
      q = {
        name: name || '(tanpa nama)',
        doc: doc || '?',
        kind: isG ? 'GraphQL' : 'REST',
        requests: 0,
        posts: new Set(),
        comments: 0,
        profiles: 0,
        insights: 0,
        fails: 0,
        encodings: new Set(),
      } satisfies QueryStat;
      store.queries.set(qkey, q);
    }
    q.requests++;

    const c = (e.response && e.response.content) || {};
    q.encodings.add(c.encoding || 'plain');

    const body = decodeContent(c);
    if (body === null) {
      store.debug.decodeFail++;
      q.fails++;
      continue;
    }
    if (!body) {
      store.debug.emptyBody++;
      q.fails++;
      continue;
    }
    const objs = parseBodies(body);
    if (!objs.length) {
      store.debug.parseFail++;
      q.fails++;
      continue;
    }

    let mediaHint: string | null = vars.media_id || vars.mediaID || vars.media_pk || null;
    const mm = /\/media\/(\d+)\//.exec(url);
    if (mm) mediaHint = mm[1];

    const ctx = {
      q,
      ts,
      vars,
      mediaHint: mediaHint ? String(mediaHint).split('_')[0] : null,
    };
    for (const o of objs) walk(store, o, ctx, null, null, 0);
  }

  if (finfo.captureTs > store.captureTs) store.captureTs = finfo.captureTs;
  store.files.push(finfo);
  return finfo;
}

export type { HarEntry };
