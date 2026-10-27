import { PILLARS, TZ_OFFSET } from './constants';
import type { CommentType, LangCode, Sentiment } from './types';

export const HASHTAG_RE = /#([\p{L}\p{N}_]+)/gu;

export const CTA_RE =
  /(link (di|in) bio|klik|cek (di|link|bio)|check (out|the link)|komen|comment|tulis di kolom|kolom komentar|tag (teman|temen|bestie|sahabat|your|a friend)|\bshare\b|bagikan|\bsave\b|simpan post|follow|ikuti|\bdm\b|direct message|order|pesan sekarang|\bbeli\b|daftar|register|swipe|geser|kunjungi|visit|hubungi|whatsapp|\bwa\b|chat (kami|admin)|reservasi|booking|book now|\bshop\b|\byuk\b|\bayo\b|jangan lupa|coba(in)? sekarang|grab (it|yours))/i;

export const Q_RE =
  /\?|^(apa|apakah|gimana|bagaimana|berapa|kapan|dimana|di mana|kok|kenapa|mengapa|siapa|bisa|boleh|ada ga|ada gak)\b|\b(how|what|where|when|why|which|can i|is it|harga(nya)?|pricelist|price)\b/i;

const POS_WORDS = [
  'bagus', 'keren', 'mantap', 'mantul', 'cantik', 'suka', 'enak', 'lucu', 'gemes', 'gemas', 'love', 'best',
  'top', 'recommended', 'rekomen', 'worth', 'puas', 'terima kasih', 'makasih', 'thanks', 'thank you',
  'amazing', 'beautiful', 'great', 'nice', 'good', 'wow', 'perfect', 'cakep', 'ganteng', 'seru', 'inspiratif',
  'membantu', 'helpful', 'favorit', 'fav', 'setuju', 'sukses', 'luar biasa', 'indah', 'mantab', 'asik', 'asyik',
  'kece', 'juara', 'the best', 'congrats', 'selamat', 'yummy', 'delicious', 'lovely', 'cute', 'awesome',
  'pretty', 'gorgeous', 'slay', 'cool', 'legit', 'nagih', 'bangga', 'proud',
];

const NEG_WORDS = [
  'jelek', 'buruk', 'kecewa', 'mahal', 'lambat', 'parah', 'bohong', 'nipu', 'penipu', 'zonk', 'kurang', 'benci',
  'hate', 'bad', 'worst', 'terrible', 'disappointed', 'scam', 'fake', 'ugly', 'boring', 'rugi', 'males', 'malas',
  'sebel', 'kesel', 'kesal', 'lama banget', 'gak jelas', 'ga jelas', 'nggak jelas', 'tidak jelas', 'overprice',
  'overpriced', 'mengecewakan', 'basi', 'hambar', 'komplain', 'complain', 'refund', 'gak dibales', 'ga dibales',
  'tidak dibalas', 'sampah', 'awful', 'poor', 'annoying', 'sad', 'sedih',
];

const NEGATORS = /\b(tidak|tdk|gak|ga|nggak|ngga|enggak|bukan|kurang|not|no|never|don'?t|isn'?t)\s+$/i;
const POS_EMO = /[❤️😍🥰🔥👏💯😘🤩✨👍💕💖💗🙌😻🥳😁😊🤤🙏]/u;
const NEG_EMO = /[😡😠👎🤮😤💩😒😞😢😭🙄]/u;

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const POS_RE = new RegExp('(^|[^\\p{L}])(' + POS_WORDS.map(esc).join('|') + ')(?=$|[^\\p{L}])', 'giu');
const NEG_RE = new RegExp('(^|[^\\p{L}])(' + NEG_WORDS.map(esc).join('|') + ')(?=$|[^\\p{L}])', 'giu');

/**
 * Coarse lexicon sentiment. Handles simple negation ("tidak bagus") and adds a
 * single point for a strong emoji. Deliberately cheap so it runs on-device.
 */
