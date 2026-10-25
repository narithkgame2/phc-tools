// Nick's Available / Not available / Checking now buttons on a listing inquiry.
const assert = require('assert');
const { createBot } = require('../bot.js');
const flow = require('../config/flow.json');
let passed = 0, total = 0;
async function t(name, fn) { total++; try { await fn(); passed++; console.log(`  ✅ Test ${total}: ${name}`); } catch (e) { console.log(`  ❌ Test ${total}: ${name}\n     ${e.message}`); } }

const NICK = 353195979;
const T0 = Date.parse('2026-10-25T00:00:00Z');
const listing = (o) => Object.assign({ id: 'TS7-5001', type: 'buy', name: 'Time Square 7', district: 'Toul Kork', khan: 'Toul Kork', sangkat: '', price: 70000, rent: 0, sqm: 40, beds: '1', floor: '', tenanted: false, preview: false, checked: '' }, o || {});

function rig(rows) {
  const sent = [], db = {}, mem = {}; let time = T0;
  const api = async (method, body) => { sent.push({ method, body }); return { ok: true }; };
  const store = { get: (k) => db[String(k)], set: (k, v) => { db[String(k)] = JSON.parse(JSON.stringify(v)); }, delete: (k) => { delete db[String(k)]; } };
  const listingState = { get: (k) => mem[k] && JSON.parse(JSON.stringify(mem[k])), set: (k, v) => { mem[k] = JSON.parse(JSON.stringify(v)); }, delete: (k) => { delete mem[k]; } };
  const bot = createBot({ api, store, flow, nickId: String(NICK), getListings: async () => rows, listingState, now: () => time });
  const user = (id, lang) => ({ id, first_name: 'K' + id, language_code: lang || 'ja' });
  const say = (from, text) => bot.handleUpdate({ update_id: 1, message: { message_id: 2, chat: { id: from.id, type: 'private' }, from, text } });
  const cb = (from, data) => bot.handleUpdate({ update_id: 2, callback_query: { id: 'c', from, data, message: { message_id: 5, chat: { id: from.id, type: 'private' } } } });
  const search = async (from) => { await say(from, '/buy'); await cb(from, 'g:b1:1'); await cb(from, 'g:b2:4'); }; // 50-100K, Toul Kork
  const shows = (id) => sent.some((s) => String(s.body.chat_id) === String(id) && /Time Square 7/.test(s.body.text || '') && /blockquote/.test(s.body.text || ''));
  const to = (id) => sent.filter((s) => String(s.body.chat_id) === String(id) && s.method === 'sendMessage');
  return { sent, mem, bot, user, say, cb, search, shows, to, advance: (days) => { time += days * 86400000; } };
}
const alertOf = (r) => r.to(NICK).filter((s) => /Listing interest/.test(s.body.text)).pop();

