import { TYPES } from './constants';
import { erLabel } from './benchmark';
import { isNum } from './util';
import type {
  Analysis,
  AudienceInsights,
  Conclusion,
  ConcludeCtx,
  LangCode,
  PublicAudience,
  WorksRow,
} from './types';

const blockLabel = (b: number) =>
  `${String(b * 3).padStart(2, '0')}.00–${String(b * 3 + 3).padStart(2, '0')}.00 WIB`;

const asNum = (v: WorksRow['top']): number | null => (typeof v === 'number' ? v : null);

/**
 * Rule-based conclusions. Every item carries the numbers that produced it so
 * the UI can show "why", and returns message ids (not prose) for i18n.
 */
export function conclude(A: Analysis, ctx: ConcludeCtx): { ins: Conclusion[]; recs: Conclusion[] } {
  const ins: Conclusion[] = [];
  const recs: Conclusion[] = [];
  const S = A.summary;
  const F = A.followers;

  if (!A.posts.length) {
    return { ins: [{ text: { id: 'noPosts' } }], recs: [] };
  }

  /* 1. ER vs benchmark ------------------------------------------------ */
  if (isNum(S.avgER) && S.tier && S.label) {
    const hasSolo = S.nCollab > 0 && S.nSolo > 0 && S.avgERSolo != null;
    const soloL = hasSolo ? erLabel(S.avgERSolo, S.tier) : null;
    ins.push({
      text: {
        id: 'erBench',
        p: {
          avg: ctx.f2(S.avgER),
          med: ctx.f2(S.medER),
          level: ctx.level(S.label.key),
          tier: ctx.tier(S.tier.key),
          solo: hasSolo ? ctx.f2(S.avgERSolo) : null,
          soloLevel: hasSolo && soloL ? ctx.level(soloL.key) : null,
        },
      },
      why: { id: 'whyErBench', p: { n: S.n, followers: ctx.f0(F), t: S.tier.t } },
    });

    if (S.nCollab >= 2 && S.nSolo >= 2 && (S.medERSolo ?? 0) > 0 && S.medERCollab != null) {
      const r = (S.medERCollab as number) / (S.medERSolo as number);
      if (r >= 1.5 || r <= 0.67) {
        ins.push({
          text: {
            id: 'collabGain',
            p: {
              n: S.nCollab,
              medCollab: ctx.f2(S.medERCollab),
              medSolo: ctx.f2(S.medERSolo),
              ratio: ctx.f1(r),
              higher: r >= 1,
            },
          },
          why: { id: 'whyCollab' },
        });
      }
    }
  } else {
    ins.push({
      text: { id: 'erNoFollowers', p: { avgEng: ctx.f0(S.avgEng) } },
      why: { id: 'whyErNoFollowers' },
    });
  }

  /* 2. Content type --------------------------------------------------- */
  const typeStats = TYPES.map((t) => ({ t, ...A.byType[t] })).filter((x) => x.n >= 2);
  const key: 'medER' | 'avgEng' = F ? 'medER' : 'avgEng';
  if (typeStats.length >= 2) {
    typeStats.sort((a, b) => (b[key] ?? 0) - (a[key] ?? 0));
    const best = typeStats[0];
    const worst = typeStats[typeStats.length - 1];
    const ratio = (worst[key] ?? 0) > 0 ? (best[key] as number) / (worst[key] as number) : null;

    ins.push({
      text: {
        id: 'typeBest',
        p: {
          best: ctx.type(best.t),
          bestScore: ctx.score(best[key]),
          worst: ctx.type(worst.t),
          worstScore: ctx.score(worst[key]),
          ratio: ratio && ratio >= 1.2 ? ctx.f1(ratio) : null,
          er: !!F,
        },
      },
      why: { id: 'whyTypeBest', p: { types: typeStats.map((x) => ({ name: ctx.type(x.t), n: x.n })) } },
    });

    if (ratio && ratio >= 1.3) {
      const shareBest = Math.round(best.share * 100);
      recs.push({
        text: {
          id: 'recMoreType',
          p: {
            best: ctx.type(best.t),
            worst: ctx.type(worst.t),
            shareBest,
            worstShare: Math.round(worst.share * 100),
            target: Math.min(80, shareBest + 25),
          },
        },
        why: {
          id: 'whyRecType',
          p: {
            best: ctx.type(best.t),
            bestScore: ctx.score(best[key]),
            worst: ctx.type(worst.t),
            worstScore: ctx.score(worst[key]),
          },
        },
      });
    }
  }

  /* 3. Posting time --------------------------------------------------- */
  const bd = A.byDay[0];
  const bb = A.byBlock[0];
  if (bd && bb && A.posts.length >= 6) {
    const liftD = A.overallAvg ? ((bd.avg as number) / A.overallAvg - 1) * 100 : null;
    ins.push({
      text: {
        id: 'dayTime',
        p: {
          day: ctx.day(bd.k),
          time: blockLabel(bb.k),
          lift: liftD != null ? ctx.f0(liftD) : null,
          liftUp: liftD != null && liftD > 5,
        },
      },
      why: {
        id: 'whyDayTime',
        p: {
          day: ctx.day(bd.k),
          dn: bd.n,
          dscore: ctx.score(bd.avg),
          time: blockLabel(bb.k),
          tn: bb.n,
          tscore: ctx.score(bb.avg),
        },
      },
    });
    const alts = A.byBlock.slice(1, 3).filter((x) => x.n >= 2).map((x) => blockLabel(x.k));
    recs.push({
      text: { id: 'recSchedule', p: { day: ctx.day(bd.k), time: blockLabel(bb.k), alts } },
      why: { id: 'whyRecSchedule' },
    });
  }

  /* 4. Frequency ------------------------------------------------------ */
  if (isNum(S.freqWeek)) {
    ins.push({
      text: { id: 'frequency', p: { freq: ctx.f1(S.freqWeek), last30: S.last30 } },
      why: { id: 'whyFrequency' },
    });
    if (S.freqWeek < 3) {
      recs.push({
        text: {
          id: 'recFreqUp',
          p: { freq: ctx.f1(S.freqWeek), fmt: typeStats[0] ? ctx.type(typeStats[0].t) : null },
        },
        why: { id: 'whyRecFreqUp' },
      });
    } else if (S.freqWeek > 10 && isNum(S.avgER) && S.label?.key === 'low') {
      recs.push({
        text: { id: 'recFreqDown', p: { freq: ctx.f1(S.freqWeek), er: ctx.f2(S.avgER) } },
        why: { id: 'whyRecFreqDown', p: { er: ctx.f2(S.avgER) } },
      });
    }
  }

  /* 5. What works ----------------------------------------------------- */
  if (A.works) {
    const r = Object.fromEntries(
      A.works.rows.filter((x) => x.key).map((x) => [x.key as string, x]),
    ) as Record<string, WorksRow>;
    const notes: { kind: string; top: string; bot: string }[] = [];

    if (r.cta && Math.abs((asNum(r.cta.top) ?? 0) - (asNum(r.cta.bot) ?? 0)) >= 15) {
      const top = asNum(r.cta.top) ?? 0;
      const bot = asNum(r.cta.bot) ?? 0;
      notes.push({ kind: 'cta', top: ctx.f0(top), bot: ctx.f0(bot) });
      if (top > bot) {
        recs.push({
          text: { id: 'recCta' },
          why: { id: 'whyRecCta', p: { top: ctx.f0(top), bot: ctx.f0(bot) } },
        });
      }
    }

    const capTop = asNum(r.cap?.top ?? null);
    const capBot = asNum(r.cap?.bot ?? null);
    if (capTop && capBot && Math.abs(capTop / capBot - 1) >= 0.3) {
      const longer = capTop > capBot;
      notes.push({ kind: longer ? 'capLong' : 'capShort', top: ctx.f0(capTop), bot: ctx.f0(capBot) });
      recs.push({
        text: {
          id: longer ? 'recCaptionLong' : 'recCaptionShort',
          p: { target: Math.round(capTop / 50) * 50, min: Math.max(60, Math.round(capTop / 50) * 50) },
        },
        why: { id: 'whyRecCaption', p: { top: ctx.f0(capTop), bot: ctx.f0(capBot) } },
      });
    }

    const durTop = asNum(r.dur?.top ?? null);
    const durBot = asNum(r.dur?.bot ?? null);
    if (durTop && durBot && Math.abs(durTop - durBot) >= 5) {
      notes.push({ kind: 'dur', top: ctx.f0(durTop), bot: ctx.f0(durBot) });
      recs.push({
        text: { id: 'recDuration', p: { top: ctx.f0(durTop), shorter: durTop < durBot } },
        why: { id: 'whyRecDuration', p: { top: ctx.f0(durTop), bot: ctx.f0(durBot) } },
      });
    }

    const colTop = asNum(r.collab?.top ?? null);
    const colBot = asNum(r.collab?.bot ?? null);
    if (colTop != null && colBot != null && Math.abs(colTop - colBot) >= 20) {
      if (!ins.some((x) => x.text.id === 'collabGain')) {
        notes.push({ kind: 'collab', top: ctx.f0(colTop), bot: ctx.f0(colBot) });
      }
      if (colTop > colBot) {
        recs.push({
          text: { id: 'recCollab' },
          why: { id: 'whyRecCollab', p: { top: ctx.f0(colTop), bot: ctx.f0(colBot) } },
        });
      }
    }

    const hqTop = asNum(r.hookQ?.top ?? null);
    const hqBot = asNum(r.hookQ?.bot ?? null);
    if (hqTop != null && hqBot != null && hqTop - hqBot >= 15) {
      notes.push({ kind: 'hookQ', top: ctx.f0(hqTop), bot: ctx.f0(hqBot) });
    }
    const tagTop = asNum(r.tags?.top ?? null);
    const tagBot = asNum(r.tags?.bot ?? null);
    if (tagTop != null && tagBot != null && Math.abs(tagTop - tagBot) >= 2) {
      notes.push({ kind: 'tags', top: ctx.f1(tagTop), bot: ctx.f1(tagBot) });
    }

    if (notes.length) {
      ins.push({
        text: { id: 'worksPattern', p: { notes: notes.slice(0, 3) } },
        why: { id: 'whyWorks', p: { k: A.works.k } },
      });
    }
  }

  /* 6. Conversation --------------------------------------------------- */
  const B = A.behavior;
  if (isNum(B.commentsPer100Likes)) {
    const low = B.commentsPer100Likes < 1.5;
    ins.push({
      text: { id: 'conversation', p: { c100: ctx.f1(B.commentsPer100Likes), low } },
      why: { id: 'whyConversation', p: { comments: ctx.f0(B.sumComments), likes: ctx.f0(B.sumLikes) } },
    });
    if (low) {
      recs.push({
        text: { id: 'recConversation' },
        why: { id: 'whyRecConversation', p: { c100: ctx.f1(B.commentsPer100Likes) } },
      });
    }
  }

  if (B.commentsN >= 10) {
    const tot = B.sent.pos + B.sent.neg + B.sent.neu;
    ins.push({
      text: {
        id: 'sentimentSummary',
        p: {
          n: B.commentsN,
          posPct: ctx.f0((B.sent.pos / tot) * 100),
          negPct: ctx.f0((B.sent.neg / tot) * 100),
          qPct: ctx.f0(B.qPct ?? 0),
          loyal: B.loyal,
        },
      },
      why: { id: 'whySentiment', p: { n: B.commentsN, loyal: B.loyal } },
    });
    if ((B.qPct ?? 0) >= 15) {
      recs.push({
        text: { id: 'recFaq', p: { qPct: ctx.f0(B.qPct ?? 0) } },
        why: { id: 'whyRecFaq' },
      });
    }
  }

  /* 7. Growth --------------------------------------------------------- */
  if (A.growth) {
    const g = A.growth;
    const pct = g.followers.pct;
    if (isNum(pct)) {
      ins.push({
        text: {
          id: 'growthFollowers',
          p: {
            pct: ctx.f2(Math.abs(pct)),
            up: pct >= 0,
            abs: g.followers.abs != null ? ctx.f0(Math.abs(g.followers.abs)) : null,
            days: ctx.f0(g.days),
            erPct: isNum(g.er.pct) ? ctx.f1(g.er.pct) : null,
            erUp: (g.er.pct ?? 0) >= 0,
          },
        },
        why: {
          id: 'whyGrowth',
          p: { erPct: isNum(g.er.pct) ? ctx.f1(Math.abs(g.er.pct)) : null, up: (g.er.pct ?? 0) >= 0 },
        },
      });
    }
  }

  /* 8. Hashtags / missing data --------------------------------------- */
  if (A.works && A.works.topTags.length) {
    recs.push({
      text: {
        id: 'recHashtags',
        p: { tags: A.works.topTags.slice(0, 5).map((t) => '#' + t.tag).join(' ') },
      },
      why: { id: 'whyRecHashtags', p: { k: A.works.k } },
    });
  }
  if (A.summary.viewsN === 0 && A.byType.reel.n) {
    recs.push({
      text: { id: 'recViewsMissing', p: { n: A.byType.reel.n } },
      why: { id: 'whyRecViews', p: { n: A.byType.reel.n } },
    });
  }

  return { ins: ins.slice(0, 7), recs: recs.slice(0, 7) };
}

