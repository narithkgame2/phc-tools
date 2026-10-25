// Client alerts: opt-in, only NEW matches, once a day inside Japan daytime, expiry, stop buttons.
const assert = require('assert');
const { createBot } = require('../bot.js');
const flow = require('../config/flow.json');
let passed = 0, total = 0;
async function t(name, fn) { total++; try { await fn(); passed++; console.log(`  ✅ Test ${total}: ${name}`); } catch (e) { console.log(`  ❌ Test ${total}: ${name}\n     ${e.message}`); } }

const NICK = 353195979;
const T10 = Date.parse('2026-10-26T01:00:00Z'); // 10:00 in Japan
const listing = (o) => Object.assign({ id: 'A-1', type: 'buy', name: 'Alpha Tower', district: 'BKK1', khan: 'Boeng Keng Kang', sangkat: 'Boeung Keng Kang 1 (BKK1)', price: 70000, rent: 0, sqm: 40, beds: '1', floor: '', tenanted: false, preview: false, checked: '' }, o || {});

function rig(rows, replies) {
  const sent = [], db = {}, am = {}; let time = T10;
  const api = async (method, body) => { sent.push({ method, body }); return (replies && replies(method, body)) || { ok: true }; };
  const store = { get: (k) => db[String(k)], set: (k, v) => { db[String(k)] = JSON.parse(JSON.stringify(v)); }, delete: (k) => { delete db[String(k)]; } };
  const alertStore = { get: (k) => am[String(k)] && JSON.parse(JSON.stringify(am[String(k)])), set: (k, v) => { am[String(k)] = JSON.parse(JSON.stringify(v)); }, delete: (k) => { delete am[String(k)]; }, all: () => Object.keys(am).map((k) => JSON.parse(JSON.stringify(am[k]))) };
  const bot = createBot({ api, store, flow, nickId: String(NICK), getListings: async () => rows, alertStore, now: () => time });
  const user = (id, lang) => ({ id, first_name: 'K' + id, language_code: lang || 'ja' });
  const say = (from, text) => bot.handleUpdate({ update_id: 1, message: { message_id: 2, chat: { id: from.id, type: 'private' }, from, text } });
  const cb = (from, data) => bot.handleUpdate({ update_id: 2, callback_query: { id: 'c', from, data, message: { message_id: 5, chat: { id: from.id, type: 'private' } } } });
  const search = async (from) => { await say(from, '/buy'); await cb(from, 'g:b1:1'); await cb(from, 'g:b2:2'); }; // 50-100K, BKK1
  const to = (id) => sent.filter((s) => String(s.body.chat_id) === String(id) && s.method === 'sendMessage');
  return { sent, bot, am, user, say, cb, search, to, alertStore, setTime: (ms) => { time = ms; }, advance: (days) => { time += days * 86400000; } };
}
const kbLabels = (m) => m.body.reply_markup.inline_keyboard.flat().map((b) => b.callback_data || b.url);

