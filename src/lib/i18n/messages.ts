import type { MessageId } from '@/lib/core/types';

export type MsgFn = (p: any) => string;

const idMsg: Record<MessageId, MsgFn> = {
  /* ---------------- account / engagement ---------------- */
  erBench: (p) =>
    `ER rata-rata <b>${p.avg}%</b> (median ${p.med}%) — kategori <b>${p.level}</b> untuk akun ${p.tier}.${
      p.solo ? ` Tanpa post collab: <b>${p.solo}%</b> (${p.soloLevel}).` : ''
    }`,
  whyErBench: (p) =>
    `Dari ${p.n} post, ${p.followers} followers. Patokan kategori ini: rata-rata ${p.t[0]}–${p.t[1]}%, bagus ${p.t[1]}–${p.t[2]}%. Median dipakai karena rata-rata mudah terangkat 1–2 post viral.`,

  erNoFollowers: (p) =>
    `Jumlah followers tidak ditemukan, jadi ER dihitung sebagai total interaksi. Rata-rata <b>${p.avgEng}</b> interaksi per post.`,
  whyErNoFollowers: () =>
    `Buka halaman profil (refresh) saat merekam HAR supaya query profil ikut terekam.`,

  collabGain: (p) =>
    `Post <b>kolaborasi</b> (${p.n} post) punya median ER ${p.medCollab}% vs post sendiri ${p.medSolo}% — <b>${
      p.higher ? `${p.ratio}× lebih tinggi` : 'lebih rendah'
    }</b>.`,
  whyCollab: () =>
    `Likes post collab ikut terkumpul dari audiens partner, jadi ER-nya terhadap followers akun ini terlihat lebih besar.`,

  typeBest: (p) =>
    `<b>${p.best}</b> paling efektif: ${p.er ? 'ER median' : 'interaksi rata-rata'} ${p.bestScore} vs ${
      p.worst
    } ${p.worstScore}${p.ratio ? ` (<b>${p.ratio}×</b> lipat)` : ''}.`,
  whyTypeBest: (p) => p.types.map((x: any) => `${x.name}: ${x.n} post`).join(', ') + '.',
  recMoreType: (p) =>
    `Perbanyak <b>${p.best}</b>${
      p.shareBest < 60
        ? ` — saat ini baru ${p.shareBest}% dari total post; naikkan ke ±${p.target}%`
        : ''
    }, dan kurangi porsi <b>${p.worst}</b> (${p.worstShare}% post, performa terendah).`,
  whyRecType: (p) => `${p.best} ${p.bestScore} vs ${p.worst} ${p.worstScore}.`,

  /* ---------------- timing / frequency ---------------- */
  dayTime: (p) =>
    `Hari terbaik: <b>${p.day}</b>${p.liftUp ? ` (+${p.lift}% di atas median semua post)` : ''}; jam terbaik: <b>${
      p.time
    }</b>.`,
  whyDayTime: (p) =>
    `${p.day}: ${p.dn} post, median ${p.dscore}. Jam ${p.time}: ${p.tn} post, ${p.tscore}. Sampel kecil = indikasi, bukan kepastian.`,
  recSchedule: (p) =>
    `Jadwalkan post utama di <b>${p.day}</b> pada <b>${p.time}</b>${
      p.alts.length ? `; slot alternatif: ${p.alts.join(', ')}` : ''
    }. Uji 4 minggu lalu bandingkan lagi dengan snapshot baru.`,
  whyRecSchedule: () => `Berdasarkan median performa post per hari & blok 3 jam (WIB).`,

  frequency: (p) =>
    `Frekuensi posting <b>${p.freq} post/minggu</b> (${p.last30} post dalam 30 hari terakhir).`,
  whyFrequency: () =>
    `Dihitung dari 90 hari terakhir (atau sepanjang data jika lebih pendek), tanpa post yang di-pin.`,
  recFreqUp: (p) =>
    `Naikkan konsistensi ke <b>3–5 post/minggu</b> (sekarang ${p.freq}). Pakai format ${
      p.fmt || 'terbaik'
    } untuk menambah slot.`,
  whyRecFreqUp: () =>
    `Akun yang konsisten 3+ post/minggu umumnya lebih stabil di distribusi algoritma.`,
  recFreqDown: (p) =>
    `Frekuensi sangat tinggi (${p.freq}/minggu) tapi ER rendah — coba kurangi volume dan fokus pada kualitas tiap post.`,
  whyRecFreqDown: (p) => `ER rata-rata ${p.er}%.`,

  /* ---------------- what works ---------------- */
  worksPattern: (p) =>
    `Pola post terbaik vs terburuk: ${(p.notes as any[]).map((n) => noteId(n)).join('; ')}.`,
  whyWorks: (p) => `Membandingkan ${p.k} post teratas vs ${p.k} terbawah.`,

  recCta: () =>
    `Selalu tutup caption dengan <b>CTA spesifik</b> (mis. "Simpan untuk nanti", "Tag teman yang…", "Komen ‘MAU’"), karena post teratas lebih sering memakai CTA.`,
  whyRecCta: (p) => `CTA: ${p.top}% (top) vs ${p.bot}% (bottom).`,

  recCaptionLong: (p) =>
    `Caption yang lebih <b>informatif/bercerita</b> bekerja lebih baik — targetkan ±${p.target} karakter dengan poin yang bisa disimpan.`,
  recCaptionShort: (p) =>
    `Caption <b>singkat & to-the-point</b> bekerja lebih baik — targetkan di bawah ${p.min} karakter.`,
  whyRecCaption: (p) => `Panjang caption rata-rata: ${p.top} (top) vs ${p.bot} (bottom) karakter.`,

  recDuration: (p) =>
    `Durasi reel ideal di data ini sekitar <b>${p.top} detik</b> — ${
      p.shorter ? 'potong reel yang terlalu panjang' : 'tidak perlu takut membuat reel lebih panjang bila isinya padat'
    }.`,
  whyRecDuration: (p) => `Durasi rata-rata reel di post teratas ${p.top} dtk vs terbawah ${p.bot} dtk.`,

  recCollab: () =>
    `Lanjutkan & tambah <b>post kolaborasi</b> (fitur Collab) dengan brand/kreator relevan — terbukti mendorong performa.`,
  whyRecCollab: (p) => `Collab: ${p.top}% di top vs ${p.bot}% di bottom.`,

  /* ---------------- conversation ---------------- */
  conversation: (p) =>
    `Rasio percakapan: <b>${p.c100} komentar per 100 likes</b> — ${
      p.low ? 'audiens cenderung pasif (like tanpa komentar)' : 'audiens cukup aktif berkomentar'
    }.`,
  whyConversation: (p) => `Total ${p.comments} komentar dan ${p.likes} likes.`,
  recConversation: () =>
    `Pancing percakapan: akhiri caption dengan <b>pertanyaan pilihan</b> ("Kamu tim A atau B?") dan balas komentar di 1 jam pertama.`,
  whyRecConversation: (p) => `Hanya ${p.c100} komentar per 100 likes.`,

  sentimentSummary: (p) =>
    `Dari ${p.n} komentar terbaca: <b>${p.posPct}% positif</b>, ${p.negPct}% negatif, ${p.qPct}% berupa pertanyaan.`,
  whySentiment: (p) => `${p.loyal} akun berkomentar di 2+ post (audiens loyal).`,
  recFaq: (p) =>
    `Banyak pertanyaan di komentar (${p.qPct}%) — jadikan bahan konten <b>FAQ / Q&A carousel</b> dan pin jawaban di komentar.`,
  whyRecFaq: () => `Persentase komentar berbentuk pertanyaan.`,

  /* ---------------- growth / tags ---------------- */
  growthFollowers: (p) =>
    `Followers ${p.up ? 'naik' : 'turun'} <b>${p.pct}%</b>${
      p.abs != null ? ` (${p.up ? '+' : '-'}${p.abs})` : ''
    } dalam ${p.days} hari antar snapshot.`,
  whyGrowth: (p) =>
    p.erPct == null
      ? `ER rata-rata tidak tersedia di snapshot sebelumnya.`
      : `ER rata-rata berubah ${p.up ? '+' : '-'}${p.erPct}%.`,

  recHashtags: (p) =>
    `Pertahankan hashtag yang muncul di post berperforma tinggi: ${p.tags}. Batasi 3–5 hashtag relevan per post.`,
  whyRecHashtags: (p) => `Hashtag paling sering di ${p.k} post teratas.`,
  recViewsMissing: () =>
    `Data views reel belum ada di file ini — rekam ulang HAR sambil membuka tab <b>Reels</b> profil agar analisa views/plays lengkap.`,
  whyRecViews: (p) => `${p.n} reel ditemukan tanpa angka views.`,

  /* ---------------- audience ---------------- */
  audDemo: (p) =>
    `Audiens utama: ${(p.parts as any[])
      .map((x) => {
        const prefix = x.kind === 'age' ? 'usia ' : x.kind === 'city' ? 'dari ' : x.kind === 'country' ? 'negara ' : '';
        return `${prefix}<b>${x.label}</b> (${x.pct}%)`;
      })
      .join(', ')}.`,

  audLang: (p) =>
    `Audiens yang aktif berkomentar mayoritas memakai <b>${p.lang}</b> (${p.pct}% komentar yang bahasanya terdeteksi) — kemungkinan besar audiens lokal.`,

  audNonFollower: (p) =>
    `<b>${p.pct}%</b> yang melihat konten adalah <b>non-followers</b> — ${
      p.pct >= 50 ? 'konten banyak menjangkau orang baru' : 'konten masih lebih banyak dikonsumsi followers sendiri'
    }.`,

  audFormat: (p) =>
    `Format favorit audiens: <b>${p.best}</b> (median ${p.score}${p.others ? ` vs ${p.others}` : ''}).${
      p.talk ? ` Tapi yang paling memancing komentar justru <b>${p.talk}</b>.` : ''
    }`,

  audTopics: (p) =>
    `Topik yang paling direspon: <b>${(p.topics as any[]).map((x) => x.label).join('</b>, <b>')}</b> (median ${(
      p.topics as any[]
    )
      .map((x) => x.score)
      .join(' / ')}). <i>Estimasi dari caption & hashtag.</i>`,

  audHoursIns: (p) =>
    `Followers paling banyak online sekitar <b>${p.from}.00–${p.to}.00 WIB</b>${
      p.day ? `, hari paling ramai <b>${p.day}</b>` : ''
    }.`,
  audHoursPub: (p) =>
    `Audiens paling aktif berkomentar hari <b>${p.day}</b> sekitar <b>${p.from}.00–${p.to}.00 WIB</b>.`,

  audInteraction: (p) =>
    p.pct != null
      ? `Cara mereka berinteraksi: paling banyak <b>${String(p.type).toLowerCase()}</b> (${p.pct}%), ${
          p.posPct
        }% komentar bernada positif${
          p.repeatPct != null ? `, dan ${p.repeatPct}% komentar datang dari audiens loyal` : ''
        }.`
      : `Audiens lebih suka <b>${
          p.likesMore ? 'menekan like daripada berkomentar' : 'ikut berkomentar'
        }</b>: ${p.c100} komentar per 100 likes.`,

  noPosts: () =>
    'Tidak ada post milik akun ini yang ditemukan di file. Scroll grid post di halaman profil saat merekam HAR.',
};