(async () => {
  await t('the inquiry alert carries Available, Not available and Checking now, and names the listing and price', async () => {
    const r = rig([listing()]), k = r.user(1001); await r.search(k); await r.cb(k, 'q:TS7-5001');
    const a = alertOf(r); const labels = a.body.reply_markup.inline_keyboard.flat().map((b) => b.text);
    assert.deepStrictEqual(labels, ['Available', 'Not available', 'Checking now']);
    assert.ok(/TS7-5001 Time Square 7, Toul Kork, \$70,000/.test(a.body.text));
    a.body.reply_markup.inline_keyboard.flat().forEach((b) => assert.ok(Buffer.byteLength(b.callback_data) <= 64));
  });
  await t('Nick testing his own bot gets no search or lead alert, but still gets the listing inquiry so he can test the buttons', async () => {
    const r = rig([listing()]), me = r.user(NICK); await r.search(me);
    assert.ok(!r.to(NICK).some((s) => /Search request/.test(s.body.text || '')), 'no alert about his own search');
    await r.cb(me, 'q:TS7-5001');
    const a = alertOf(r); assert.ok(a && /your own test/.test(a.body.text) && a.body.reply_markup.inline_keyboard.flat().length === 3);
    const other = rig([listing()]), k = other.user(2001); await other.search(k);
    assert.ok(other.to(NICK).some((s) => /Search request/.test(s.body.text || '')), 'a real client still triggers the alert');
  });
  await t('a tester account sees Preview listings and its inquiry is marked, but cannot use Nick\'s buttons', async () => {
    const sent = []; const db = {}; let tid = 777;
    const api = async (m, b) => { sent.push({ method: m, body: b }); return { ok: true }; };
    const store = { get: (k) => db[String(k)], set: (k, v) => { db[String(k)] = JSON.parse(JSON.stringify(v)); }, delete: (k) => { delete db[String(k)]; } };
    const rows = [listing({ preview: true })];
    const bot = createBot({ api, store, flow, nickId: String(NICK), getListings: async () => rows, testerIds: ['777'] });
    const mk = (id) => ({ id, first_name: 'T' + id, language_code: 'ja' });
    const run = async (from) => { for (const d of ['g:b1:1', 'g:b2:4']) { if (d === 'g:b1:1') await bot.handleUpdate({ update_id: 1, message: { message_id: 2, chat: { id: from.id, type: 'private' }, from, text: '/buy' } }); await bot.handleUpdate({ update_id: 2, callback_query: { id: 'c', from, data: d, message: { message_id: 5, chat: { id: from.id, type: 'private' } } } }); } };
    await run(mk(tid)); await run(mk(888));
    assert.ok(sent.some((s) => String(s.body.chat_id) === '777' && /Time Square 7/.test(s.body.text || '')), 'tester should see it');
    assert.ok(!sent.some((s) => String(s.body.chat_id) === '888' && /Time Square 7/.test(s.body.text || '')), 'a normal client must not');
    await bot.handleUpdate({ update_id: 3, callback_query: { id: 'c', from: mk(777), data: 'q:TS7-5001', message: { message_id: 5, chat: { id: 777, type: 'private' } } } });
    const alertMsg = sent.filter((s) => String(s.body.chat_id) === String(NICK) && /Listing interest/.test(s.body.text || '')).pop();
    assert.ok(alertMsg && /tester account/.test(alertMsg.body.text));
    await bot.handleUpdate({ update_id: 4, callback_query: { id: 'c', from: mk(777), data: 'v:n:TS7-5001:777', message: { message_id: 5, chat: { id: 777, type: 'private' } } } });
    assert.ok(!sent.some((s) => /成約済み/.test(s.body.text || '')), 'a tester must not be able to use Nick buttons');
  });
  await t('private test mode: only Nick and testers can use the bot, everyone else gets one polite line', async () => {
    const sent = []; const db = {}; let priv = true;
    const api = async (m, b) => { sent.push({ method: m, body: b }); return { ok: true }; };
    const store = { get: (k) => db[String(k)], set: (k, v) => { db[String(k)] = JSON.parse(JSON.stringify(v)); }, delete: (k) => { delete db[String(k)]; } };
    const bot = createBot({ api, store, flow, nickId: String(NICK), testerIds: ['777'], isPrivate: () => priv, getListings: async () => [listing()] });
    const say = (id, text, lang) => bot.handleUpdate({ update_id: 1, message: { message_id: 2, chat: { id, type: 'private' }, from: { id, first_name: 'X', language_code: lang || 'ja' }, text } });
    await say(555, '/buy'); await say(555, '/start', 'en');
    const outsider = sent.filter((s) => s.body.chat_id === 555);
    assert.strictEqual(outsider.length, 2); assert.ok(/準備中/.test(outsider[0].body.text) && /getting ready/.test(outsider[1].body.text)); assert.ok(!outsider.some((s) => /ご予算/.test(s.body.text)));
    await bot.handleUpdate({ update_id: 2, callback_query: { id: 'c', from: { id: 555, first_name: 'X' }, data: 'g:b1:1', message: { message_id: 5, chat: { id: 555, type: 'private' } } } });
    assert.ok(!sent.some((s) => s.body.chat_id === 555 && /エリア/.test(s.body.text || '')));
    sent.length = 0; await say(777, '/buy'); await say(NICK, '/buy');
    assert.ok(sent.some((s) => s.body.chat_id === 777 && /ご予算/.test(s.body.text)) && sent.some((s) => s.body.chat_id === NICK && /ご予算/.test(s.body.text)));
    priv = false; sent.length = 0; await say(555, '/buy'); assert.ok(sent.some((s) => s.body.chat_id === 555 && /ご予算/.test(s.body.text)), 'open again when the mode is switched off');
  });
  await t('a rental alert shows the monthly rent', async () => {
    const r = rig([listing({ id: 'R-1', type: 'rent', price: 0, rent: 700 })]), k = r.user(1002);
    await r.say(k, '/rent'); await r.cb(k, 'g:rr1:1'); await r.cb(k, 'g:rr2:2'); await r.cb(k, 'q:R-1');
    assert.ok(/\$700\/month/.test(alertOf(r).body.text));
  });
  await t('Checking now sends the client a holding message and changes nothing else', async () => {
    const r = rig([listing()]), k = r.user(1003); await r.search(k); await r.cb(k, 'q:TS7-5001');
    await r.cb(r.user(NICK), 'v:c:TS7-5001:1003');
    assert.ok(r.to(1003).some((s) => /確認中です/.test(s.body.text)));
    assert.ok(r.shows(1003) && !r.mem['TS7-5001'].status);
  });
  await t('Available confirms to the client with the LINE button and records today', async () => {
    const r = rig([listing()]), k = r.user(1004); await r.search(k); await r.cb(k, 'q:TS7-5001');
    await r.cb(r.user(NICK), 'v:a:TS7-5001:1004');
    const m = r.to(1004).pop();
    assert.ok(/確認が取れました。Time Square 7は現在ご案内可能です/.test(m.body.text));
    assert.ok(m.body.reply_markup.inline_keyboard[0][0].url.startsWith('https://line.me'));
    assert.strictEqual(r.mem['TS7-5001'].status, 'available');
  });
  await t('only Nick can use the buttons: a client tapping Not available changes nothing', async () => {
    const r = rig([listing()]), k = r.user(1005); await r.search(k); await r.cb(k, 'q:TS7-5001');
    await r.cb(k, 'v:n:TS7-5001:1005');
    assert.ok(!r.mem['TS7-5001'].status);
    assert.ok(!r.to(1005).some((s) => /成約済み/.test(s.body.text || '')));
  });
  await t('Not available hides the listing for everyone, tells the asker and the other recent askers, and offers Undo', async () => {
    const r = rig([listing()]), a = r.user(1006), b = r.user(1007, 'en'), c = r.user(1008);
    for (const k of [a, b]) { await r.search(k); await r.cb(k, 'q:TS7-5001'); }
    await r.cb(r.user(NICK), 'v:n:TS7-5001:1006');
    assert.ok(r.to(1006).some((s) => /成約済みまたは募集終了/.test(s.body.text)));
    assert.ok(r.to(1007).some((s) => /no longer available/.test(s.body.text)), 'the other asker should be told, in their language');
    const note = r.to(NICK).pop();
    assert.ok(/1 other client/.test(note.body.text) && /Sold or Rented in the Sheet/.test(note.body.text));
    assert.strictEqual(note.body.reply_markup.inline_keyboard[0][0].text, 'Undo');
    r.sent.length = 0; await r.search(c); assert.ok(!r.shows(1008), 'a new client must not see it');
  });
  await t('an asker from more than 7 days ago is not messaged when a unit goes', async () => {
    const r = rig([listing()]), a = r.user(1009), b = r.user(1010);
    await r.search(a); await r.cb(a, 'q:TS7-5001'); r.advance(8); await r.search(b); await r.cb(b, 'q:TS7-5001');
    await r.cb(r.user(NICK), 'v:n:TS7-5001:1010');
    assert.ok(!r.to(1009).some((s) => /成約済み/.test(s.body.text || '')));
  });
  await t('Undo puts the listing back', async () => {
    const r = rig([listing()]), k = r.user(1011), c = r.user(1012);
    await r.search(k); await r.cb(k, 'q:TS7-5001'); await r.cb(r.user(NICK), 'v:n:TS7-5001:1011'); await r.cb(r.user(NICK), 'v:u:TS7-5001');
    await r.search(c); assert.ok(r.shows(1012));
  });
  await t('a newer Last checked in the Sheet relists a unit Nick marked Not available', async () => {
    const rows = [listing()]; const r = rig(rows), k = r.user(1013), c = r.user(1014);
    await r.search(k); await r.cb(k, 'q:TS7-5001'); await r.cb(r.user(NICK), 'v:n:TS7-5001:1013');
    rows[0].checked = '2026-10-26'; r.advance(1);
    await r.search(c); assert.ok(r.shows(1014));
  });
  await t('Available restarts the 30 day clock; a unit not re-checked for 30 days hides itself', async () => {
    const rows = [listing({ checked: '2026-10-01' })]; const r = rig(rows), k = r.user(1015), c = r.user(1016), d = r.user(1017);
    await r.search(k); await r.cb(k, 'q:TS7-5001'); r.advance(20);
    await r.cb(r.user(NICK), 'v:a:TS7-5001:1015'); r.advance(20); // 40 days after the Sheet date, 20 after Nick's check
    await r.search(c); assert.ok(r.shows(1016), 'still fresh after Nick checked');
    r.advance(20); await r.search(d); assert.ok(!r.shows(1017), 'stale again 40 days after Nick checked');
  });
  await t('a stale button, a missing client and a broken id never crash', async () => {
    const r = rig([listing()]);
    await r.cb(r.user(NICK), 'v:a:NOPE-1:999'); await r.cb(r.user(NICK), 'v:z:TS7-5001:1'); await r.cb(r.user(NICK), 'v:u:NOPE-2'); await r.cb(r.user(NICK), 'v:a');
  });
  console.log(`\nRESULTS: ${passed} / ${total} TESTS PASSED (${Math.round(passed / total * 100)}%)`);
  process.exit(passed === total ? 0 : 1);
})();
