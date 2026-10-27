// Operations: listing links, compare, reply watchdog, Monday numbers, price drops, event counting.
const assert = require('assert');
const { createBot } = require('../bot.js');
const flow = require('../config/flow.json');
let passed = 0, total = 0;
async function t(name, fn) { total++; try { await fn(); passed++; console.log(`  ✅ Test ${total}: ${name}`); } catch (e) { console.log(`  ❌ Test ${total}: ${name}\n     ${e.message}`); } }

const NICK = 353195979;
const T0 = Date.parse('2026-10-27T02:00:00Z'); // Tuesday, 09:00 in Phnom Penh, 11:00 in Japan (the Monday digest does not interfere)
const listing = (o) => Object.assign({ id: 'TS5-5008', type: 'buy', name: 'Time Square 5', district: 'BKK1', khan: 'Boeng Keng Kang', sangkat: 'Boeung Keng Kang 1 (BKK1)', price: 82000, rent: 0, sqm: 0, net: 32, gross: 41, basis: '', beds: '1', floor: '15', tenanted: false, preview: false, checked: '', media: [] }, o || {});

function rig(rows) {
  const sent = [], db = {}, am = {}, st = {}, evs = []; let time = T0;
  const api = async (method, body) => { sent.push({ method, body }); return { ok: true }; };
  const store = { get: (k) => db[String(k)], set: (k, v) => { db[String(k)] = JSON.parse(JSON.stringify(v)); }, delete: (k) => { delete db[String(k)]; }, all: () => Object.keys(db).map((k) => db[k]) };
  const listingState = { get: (k) => st[k] && JSON.parse(JSON.stringify(st[k])), set: (k, v) => { st[k] = JSON.parse(JSON.stringify(v)); }, delete: (k) => { delete st[k]; } };
  const alertStore = { get: (k) => am[String(k)] && JSON.parse(JSON.stringify(am[String(k)])), set: (k, v) => { am[String(k)] = JSON.parse(JSON.stringify(v)); }, delete: (k) => { delete am[String(k)]; }, all: () => Object.keys(am).map((k) => JSON.parse(JSON.stringify(am[k]))) };
  const events = { add: (e) => { evs.push(e); }, since: (ms) => evs.filter((e) => e.t >= ms) };
  const bot = createBot({ api, store, flow, nickId: String(NICK), getListings: async () => rows, listingState, alertStore, events, now: () => time });
  const user = (id, lang) => ({ id, first_name: 'K' + id, language_code: lang || 'ja', username: 'k' + id });
  const say = (id, text, lang) => bot.handleUpdate({ update_id: 1, message: { message_id: 2, chat: { id, type: 'private' }, from: user(id, lang), text } });
  const cb = (id, data, lang) => bot.handleUpdate({ update_id: 2, callback_query: { id: 'c', from: user(id, lang), data, message: { message_id: 5, chat: { id, type: 'private' } } } });
  const to = (id) => sent.filter((s) => String(s.body.chat_id) === String(id) && s.method === 'sendMessage');
  const texts = (id) => to(id).map((s) => s.body.text);
  const labels = (m) => m.body.reply_markup.inline_keyboard.flat().map((b) => b.text);
  const search = async (id, band, area) => { await say(id, '/buy'); await cb(id, 'g:b1:' + (band === undefined ? 4 : band)); await cb(id, 'g:b2:' + (area === undefined ? 2 : area)); };
  return { sent, bot, say, cb, to, texts, labels, search, evs, setTime: (ms) => { time = ms; }, advance: (min) => { time += min * 60000; }, now: () => time, state: st };
}

