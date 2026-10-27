import type { HarContent } from './types';

/** Decode a HAR response body, tolerating base64 and missing content. */
export function decodeContent(c: HarContent | undefined): string | null {
  if (!c || typeof c.text !== 'string' || !c.text) return '';
  if (c.encoding === 'base64') {
    try {
      const bin = atob(c.text);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      return new TextDecoder('utf-8').decode(bytes);
    } catch {
      return null;
    }
  }
  return c.text;
}

const stripGuard = (s: string) => s.replace(/^\s*for\s*\(;;\);/, '');

function tryJSON(s: string): any | undefined {
  try {
    return JSON.parse(s);
  } catch {
    return undefined;
  }
}

/**
 * A single HAR body may contain one JSON document, a multipart payload, or a
 * newline-delimited stream of JSON objects. Collect everything parseable.
 */
export function parseBodies(text: string): any[] {
  let t = stripGuard(text || '').trim();
  if (!t) return [];
  const whole = tryJSON(t);
  if (whole !== undefined) return [whole];

  const out: any[] = [];
  const parts = /\r?\n--[^\r\n]*/.test(t) ? t.split(/\r?\n?--[-\w=.]*\r?\n/) : [t];
  for (let p of parts) {
    const hdr = p.search(/\r?\n\r?\n/);
    if (hdr >= 0 && /^\s*content-type/i.test(p)) p = p.slice(hdr).trim();
    p = stripGuard(p).trim();
    if (!p) continue;
    const j = tryJSON(p);
    if (j !== undefined) {
      out.push(j);
      continue;
    }
    // streaming: one JSON document per line
    for (const line of p.split(/\r?\n/)) {
      const l = stripGuard(line).trim();
      if (l[0] === '{' || l[0] === '[') {
        const lj = tryJSON(l);
        if (lj !== undefined) out.push(lj);
      }
    }
  }
  return out;
}