const enMsg: Record<MessageId, MsgFn> = {
  erBench: (p) =>
    `Average ER <b>${p.avg}%</b> (median ${p.med}%) — <b>${p.level}</b> for a ${p.tier} account.${
      p.solo ? ` Excluding collabs: <b>${p.solo}%</b> (${p.soloLevel}).` : ''
    }`,
  whyErBench: (p) =>
    `From ${p.n} posts and ${p.followers} followers. This tier's bands: average ${p.t[0]}–${p.t[1]}%, good ${p.t[1]}–${p.t[2]}%. Median is used because the mean is easily lifted by 1–2 viral posts.`,

  erNoFollowers: (p) =>
    `Followers were not found, so ER is shown as total interactions. Average <b>${p.avgEng}</b> interactions per post.`,
  whyErNoFollowers: () =>
    `Open the profile page (and refresh) while recording the HAR so the profile query is captured.`,

  collabGain: (p) =>
    `<b>Collab</b> posts (${p.n}) have a median ER of ${p.medCollab}% vs ${p.medSolo}% for solo posts — <b>${
      p.higher ? `${p.ratio}× higher` : 'lower'
    }</b>.`,
  whyCollab: () =>
    `Likes on collab posts also come from the partner's audience, so ER against this account's followers looks larger.`,

  typeBest: (p) =>
    `<b>${p.best}</b> is most effective: ${p.er ? 'median ER' : 'average interactions'} ${p.bestScore} vs ${
      p.worst
    } ${p.worstScore}${p.ratio ? ` (<b>${p.ratio}×</b>)` : ''}.`,
  whyTypeBest: (p) => p.types.map((x: any) => `${x.name}: ${x.n} posts`).join(', ') + '.',
  recMoreType: (p) =>
    `Post more <b>${p.best}</b>${
      p.shareBest < 60 ? ` — currently only ${p.shareBest}% of posts; raise it to ~${p.target}%` : ''
    }, and reduce <b>${p.worst}</b> (${p.worstShare}% of posts, lowest performance).`,
  whyRecType: (p) => `${p.best} ${p.bestScore} vs ${p.worst} ${p.worstScore}.`,

  dayTime: (p) =>
    `Best day: <b>${p.day}</b>${p.liftUp ? ` (+${p.lift}% above the median post)` : ''}; best time: <b>${
      p.time
    }</b>.`,
  whyDayTime: (p) =>
    `${p.day}: ${p.dn} posts, median ${p.dscore}. ${p.time}: ${p.tn} posts, ${p.tscore}. Small samples are a signal, not a guarantee.`,
  recSchedule: (p) =>
    `Schedule your main post on <b>${p.day}</b> at <b>${p.time}</b>${
      p.alts.length ? `; alternative slots: ${p.alts.join(', ')}` : ''
    }. Test for 4 weeks, then compare with a fresh snapshot.`,
  whyRecSchedule: () => `Based on median post performance per day and 3-hour block (WIB).`,

  frequency: (p) =>
    `Posting frequency <b>${p.freq} posts/week</b> (${p.last30} posts in the last 30 days).`,
  whyFrequency: () =>
    `Calculated over the last 90 days (or the whole span if shorter), excluding pinned posts.`,
  recFreqUp: (p) =>
    `Raise consistency to <b>3–5 posts/week</b> (currently ${p.freq}). Use ${p.fmt || 'your best'} to fill the extra slots.`,
  whyRecFreqUp: () =>
    `Accounts posting 3+ times per week tend to have a more stable algorithmic distribution.`,
  recFreqDown: (p) =>
    `Very high frequency (${p.freq}/week) with low ER — try reducing volume and focusing on quality per post.`,
  whyRecFreqDown: (p) => `Average ER ${p.er}%.`,

  worksPattern: (p) =>
    `Top vs bottom post patterns: ${(p.notes as any[]).map((n) => noteEn(n)).join('; ')}.`,
  whyWorks: (p) => `Comparing the top ${p.k} posts with the bottom ${p.k}.`,

  recCta: () =>
    `Always close the caption with a <b>specific CTA</b> (e.g. "Save this for later", "Tag a friend who…", "Comment ‘ME’"), because top posts more often use one.`,
  whyRecCta: (p) => `CTA: ${p.top}% (top) vs ${p.bot}% (bottom).`,

  recCaptionLong: (p) =>
    `More <b>informative / story-driven</b> captions work better — aim for ~${p.target} characters with points worth saving.`,
  recCaptionShort: (p) =>
    `Short, <b>to-the-point</b> captions work better — keep them under ${p.min} characters.`,
  whyRecCaption: (p) => `Average caption length: ${p.top} (top) vs ${p.bot} (bottom) characters.`,

  recDuration: (p) =>
    `The ideal reel length in this data is around <b>${p.top} seconds</b> — ${
      p.shorter ? 'trim reels that run too long' : 'do not be afraid of longer reels when the content is dense'
    }.`,
  whyRecDuration: (p) => `Average reel duration: ${p.top}s (top) vs ${p.bot}s (bottom).`,

  recCollab: () =>
    `Keep using and increase <b>collab posts</b> (Collab feature) with relevant brands/creators — they clearly lift performance.`,
  whyRecCollab: (p) => `Collab: ${p.top}% in top vs ${p.bot}% in bottom.`,

  conversation: (p) =>
    `Conversation ratio: <b>${p.c100} comments per 100 likes</b> — ${
      p.low ? 'the audience is passive (likes without comments)' : 'the audience comments fairly actively'
    }.`,
  whyConversation: (p) => `Total ${p.comments} comments and ${p.likes} likes.`,
  recConversation: () =>
    `Spark conversation: end captions with a <b>this-or-that question</b> ("Team A or team B?") and reply to comments within the first hour.`,
  whyRecConversation: (p) => `Only ${p.c100} comments per 100 likes.`,

  sentimentSummary: (p) =>
    `From ${p.n} comments read: <b>${p.posPct}% positive</b>, ${p.negPct}% negative, ${p.qPct}% are questions.`,
  whySentiment: (p) => `${p.loyal} accounts commented on 2+ posts (loyal audience).`,
  recFaq: (p) =>
    `Many comment questions (${p.qPct}%) — turn them into <b>FAQ / Q&A carousel</b> content and pin the answers.`,
  whyRecFaq: () => `Share of comments that are questions.`,

  growthFollowers: (p) =>
    `Followers ${p.up ? 'up' : 'down'} <b>${p.pct}%</b>${
      p.abs != null ? ` (${p.up ? '+' : '-'}${p.abs})` : ''
    } over ${p.days} days between snapshots.`,
  whyGrowth: (p) =>
    p.erPct == null
      ? `Average ER is not available in the earlier snapshot.`
      : `Average ER changed ${p.up ? '+' : '-'}${p.erPct}%.`,

  recHashtags: (p) =>
    `Keep the hashtags that appear on high-performing posts: ${p.tags}. Limit yourself to 3–5 relevant hashtags per post.`,
  whyRecHashtags: (p) => `Hashtags most often found in the top ${p.k} posts.`,
  recViewsMissing: () =>
    `Reel views are missing from this file — record the HAR again with the profile <b>Reels</b> tab open to complete the views/plays analysis.`,
  whyRecViews: (p) => `${p.n} reels found without view counts.`,

  audDemo: (p) =>
    `Main audience: ${(p.parts as any[])
      .map((x) => {
        const prefix = x.kind === 'age' ? 'aged ' : x.kind === 'city' ? 'from ' : x.kind === 'country' ? 'country ' : '';
        return `${prefix}<b>${x.label}</b> (${x.pct}%)`;
      })
      .join(', ')}.`,

  audLang: (p) =>
    `Most active commenters write in <b>${p.lang}</b> (${p.pct}% of comments with a detected language) — likely a local audience.`,

  audNonFollower: (p) =>
    `<b>${p.pct}%</b> of people who saw the content were <b>non-followers</b> — ${
      p.pct >= 50 ? 'the content reaches plenty of new people' : 'the content is still mostly consumed by existing followers'
    }.`,

  audFormat: (p) =>
    `Favourite audience format: <b>${p.best}</b> (median ${p.score}${p.others ? ` vs ${p.others}` : ''}).${
      p.talk ? ` The format that provokes the most comments is <b>${p.talk}</b>.` : ''
    }`,

  audTopics: (p) =>
    `Topics that get the most response: <b>${(p.topics as any[]).map((x) => x.label).join('</b>, <b>')}</b> (median ${(
      p.topics as any[]
    )
      .map((x) => x.score)
      .join(' / ')}). <i>Estimated from captions & hashtags.</i>`,

  audHoursIns: (p) =>
    `Most followers are online around <b>${p.from}:00–${p.to}:00 WIB</b>${
      p.day ? `, busiest day <b>${p.day}</b>` : ''
    }.`,
  audHoursPub: (p) =>
    `The audience comments most on <b>${p.day}</b> around <b>${p.from}:00–${p.to}:00 WIB</b>.`,

  audInteraction: (p) =>
    p.pct != null
      ? `How they interact: mostly <b>${String(p.type).toLowerCase()}</b> (${p.pct}%), ${
          p.posPct
        }% of comments are positive${
          p.repeatPct != null ? `, and ${p.repeatPct}% of comments come from the loyal audience` : ''
        }.`
      : `The audience prefers to <b>${
          p.likesMore ? 'like rather than comment' : 'comment too'
        }</b>: ${p.c100} comments per 100 likes.`,

  noPosts: () =>
    'No posts owned by this account were found in the file. Scroll the profile post grid while recording the HAR.',
};