(async () => {
  await t('a listing link opens that unit directly for a Japanese phone, with Ask and a way back to the menu', async () => {
    const r = rig([listing()]); await r.say(901, '/start TS5-5008');
    const m = r.to(901).pop(); assert.ok(/Time Square 5/.test(m.body.text) && /32㎡（専有・約9\.7坪） \/ 41㎡（総面積）/.test(m.body.text), m.body.text);
    assert.deepStrictEqual(labels(m), ['この物件について聞く TS5-5008', 'メインメニュー']);
    assert.ok(r.evs.some((e) => e.type === 'deeplink' && e.ref === 'TS5-5008'));
    function labels(x) { return r.labels(x); }
  });
  await t('a link to a unit that is gone or unknown says so politely; a client can never open a Preview unit by link', async () => {
    const r = rig([listing({ id: 'PV-1', preview: true, name: 'Hidden Place' })]);
    await r.say(902, '/start NOPE-123'); assert.ok(/ご案内できません/.test(r.texts(902).pop()));
    await r.say(902, '/start PV-1'); assert.ok(!r.texts(902).some((x) => /Hidden Place/.test(x)));
    await r.say(NICK, '/start PV-1'); assert.ok(r.texts(NICK).some((x) => /Hidden Place/.test(x)), 'Nick may');
  });
  await t('a non-Japanese phone picks a language first and then lands on the linked unit', async () => {
    const r = rig([listing()]); await r.say(903, '/start TS5-5008', 'en');
    assert.ok(/Choose your language/.test(r.texts(903).pop())); await r.cb(903, 'l:en', 'en');
    assert.ok(/Time Square 5/.test(r.texts(903).pop()) && /Ask about/.test(JSON.stringify(r.to(903).pop().body.reply_markup)));
  });
  await t('/link gives Nick the link for a unit and nobody else', async () => {
    const r = rig([listing()]); await r.say(NICK, '/link TS5-5008'); assert.ok(/https:\/\/t\.me\/Nick_Cambodia_Bot\?start=TS5-5008/.test(r.texts(NICK).pop()));
    await r.say(904, '/link TS5-5008'); assert.ok(/ご利用いただけません/.test(r.texts(904).pop()));
  });
  await t('compare: a button under two or three results opens a side by side with net and gross separate and price per sqm only where known', async () => {
    const r = rig([listing(), listing({ id: 'TS5-5012', price: 88000, net: 0, gross: 0, sqm: 56, floor: '25' }), listing({ id: 'JT2-5014', name: 'J Tower 2', price: 178000, net: 65, gross: 0, beds: '2', floor: '12' })]);
    await r.search(905); const res = r.to(905).find((s) => /ご希望に近い物件/.test(s.body.text));
    const btn = res.body.reply_markup.inline_keyboard.flat().find((b) => /^cmp:/.test(b.callback_data)); assert.ok(btn && btn.text === '3件を比較する', 'compare button');
    await r.cb(905, btn.callback_data); const c = r.texts(905).pop();
    assert.ok(/<b>比較<\/b>/.test(c) && /A  Time Square 5/.test(c) && /<b>価格<\/b>  A \$82,000 \/ B \$88,000 \/ C \$178,000/.test(c));
    assert.ok(/<b>専有面積<\/b>  A 32㎡ \/ B - \/ C 65㎡/.test(c) && /<b>総面積<\/b>  A 41㎡ \/ B - \/ C -/.test(c) && /<b>面積（区分不明）<\/b>  A - \/ B 56㎡ \/ C -/.test(c));
    assert.ok(/専有1㎡あたり<\/b>  A \$2,563 \/ B - \/ C \$2,738/.test(c), c);
    assert.ok(r.evs.some((e) => e.type === 'compare'));
  });
  await t('one result has no compare button', async () => {
    const r = rig([listing()]); await r.search(906); assert.ok(!JSON.stringify(r.to(906).find((s) => /ご希望に近い物件/.test(s.body.text)).body.reply_markup).includes('cmp:'));
  });
  await t('reply watchdog: no reminder before an hour, then 1 hour, 4 hours and 1 day, with the answer buttons; replying closes it', async () => {
    const r = rig([listing()]); await r.search(907); await r.cb(907, 'q:TS5-5008');
    assert.strictEqual(await r.bot.runOps(), 0); r.advance(59); assert.strictEqual(await r.bot.runOps(), 0, 'not yet');
    r.advance(2); assert.strictEqual(await r.bot.runOps(), 1);
    const rem = r.to(NICK).pop(); assert.ok(/No reply yet/.test(rem.body.text) && /asked about TS5-5008 Time Square 5 1 hour ago/.test(rem.body.text), rem.body.text);
    assert.deepStrictEqual(r.labels(rem), ['Available', 'Not available', 'Checking now']);
    assert.strictEqual(await r.bot.runOps(), 0, 'not twice'); r.advance(180); assert.strictEqual(await r.bot.runOps(), 1); assert.ok(/4 hours ago/.test(r.to(NICK).pop().body.text));
    await r.cb(NICK, 'v:c:TS5-5008:907'); r.advance(1500); assert.strictEqual(await r.bot.runOps(), 0, 'a reply closes the question');
    const rep = r.evs.find((e) => e.type === 'reply'); assert.ok(rep && rep.ms > 4 * 3600000);
  });
  await t('reply watchdog stays quiet at night in Phnom Penh and Nick\'s own tests are not counted', async () => {
    const r = rig([listing()]); await r.search(908); await r.cb(908, 'q:TS5-5008'); r.setTime(Date.parse('2026-10-27T16:30:00Z')); // 23:30 in Phnom Penh
    assert.strictEqual(await r.bot.runOps(), 0); r.setTime(Date.parse('2026-10-28T01:00:00Z')); assert.strictEqual(await r.bot.runOps(), 1, 'first thing in the morning');
    const r2 = rig([listing()]); await r2.search(NICK); await r2.cb(NICK, 'q:TS5-5008'); r2.advance(300); assert.strictEqual(await r2.bot.runOps(), 0);
    assert.ok(!r2.evs.some((e) => e.type === 'ask' || e.type === 'search' || e.type === 'new'), 'the admin is not a client');
  });
  await t('Monday numbers: sent once on Monday morning with real counts and the LINE and Telegram limit stated; not on other days', async () => {
    const r = rig([listing(), listing({ id: 'X-2', price: 90000 })]);
    await r.search(910); await r.cb(910, 'q:TS5-5008'); await r.search(911, 1, 4); // the second search finds nothing in Toul Kork
    await r.cb(NICK, 'v:a:TS5-5008:910');
    r.setTime(Date.parse('2026-11-02T02:30:00Z')); // the next Monday, 09:30 in Phnom Penh
    assert.strictEqual(await r.bot.runOps(), 1); const d = r.texts(NICK).pop();
    assert.ok(/<b>Weekly numbers<\/b>/.test(d) && /New clients: 2 \(before: 0\)/.test(d) && /Searches: 2 \(before: 0\), 1 found nothing/.test(d) && /Questions about a unit \(Ask\): 1 \(before: 0\) on 1 different units/.test(d) && /Your replies: 1 of 1/.test(d) && /Most asked: TS5-5008 \(1\)/.test(d) && /cannot count taps on the contact buttons, so chats on LINE \(Japanese clients\) and on your own Telegram/.test(d), d);
    assert.strictEqual(await r.bot.runOps(), 0, 'once a week');
    const r2 = rig([listing()]); r2.setTime(Date.parse('2026-10-28T03:00:00Z')); assert.strictEqual(await r2.bot.runOps(), 0, 'not on a Wednesday');
  });
  await t('price drops: the first look only records prices; a drop of 1 percent or more reaches matching alert clients and clients who asked, once', async () => {
    const rows = [listing(), listing({ id: 'TS5-5012', price: 90000, net: 40 }), listing({ id: 'JT2-5014', name: 'J Tower 2', price: 178000, net: 65 })];
    const r = rig(rows); await r.search(920, 1, 2); await r.cb(920, 'al:on'); // 50-100K, BKK1: matches TS5 units
    await r.search(921, 3, 2); await r.cb(921, 'al:on'); // 200K+, BKK1: matches none
    await r.search(922, 1, 2); await r.cb(922, 'q:TS5-5008');
    assert.strictEqual(await r.bot.runOps(), 0, 'first look');
    rows[0].price = 82000 * 0.995; assert.strictEqual(await r.bot.runOps(), 0, 'half a percent is not a drop');
    rows[0].price = 77900; r.sent.length = 0; await r.bot.runOps();
    const msg = r.texts(920).pop(); assert.ok(/値下げのお知らせ/.test(msg) && /\$82,000 → \$77,900<\/b> \(-5%\)/.test(msg), msg);
    assert.ok(r.texts(922).some((x) => /値下げ/.test(x)), 'a client who asked about it hears too'); assert.ok(!r.texts(921).some((x) => /値下げ/.test(x)), 'a client whose search does not match does not');
    r.sent.length = 0; await r.bot.runOps(); assert.ok(!r.texts(920).some((x) => /値下げ/.test(x)), 'only once');
    assert.ok(r.evs.filter((e) => e.type === 'drop_sent').length === 2);
  });
  await t('a price drop found at night in Japan waits until 9:00', async () => {
    const rows = [listing()]; const r = rig(rows); await r.search(930, 1, 2); await r.cb(930, 'al:on'); await r.bot.runOps();
    rows[0].price = 70000; r.setTime(Date.parse('2026-10-27T15:30:00Z')); // 00:30 in Japan
    r.sent.length = 0; await r.bot.runOps(); assert.ok(!r.texts(930).some((x) => /値下げ/.test(x)));
    r.setTime(Date.parse('2026-10-27T23:30:00Z')); await r.bot.runOps(); assert.ok(!r.texts(930).some((x) => /値下げ/.test(x)), '08:30 in Japan is still too early');
    r.setTime(Date.parse('2026-10-28T00:30:00Z')); await r.bot.runOps(); assert.ok(r.texts(930).some((x) => /値下げ/.test(x)), 'sent at 09:30 in Japan');
  });
  console.log(`\nRESULTS: ${passed} / ${total} TESTS PASSED (${Math.round(passed / total * 100)}%)`);
  process.exit(passed === total ? 0 : 1);
})();
