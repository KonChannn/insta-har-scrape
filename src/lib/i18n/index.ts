import type { ConcludeCtx, LangCode, MessageId, Msg, PostType } from '@/lib/core/types';
import { msgs, type MsgFn } from './messages';
import { ui, type Ui } from './ui';

export type Locale = 'id' | 'en';

export interface Dict {
  ui: Ui;
  msg: Record<MessageId, MsgFn>;
}

export const dict: Record<Locale, Dict> = {
  id: { ui: ui.id, msg: msgs.id },
  en: { ui: ui.en, msg: msgs.en },
};

export function renderMsg(t: Dict, m?: Msg): string {
  if (!m) return '';
  return t.msg[m.id]?.(m.p ?? {}) ?? '';
}

export interface Formatters {
  f0: (v: number | null | undefined) => string;
  f1: (v: number | null | undefined) => string;
  f2: (v: number | null | undefined) => string;
  compact: (v: number | null | undefined) => string;
  pctCh: (v: number | null | undefined) => string;
  dDate: (seconds: number | null | undefined) => string;
  dDateMs: (ms: number | null | undefined) => string;
  dTime: (seconds: number | null | undefined) => string;
  isoJkt: (seconds: number | null | undefined) => string;
}

const isNum = (v: unknown): v is number => typeof v === 'number' && isFinite(v);
const tag = (locale: Locale) => (locale === 'id' ? 'id-ID' : 'en-US');

export function makeFormatters(locale: Locale): Formatters {
  const nf0 = new Intl.NumberFormat(tag(locale), { maximumFractionDigits: 0 });
  const nf1 = new Intl.NumberFormat(tag(locale), { maximumFractionDigits: 1, minimumFractionDigits: 1 });
  const nf2 = new Intl.NumberFormat(tag(locale), { maximumFractionDigits: 2, minimumFractionDigits: 2 });
  const nfC = new Intl.NumberFormat(tag(locale), { notation: 'compact', maximumFractionDigits: 1 });
  const dtf = new Intl.DateTimeFormat(tag(locale), {
    timeZone: 'Asia/Jakarta',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const dtfT = new Intl.DateTimeFormat(tag(locale), {
    timeZone: 'Asia/Jakarta',
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

  return {
    f0: (v) => (isNum(v) ? nf0.format(Math.round(v)) : '–'),
    f1: (v) => (isNum(v) ? nf1.format(v) : '–'),
    f2: (v) => (isNum(v) ? nf2.format(v) : '–'),
    compact: (v) => (isNum(v) ? nfC.format(v) : '–'),
    pctCh: (v) => (isNum(v) ? `${v >= 0 ? '▲ +' : '▼ '}${nf2.format(v)}%` : '–'),
    dDate: (s) => (isNum(s) && s ? dtf.format(new Date(s * 1000)) : '–'),
    dDateMs: (ms) => (isNum(ms) && ms ? dtf.format(new Date(ms)) : '–'),
    dTime: (s) => (isNum(s) && s ? dtfT.format(new Date(s * 1000)) : '–'),
    isoJkt: (s) =>
      isNum(s) && s ? new Date((s + 7 * 3600) * 1000).toISOString().replace('T', ' ').slice(0, 16) : '',
  };
}

/** Build the locale-aware helpers consumed by the rule engine. */
export function buildCtx(t: Dict, f: Formatters, followers: number | null): ConcludeCtx {
  const ui = t.ui;
  return {
    f0: f.f0,
    f1: f.f1,
    f2: f.f2,
    score: (v) => (followers ? `${f.f2(v)}%` : `${f.f0(v)} ${ui.sum.interactions}`),
    day: (dow) => ui.days[dow] ?? '',
    type: (ty: PostType) => ui.types[ty],
    pillar: (key) => ui.pillars[key] || key,
    lang: (code: LangCode) => ui.langs[code],
    commentType: (key) => ui.commentTypes[key],
    tier: (key) => ui.tiers[key],
    level: (key) => ui.er.level[key],
    distLabel: (kind, label) =>
      (ui.dist as Record<string, Record<string, string>>)[kind]?.[label] ?? label,
  };
}