function noteId(n: { kind: string; top: string; bot: string }): string {
  switch (n.kind) {
    case 'cta':
      return `${n.top}% post teratas memakai CTA vs ${n.bot}% di post terbawah`;
    case 'capLong':
      return `caption post teratas lebih panjang (${n.top} vs ${n.bot} karakter)`;
    case 'capShort':
      return `caption post teratas lebih pendek (${n.top} vs ${n.bot} karakter)`;
    case 'dur':
      return `reel teratas rata-rata ${n.top} detik vs ${n.bot} detik`;
    case 'collab':
      return `${n.top}% post teratas adalah collab vs ${n.bot}% di terbawah`;
    case 'hookQ':
      return `hook berupa pertanyaan lebih sering di post teratas (${n.top}% vs ${n.bot}%)`;
    case 'tags':
      return `jumlah hashtag rata-rata ${n.top} (top) vs ${n.bot} (bottom)`;
    default:
      return '';
  }
}

function noteEn(n: { kind: string; top: string; bot: string }): string {
  switch (n.kind) {
    case 'cta':
      return `${n.top}% of top posts use a CTA vs ${n.bot}% of bottom posts`;
    case 'capLong':
      return `top captions are longer (${n.top} vs ${n.bot} characters)`;
    case 'capShort':
      return `top captions are shorter (${n.top} vs ${n.bot} characters)`;
    case 'dur':
      return `top reels average ${n.top}s vs ${n.bot}s`;
    case 'collab':
      return `${n.top}% of top posts are collabs vs ${n.bot}% of bottom posts`;
    case 'hookQ':
      return `question hooks are more common in top posts (${n.top}% vs ${n.bot}%)`;
    case 'tags':
      return `average hashtag count ${n.top} (top) vs ${n.bot} (bottom)`;
    default:
      return '';
  }
}

export const msgs = { id: idMsg, en: enMsg };
