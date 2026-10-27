// Net and gross sizes: reading them from posts, and showing them on the card.
const assert = require('assert');
const { parseSizes } = require('../engines/sizes.js');
const L = require('../engines/listings.js');
const { createBot } = require('../bot.js');
const flow = require('../config/flow.json');
let passed = 0, total = 0;
async function t(name, fn) { total++; try { await fn(); passed++; console.log(`  ✅ Test ${total}: ${name}`); } catch (e) { console.log(`  ❌ Test ${total}: ${name}\n     ${e.message}`); } }

(async () => {
  await t('posts: every way Nick writes net and gross is read, and an unlabelled size stays unlabelled', () => {
    const cases = [
      ['✅ 47㎡ Gross | 38㎡ Net', { net: 38, gross: 47 }],
      ['✅ Size: 32m2 (Net) | 41m2 (Gross)', { net: 32, gross: 41 }],
      ['✅ Size: 72㎡ (Gross size)', { gross: 72 }],
      ['✅ Net size 35sqm', { net: 35 }],
      ['✅ Building area: 66.92㎡ | Net area: 51.46㎡', { net: 51.46, gross: 66.92 }],
      ['✅ 65m2 (net area) | 78m2 (gross floor area)', { net: 65, gross: 78 }],
      ['✅ Size: 37.70m2 (Net)', { net: 37.7 }],
      ['✅ Size: 56m2', { plain: 56 }],
      ['✅ size : 50sqm', { plain: 50 }],
      ['no size here', {}],
    ];
    cases.forEach(([text, want]) => { const got = parseSizes(text); ['net', 'gross', 'plain'].forEach((k) => assert.strictEqual(got[k] || 0, want[k] || 0, text + ' ' + k)); });
  });

  const csv = 'Ref,Status,Listing type,Project,Area,Price (USD),Size (sqm),Net size (sqm),Gross size (sqm),Size basis\n'
    + 'S1,Active,Resale,Both Sizes,BKK1,38000,47,38,47,\n'
    + 'S2,Active,Resale,Net Only,BKK1,40000,,35,,\n'
    + 'S3,Active,Resale,Gross Only,BKK1,45000,,,50,\n'
    + 'S4,Active,Resale,Old Single,BKK1,50000,56,,,\n'
    + 'S5,Active,Resale,Old With Basis,BKK1,60000,30,,,Net\n';
  const rows = L.clean(L.parseCsv(csv), Date.parse('2026-10-25'));
  async function cardsFor(lang, band) {
    const sent = []; const db = {};
    const api = async (m, b) => { sent.push({ method: m, body: b }); return { ok: true }; };
    const store = { get: (k) => db[String(k)], set: (k, v) => { db[String(k)] = JSON.parse(JSON.stringify(v)); }, delete: (k) => { delete db[String(k)]; } };
    const bot = createBot({ api, store, flow, nickId: '353195979', getListings: async () => rows });
    const from = { id: 91, first_name: 'K', language_code: 'ja' };
    const cb = (d) => bot.handleUpdate({ update_id: 2, callback_query: { id: 'c', from, data: d, message: { message_id: 5, chat: { id: 91, type: 'private' } } } });
    await bot.handleUpdate({ update_id: 1, message: { message_id: 2, chat: { id: 91, type: 'private' }, from, text: '/start' } });
    if (lang === 'en') await cb('l:en');
    await bot.handleUpdate({ update_id: 1, message: { message_id: 2, chat: { id: 91, type: 'private' }, from, text: '/buy' } });
    await cb('g:b1:' + (band === undefined ? 4 : band)); await cb('g:b2:2');
    return sent.filter((s) => /blockquote/.test(s.body.text || '')).map((s) => s.body.text).join('\n');
  }
  await t('the Sheet reader keeps net, gross and the old single size apart', () => {
    const by = (id) => rows.find((r) => r.id === id);
    assert.deepStrictEqual([by('S1').net, by('S1').gross, by('S4').net, by('S4').gross, by('S4').sqm], [38, 47, 0, 0, 56]);
  });
  await t('Japanese card: both sizes labelled, price per sqm on the net size', async () => {
    const text = await cardsFor('ja');
    const card = text.split('<blockquote>').find((x) => /Both Sizes/.test(x));
    assert.ok(/38㎡（専有・約11\.5坪） \/ 47㎡（総面積）/.test(card), card);
    assert.ok(/\$1,000\/㎡（専有）/.test(card), 'price per sqm uses the net size: ' + card);
  });
  await t('a single known size is labelled and priced on its own basis; an old single size with no basis shows plain with no price per sqm', async () => {
    const text = await cardsFor('ja');
    const net = text.split('<blockquote>').find((x) => /Net Only/.test(x)), gross = text.split('<blockquote>').find((x) => /Gross Only/.test(x));
    assert.ok(/35㎡（専有・約10\.6坪）/.test(net) && /\$1,143\/㎡（専有）/.test(net), net);
    assert.ok(/50㎡（総面積・約15\.1坪）/.test(gross) && /\$900\/㎡（総面積）/.test(gross), gross);
  });
  await t('an old single size: plain with no price per sqm when the basis is unknown, labelled and priced when a basis is set', async () => {
    const text = await cardsFor('ja', 1); // 50,000 to 100,000
    const plain = text.split('<blockquote>').find((x) => /Old Single/.test(x)), withBasis = text.split('<blockquote>').find((x) => /Old With Basis/.test(x));
    assert.ok(/56㎡（約16\.9坪）/.test(plain) && !/専有|総面積/.test(plain) && !/\/㎡/.test(plain), plain);
    assert.ok(/30㎡（専有・約9\.1坪）/.test(withBasis) && /\$2,000\/㎡（専有）/.test(withBasis), withBasis);
  });
  await t('English card reads naturally', async () => {
    const text = await cardsFor('en');
    const card = text.split('<blockquote>').find((x) => /Both Sizes/.test(x));
    assert.ok(/38 sqm net \/ 47 sqm gross/.test(card) && /\$1,000\/sqm net/.test(card), card);
  });
  console.log(`\nRESULTS: ${passed} / ${total} TESTS PASSED (${Math.round(passed / total * 100)}%)`);
  process.exit(passed === total ? 0 : 1);
})();