/* ------------------------------------------------------------------ */
/* Audience conclusions (Sources A + B combined)                       */
/* ------------------------------------------------------------------ */

export function audienceConclusions(
  ins: AudienceInsights,
  pub: PublicAudience,
  _F: number | null,
  ctx: ConcludeCtx,
): Conclusion[] {
  const out: Conclusion[] = [];
  const pct = (v: number, tot: number) => (tot ? Math.round((v / tot) * 100) : 0);
  const topOf = (d: DistItemLike[] | undefined) =>
    d && d.length ? [...d].sort((a, b) => b.value - a.value)[0] : null;
  const totOf = (d: DistItemLike[] | undefined) => (d || []).reduce((s, x) => s + x.value, 0);

  // 1. Who the audience is
  if (ins.hasDemo) {
    const parts: { kind: string; label: string; pct: number }[] = [];
    for (const k of ['gender', 'age', 'city', 'country']) {
      const d = ins.demo[k];
      const t = topOf(d);
      if (t) parts.push({ kind: k, label: ctx.distLabel(k, t.label), pct: pct(t.value, totOf(d)) });
    }
    out.push({ text: { id: 'audDemo', p: { parts } }, src: 'ins' });
  } else if (pub.langKnown.length && pub.n >= 10) {
    const l = pub.langKnown[0];
    out.push({
      text: {
        id: 'audLang',
        p: { lang: ctx.lang(l.label as LangCode), pct: pct(l.value, totOf(pub.langKnown)) },
      },
      src: 'pub',
    });
  }

  if (ins.followerSplit) {
    const s = ins.followerSplit as { followers: number; nonFollowers: number };
    out.push({
      text: {
        id: 'audNonFollower',
        p: { pct: pct(s.nonFollowers, s.followers + s.nonFollowers) },
      },
      src: 'ins',
    });
  }

  // 2. Favourite format
  if (pub.favFormat) {
    const others = pub.formats
      .filter((f) => f !== pub.favFormat && f.n >= 2)
      .map((f) => `${ctx.type(f.type)} ${ctx.score(f.medScore)}`);
    out.push({
      text: {
        id: 'audFormat',
        p: {
          best: ctx.type(pub.favFormat.type),
          score: ctx.score(pub.favFormat.medScore),
          others: others.length ? others.join(', ') : null,
          talk:
            pub.talkFormat && pub.talkFormat.type !== pub.favFormat.type
              ? ctx.type(pub.talkFormat.type)
              : null,
        },
      },
      src: 'pub',
    });
  }

  // 3. Topics
  if (pub.interest.topics.length) {
    out.push({
      text: {
        id: 'audTopics',
        p: {
          topics: pub.interest.topics.map((x) => ({
            label: ctx.pillar(x.key),
            score: ctx.score(x.medScore),
          })),
        },
      },
      src: 'pub',
    });
  }

  // 4. When they are active
  if (ins.hours) {
    let b = 0;
    let bv = -1;
    for (let i = 0; i < 24; i++) {
      const v = ins.hours[i] + ins.hours[(i + 1) % 24] + ins.hours[(i + 2) % 24];
      if (v > bv) {
        bv = v;
        b = i;
      }
    }
    const dayIdx = ins.days ? ins.days.indexOf(Math.max(...ins.days)) : -1;
    out.push({
      text: {
        id: 'audHoursIns',
        p: {
          from: String(b).padStart(2, '0'),
          to: String((b + 3) % 24).padStart(2, '0'),
          day: dayIdx >= 0 ? ctx.day(dayIdx) : null,
        },
      },
      src: 'ins',
    });
  } else if (pub.n >= 10 && pub.blocks[0]?.n) {
    const b = pub.blocks[0].b;
    const d = pub.dayTotals.indexOf(Math.max(...pub.dayTotals));
    out.push({
      text: {
        id: 'audHoursPub',
        p: {
          day: ctx.day(d),
          from: String(b * 3).padStart(2, '0'),
          to: String(b * 3 + 3).padStart(2, '0'),
        },
      },
      src: 'pub',
    });
  }

  // 5. How they interact
  if (pub.n >= 10) {
    const t = [...pub.types].sort((a, b) => b.value - a.value)[0];
    const tot = pub.sent.pos + pub.sent.neu + pub.sent.neg;
    out.push({
      text: {
        id: 'audInteraction',
        p: {
          type: ctx.commentType(t.key),
          pct: pct(t.value, pub.n),
          posPct: pct(pub.sent.pos, tot),
          repeatPct:
            pub.loyal.commentsFromRepeatPct != null ? Math.round(pub.loyal.commentsFromRepeatPct) : null,
        },
      },
      src: 'pub',
    });
  } else if (pub.ratio.per100.comments != null) {
    out.push({
      text: {
        id: 'audInteraction',
        p: {
          type: ctx.commentType('singkat'),
          pct: null,
          posPct: null,
          repeatPct: null,
          likesMore: pub.ratio.per100.comments < 2,
          c100: ctx.f1(pub.ratio.per100.comments),
        },
      },
      src: 'pub',
    });
  }

  return out.slice(0, 5);
}

interface DistItemLike {
  label: string;
  value: number;
}