export function sentiment(text: string): Sentiment {
  const t = text.toLowerCase();
  let s = 0;
  let m: RegExpExecArray | null;
  POS_RE.lastIndex = 0;
  while ((m = POS_RE.exec(t))) {
    const before = t.slice(0, m.index + m[1].length);
    s += NEGATORS.test(before) ? -1 : 1;
  }
  NEG_RE.lastIndex = 0;
  while ((m = NEG_RE.exec(t))) {
    const before = t.slice(0, m.index + m[1].length);
    s += NEGATORS.test(before) && m[2] !== 'kurang' ? 1 : -1;
  }
  if (POS_EMO.test(text)) s += 1;
  if (NEG_EMO.test(text)) s -= 1;
  return s > 0 ? 'pos' : s < 0 ? 'neg' : 'neu';
}

export function firstSentence(cap: string): string {
  const line = (cap || '').split(/\n/).map((x) => x.trim()).find(Boolean) || '';
  const m = /^(.+?[.!?])(\s|$)/.exec(line);
  return (m ? m[1] : line).slice(0, 200);
}

/** Convert an epoch-seconds timestamp to Jakarta day-of-week + hour. */
export function jkt(t: number): { dow: number; hour: number } {
  const d = new Date((t + TZ_OFFSET) * 1000);
  return { dow: (d.getUTCDay() + 6) % 7, hour: d.getUTCHours() };
}

export function classifyComment(c: { text?: string; parent?: string | null }, account: string): CommentType {
  const t = (c.text || '').trim();
  if (!/[\p{L}\p{N}]/u.test(t)) return 'emoji';
  const mentions = (t.match(/@[\w.]+/g) || []).filter(
    (m) => m.slice(1).toLowerCase() !== String(account || '').toLowerCase(),
  );
  if (mentions.length && !c.parent) return 'tag';
  if (Q_RE.test(t)) return 'question';
  if ((t.match(/\p{L}+/gu) || []).length >= 6) return 'diskusi';
  return 'singkat';
}

const ID_WORDS = new Set(
  'yang dan di ke ini itu aku kamu gak ga nggak ngga engga enggak banget bgt aja sih dong kak kakak kok juga ada mau sama udah sudah bisa lagi enak bagus keren mantap mantul makasih terima kasih apa berapa gimana kapan buat untuk dari tapi jadi kalo kalau deh nih ya yg dgn dengan min sis gan wkwk wkwkwk hehe lucu cantik semoga sukses selalu sehat tempatnya harganya dimana mana cobain pengen pingin suka sekali lho loh tuh kan cuma emang beneran kenapa siapa jualan beli harga'.split(
    ' ',
  ),
);

const EN_WORDS = new Set(
  'the and is are you your i my this that it so very love nice good great amazing beautiful what how where when with for of to in on wow omg lol thanks thank please can cute best looks look delicious awesome want need just like really yes be was were have has these those they we our'.split(
    ' ',
  ),
);

const OTHER_SCRIPT =
  /[\p{Script=Han}\p{Script=Hangul}\p{Script=Arabic}\p{Script=Thai}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Cyrillic}]/u;

export function detectLang(text: string): LangCode {
  if (OTHER_SCRIPT.test(text)) return 'other';
  const words = text.toLowerCase().replace(/@[\w.]+/g, ' ').match(/\p{L}+/gu) || [];
  let id = 0;
  let en = 0;
  for (const w of words) {
    if (ID_WORDS.has(w)) id++;
    if (EN_WORDS.has(w)) en++;
  }
  if (!id && !en) return words.length ? 'unknown' : 'emoji';
  if (id && en && Math.min(id, en) / Math.max(id, en) >= 0.5) return 'mixed';
  return id >= en ? 'id' : 'en';
}

/** All content pillars matched by a caption / hashtag blob. */
export function pillarsOf(text: string): string[] {
  return PILLARS.filter(([, , re]) => re.test(text)).map(([k]) => k);
}

export const STOP = new Set([
  ...ID_WORDS,
  ...EN_WORDS,
  'nya', 'aja', 'kak', 'kakk', 'min', 'admin', 'udh', 'blm', 'tdk', 'sdh', 'gk', 'gw', 'gue', 'lu', 'lo',
  'km', 'aq', 'jg', 'utk', 'tp', 'krn', 'trs', 'klo', 'kalo', 'emg', 'bener', 'bnr',
]);
