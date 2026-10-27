/**
 * End-to-end smoke test for the analysis engine.
 * Run with: npm run smoke
 */
import assert from 'node:assert/strict';
import { accountsIn, analyze, makeSnapshot } from '../src/lib/core';
import { buildCtx, dict, makeFormatters, renderMsg } from '../src/lib/i18n';
import { buildAnalysis, makeStore } from './fixture';

const store = makeStore();

assert.equal(store.debug.entries, 3, 'all entries counted');
assert.equal(store.debug.graphql, 3, 'graphql entries detected');
assert.equal(store.posts.size, 2, 'two posts extracted');
assert.equal(store.comments.size, 3, 'three comments extracted');
assert.equal(store.mediaPkToCode.get('123'), 'AAA1', 'media pk resolved to shortcode');
assert.equal(store.insights.metrics.views_current_period, 12000, 'metric scalar parsed');
assert.ok(store.insights.breakdowns.views_by_follow_type, 'breakdown parsed');

const accounts = accountsIn(store);
assert.equal(accounts.length, 1, 'one account discovered');
assert.equal(accounts[0].username, 'testacct');
assert.equal(accounts[0].followers, 10000);

const { A } = buildAnalysis('id');
const t = dict.id;

assert.equal(A.posts.length, 2, 'two account posts analysed');
assert.equal(A.byType.carousel.n, 1, 'carousel classified');
assert.equal(A.byType.reel.n, 1, 'reel classified');
assert.ok(A.summary.avgER && A.summary.avgER > 0, 'ER computed');
assert.equal(A.aud.pub.n, 3, 'audience comments analysed');
assert.equal(A.behavior.sent.pos, 1, 'positive sentiment detected');
assert.equal(A.behavior.sent.neg, 1, 'negative sentiment detected');
assert.ok(A.aud.pub.speed, 'response speed computed');
assert.equal(A.aud.ins.viewsSplit?.nonFollowers, 4000, 'follower split parsed');
assert.equal(A.aud.ins.demo.gender?.[0].label, 'female', 'gender normalised');
assert.ok(A.conclusions.ins.length > 0, 'insights generated');
assert.ok(A.aud.conclusions.length > 0, 'audience conclusions generated');

for (const c of [...A.conclusions.ins, ...A.conclusions.recs, ...A.aud.conclusions]) {
  for (const dictLocale of [dict.id, dict.en] as const) {
    const text = renderMsg(dictLocale, c.text);
    assert.ok(text.length > 10, `message ${c.text.id} renders`);
    assert.ok(!/undefined|NaN|\[object/.test(text), `message ${c.text.id} has broken interpolation: ${text}`);
    if (c.why) assert.ok(renderMsg(dictLocale, c.why).length > 5, `why ${c.why.id} renders`);
  }
}

const snap = makeSnapshot(A);
assert.equal(snap.account, 'testacct');
assert.equal(snap.postsAnalyzed, 2);

// A second analysis with the snapshot should attach growth data.
const f = makeFormatters('id');
const B = analyze(store, 'testacct', [snap], buildCtx(t, f, 10000));
assert.equal(B.snapshots.length, 1, 'snapshot attached');

console.log('✓ engine smoke test passed');
console.log(
  `  posts=${A.posts.length} comments=${A.aud.pub.n} avgER=${A.summary.avgER?.toFixed(2)}% insights=${A.conclusions.ins.length} recs=${A.conclusions.recs.length}`,
);