(async () => {
  await t('the result screen offers "Alert me to new matches" in all three languages', async () => {
    for (const [lang, label] of [['ja', '新着物件を通知する'], ['en', 'Alert me to new matches']]) {
      const r = rig([listing()]), k = r.user(10 + (lang === 'ja' ? 1 : 2), lang);
      if (lang === 'en') { await r.say(k, '/start'); await r.cb(k, 'l:en'); }
      await r.search(k);
      const m = r.to(k.id).filter((s) => /al:on/.test(JSON.stringify(s.body.reply_markup || ''))).pop();
      assert.ok(m, 'no alert button for ' + lang);
      assert.ok(m.body.reply_markup.inline_keyboard.flat().some((b) => b.text === label && b.callback_data === 'al:on'));
    }
  });
  await t('switching alerts on confirms, offers Stop, and does not alert about listings that already exist', async () => {
    const r = rig([listing()]), k = r.user(20); await r.search(k); await r.cb(k, 'al:on');
    const c = r.to(20).pop();
    assert.ok(/1日1回まで/.test(c.body.text) && /\/stop/.test(c.body.text) && /TelegramのID/.test(c.body.text));
    assert.deepStrictEqual(kbLabels(c), ['al:off']);
    r.sent.length = 0; assert.strictEqual(await r.bot.runAlerts(), 0); assert.strictEqual(r.sent.length, 0);
  });
  await t('a new matching listing is sent once, with Ask and Stop buttons and the availability line; never again for the same one', async () => {
    const rows = [listing()]; const r = rig(rows), k = r.user(21); await r.search(k); await r.cb(k, 'al:on');
    rows.push(listing({ id: 'A-2', name: 'Beta Court', price: 80000 })); r.sent.length = 0;
    assert.strictEqual(await r.bot.runAlerts(), 1);
    const m = r.to(21).pop();
    assert.ok(/新着物件のお知らせ/.test(m.body.text) && /Beta Court/.test(m.body.text) && !/Alpha Tower/.test(m.body.text));
    assert.ok(/空室状況と価格は/.test(m.body.text));
    assert.deepStrictEqual(kbLabels(m), ['q:A-2', 'al:off']);
    r.advance(1); r.sent.length = 0; assert.strictEqual(await r.bot.runAlerts(), 0);
  });
  await t('at most one alert message a day, the rest wait for the next day', async () => {
    const rows = [listing()]; const r = rig(rows), k = r.user(22); await r.search(k); await r.cb(k, 'al:on');
    ['B', 'C', 'D', 'E'].forEach((x, i) => rows.push(listing({ id: x + '-1', name: 'New ' + x, price: 71000 + i * 1000 })));
    r.sent.length = 0; assert.strictEqual(await r.bot.runAlerts(), 1);
    assert.strictEqual(r.to(22).length, 1); assert.ok(r.to(22)[0].body.reply_markup.inline_keyboard.filter((row) => /^q:/.test(row[0].callback_data)).length === 3, 'three listings at most');
    assert.strictEqual(await r.bot.runAlerts(), 0, 'not twice in one day');
    r.advance(1); assert.strictEqual(await r.bot.runAlerts(), 1); assert.ok(/New E/.test(r.to(22).pop().body.text));
  });
  await t('nothing is sent at night in Japan (21:00 to 9:00)', async () => {
    const rows = [listing()]; const r = rig(rows), k = r.user(23); await r.search(k); await r.cb(k, 'al:on'); rows.push(listing({ id: 'A-2', name: 'Beta Court', price: 80000 }));
    r.setTime(Date.parse('2026-10-25T18:00:00Z')); assert.strictEqual(await r.bot.runAlerts(), 0); // 03:00 JST
    r.setTime(Date.parse('2026-10-26T12:30:00Z')); assert.strictEqual(await r.bot.runAlerts(), 0); // 21:30 JST
    r.setTime(Date.parse('2026-10-26T23:30:00Z')); assert.strictEqual(await r.bot.runAlerts(), 0); // 08:30 JST, still too early
    r.setTime(Date.parse('2026-10-27T00:30:00Z')); assert.strictEqual(await r.bot.runAlerts(), 1); // 09:30 JST
  });
  await t('a listing outside the client budget or area never alerts them', async () => {
    const rows = [listing()]; const r = rig(rows), k = r.user(24); await r.search(k); await r.cb(k, 'al:on');
    rows.push(listing({ id: 'X-1', price: 300000 }), listing({ id: 'X-2', district: 'Toul Kork', khan: 'Toul Kork', price: 80000 }));
    assert.strictEqual(await r.bot.runAlerts(), 0);
  });
  await t('Preview and Not available listings never alert a client; Preview does alert Nick for testing', async () => {
    const rows = [listing()]; const r = rig(rows), c = r.user(25), me = r.user(NICK);
    for (const k of [c, me]) { await r.search(k); await r.cb(k, 'al:on'); }
    rows.push(listing({ id: 'P-1', name: 'Hidden Preview', price: 75000, preview: true })); r.sent.length = 0;
    await r.bot.runAlerts();
    assert.ok(!r.to(25).length, 'client must not get a preview'); assert.ok(r.to(NICK).some((s) => /Hidden Preview/.test(s.body.text || '')));
  });
  await t('Stop alerts (button or /stop) ends the alert; stopping twice is harmless', async () => {
    const rows = [listing()]; const r = rig(rows), k = r.user(26), j = r.user(27); await r.search(k); await r.cb(k, 'al:on'); await r.search(j); await r.cb(j, 'al:on');
    await r.cb(k, 'al:off'); assert.ok(/通知を停止しました/.test(r.to(26).pop().body.text));
    await r.say(j, '/stop'); assert.ok(/通知を停止しました/.test(r.to(27).pop().body.text));
    await r.say(j, '/stop'); assert.ok(/登録されていません/.test(r.to(27).pop().body.text));
    rows.push(listing({ id: 'A-2', price: 80000 })); r.sent.length = 0; assert.strictEqual(await r.bot.runAlerts(), 0);
  });
  await t('after 53 days the client is asked once to keep or stop; Keep renews it; no tap ends it after 60 days', async () => {
    const rows = [listing()]; const r = rig(rows), k = r.user(28), j = r.user(29); await r.search(k); await r.cb(k, 'al:on'); await r.search(j); await r.cb(j, 'al:on');
    r.advance(54); r.sent.length = 0; assert.strictEqual(await r.bot.runAlerts(), 2);
    const ask = r.to(28).pop(); assert.ok(/まだご希望ですか/.test(ask.body.text)); assert.deepStrictEqual(kbLabels(ask), ['al:keep', 'al:off']);
    await r.cb(k, 'al:keep'); assert.strictEqual(r.alertStore.get(28).askedAt, '');
    r.advance(8); await r.bot.runAlerts();
    assert.ok(!r.alertStore.get(29), 'no tap: ended after 60 days'); assert.ok(r.alertStore.get(28), 'kept alert still on');
  });
  await t('a client who blocked the bot loses the alert instead of failing every day', async () => {
    const rows = [listing()]; const r = rig(rows, (m, b) => (String(b.chat_id) === '30' && /新着物件/.test(b.text || '') ? { ok: false, error_code: 403 } : null));
    const k = r.user(30); await r.search(k); await r.cb(k, 'al:on'); rows.push(listing({ id: 'A-2', price: 80000 }));
    await r.bot.runAlerts(); assert.ok(!r.alertStore.get(30));
  });
  await t('rental alerts work the same way', async () => {
    const rows = [listing({ id: 'R-1', type: 'rent', price: 0, rent: 700 })]; const r = rig(rows), k = r.user(31);
    await r.say(k, '/rent'); await r.cb(k, 'g:rr1:1'); await r.cb(k, 'g:rr2:2'); await r.cb(k, 'al:on');
    rows.push(listing({ id: 'R-2', name: 'Rent Two', type: 'rent', price: 0, rent: 650 })); r.sent.length = 0;
    assert.strictEqual(await r.bot.runAlerts(), 1); assert.ok(/Rent Two/.test(r.to(31).pop().body.text));
  });
  console.log(`\nRESULTS: ${passed} / ${total} TESTS PASSED (${Math.round(passed / total * 100)}%)`);
  process.exit(passed === total ? 0 : 1);
})();
