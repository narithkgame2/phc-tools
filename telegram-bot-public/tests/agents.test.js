// Phase 2: the agent area. Role check, add-a-unit wizard, Nick's approval, channels, weekly check, sold, price change.
const assert = require('assert');
const { createBot } = require('../bot.js');
const flow = require('../config/flow.json');
let passed = 0, total = 0;
async function t(name, fn) { total++; try { await fn(); passed++; console.log(`  ✅ Test ${total}: ${name}`); } catch (e) { console.log(`  ❌ Test ${total}: ${name}\n     ${e.message}`); } }

const NICK = 353195979, A = 700001, B = 700002, CLIENT = 555;
const T0 = Date.parse('2026-10-26T03:00:00Z'); // 10:00 in Phnom Penh
const places = { places: [{ name: 'Time Square 5', khan: 'Boeng Keng Kang', sangkat: 'Boeung Keng Kang 1 (BKK1)', area: 'BKK1' }] };
const CHANNELS = [{ chat: '@Nick_Cambodia', mode: 'auto', lang: 'jp' }, { chat: '@NickREAKH', mode: 'confirm', lang: 'en' }];

function rig(opts) {
  opts = opts || {};
  const sent = [], db = {}; let time = T0;
  const api = async (method, body) => { sent.push({ method, body }); return (opts.reply && opts.reply(method, body)) || { ok: true }; };
  const store = { get: (k) => db[String(k)], set: (k, v) => { db[String(k)] = JSON.parse(JSON.stringify(v)); }, delete: (k) => { delete db[String(k)]; } };
  const ag = {}, un = {}; let seq = 0;
  const agentData = { getAgent: (k) => ag[String(k)], setAgent: (k, v) => { ag[String(k)] = JSON.parse(JSON.stringify(v)); }, deleteAgent: (k) => { delete ag[String(k)]; }, allAgents: () => Object.keys(ag).map((k) => ag[k]),
    getUnit: (k) => (un[k] ? JSON.parse(JSON.stringify(un[k])) : undefined), setUnit: (k, v) => { un[k] = JSON.parse(JSON.stringify(v)); }, allUnits: () => Object.keys(un).map((k) => JSON.parse(JSON.stringify(un[k]))), nextSeq: () => ++seq };
  const bot = createBot({ api, store, flow, nickId: String(NICK), agentData, channels: CHANNELS, places, getListings: async () => [], now: () => time });
  const user = (id, lang) => ({ id, first_name: 'U' + id, language_code: lang || 'en' });
  const say = (id, text) => bot.handleUpdate({ update_id: 1, message: { message_id: 2, chat: { id, type: 'private' }, from: user(id), text } });
  const photo = (id, fileId, group) => bot.handleUpdate({ update_id: 1, message: { message_id: 3, chat: { id, type: 'private' }, from: user(id), photo: [{ file_id: 's_' + fileId }, { file_id: fileId }], media_group_id: group } });
  const cb = (id, data, lang) => bot.handleUpdate({ update_id: 2, callback_query: { id: 'c', from: user(id, lang), data, message: { message_id: 5, chat: { id, type: 'private' } } } });
  const to = (id) => sent.filter((s) => String(s.body.chat_id) === String(id));
  const texts = (id) => to(id).map((s) => s.body.text || s.body.caption || '').filter(Boolean);
  const labels = (m) => (m.body.reply_markup ? m.body.reply_markup.inline_keyboard.flat().map((b) => b.text) : []);
  const last = (id) => to(id).filter((s) => s.method === 'sendMessage').pop();
  return { sent, bot, agentData, say, photo, cb, to, texts, labels, last, user, setTime: (ms) => { time = ms; }, advanceDays: (d) => { time += d * 86400000; }, advanceHours: (h) => { time += h * 3600000; }, units: () => agentData.allUnits() };
}

// a whole agent submission, returns the rig with a pending unit TS5-6001
async function submitted(r, agent) {
  agent = agent || A;
  await r.say(NICK, '/addagent ' + agent + ' Dara');
  await r.say(agent, '/myunits'); await r.cb(agent, 'aw:start');
  await r.say(agent, 'Time Square 5'); await r.cb(agent, 'aw:type:buy'); await r.say(agent, '82000'); await r.say(agent, '32'); await r.say(agent, '41');
  await r.cb(agent, 'aw:beds:1'); await r.say(agent, '15'); await r.cb(agent, 'aw:area:BKK1');
  await r.photo(agent, 'F1', 'g1'); await r.photo(agent, 'F2', 'g1');
  await r.cb(agent, 'aw:photos:done'); await r.cb(agent, 'aw:submit');
}

(async () => {
  await t('role check: a normal client sees the usual unknown-command screen and nothing opens', async () => {
    const r = rig(); const from = { id: CLIENT, first_name: 'C', language_code: 'ja' };
    await r.bot.handleUpdate({ update_id: 1, message: { message_id: 2, chat: { id: CLIENT, type: 'private' }, from, text: '/myunits' } });
    await r.bot.handleUpdate({ update_id: 1, message: { message_id: 3, chat: { id: CLIENT, type: 'private' }, from, text: '/addagent 555 Me' } });
    assert.ok(r.texts(CLIENT).every((x) => /ご利用いただけません/.test(x)), r.texts(CLIENT).join('|'));
    assert.strictEqual(r.agentData.allAgents().length, 0, 'a client must not be able to add himself');
    await r.cb(CLIENT, 'aw:start'); assert.ok(!r.texts(CLIENT).some((x) => /Add a unit/.test(x)));
  });
  await t('Nick adds, lists and removes agents', async () => {
    const r = rig();
    await r.say(NICK, '/addagent abc'); assert.ok(/Send: \/addagent/.test(r.texts(NICK).pop()));
    await r.say(NICK, '/addagent 700001 Dara Sok'); assert.ok(/Agent added: Dara Sok/.test(r.texts(NICK).pop()));
    await r.say(NICK, '/agents'); assert.ok(/Dara Sok \(700001\)/.test(r.texts(NICK).pop()));
    await r.say(NICK, '/removeagent 700001'); await r.say(NICK, '/agents'); assert.ok(/None yet/.test(r.texts(NICK).pop()));
  });
  await t('the add-a-unit wizard asks one thing at a time, rejects bad numbers and needs at least one size', async () => {
    const r = rig(); await r.say(NICK, '/addagent 700001 Dara'); await r.say(A, '/myunits'); assert.ok(r.labels(r.last(A)).includes('Add a unit'));
    await r.cb(A, 'aw:start'); assert.ok(/step 1 of 9/.test(r.last(A).body.text));
    await r.say(A, 'Time Square 5'); await r.cb(A, 'aw:type:buy');
    await r.say(A, 'cheap'); assert.ok(/as a number/.test(r.last(A).body.text), 'a word is not a price');
    await r.say(A, '82,000'); assert.ok(/Net size/.test(r.last(A).body.text));
    await r.say(A, '-'); await r.say(A, '-'); assert.ok(/at least one size/.test(r.last(A).body.text));
    await r.say(A, '41'); assert.ok(/bedrooms/.test(r.last(A).body.text));
    await r.cb(A, 'aw:beds:1'); await r.say(A, '15');
    const areaMsg = r.last(A); assert.ok(r.labels(areaMsg).includes('Use BKK1 (from the map)'), r.labels(areaMsg).join(','));
  });
  await t('a submission reaches Nick with the photos and Approve / Reject, and nothing is visible to clients yet', async () => {
    const r = rig(); await submitted(r);
    const card = r.last(NICK); assert.ok(/New unit to approve/.test(card.body.text) && /TS5-6001/.test(card.body.text) && /32 sqm net \/ 41 sqm gross/.test(card.body.text));
    assert.deepStrictEqual(r.labels(card), ['Approve', 'Reject']);
    assert.ok(r.to(NICK).some((s) => s.method === 'sendMediaGroup' && s.body.media.length === 2), 'photos go to Nick');
    assert.ok(/Submitted as .*TS5-6001/.test(r.texts(A).pop()));
    await r.say(CLIENT, '/buy'); await r.cb(CLIENT, 'g:b1:1'); await r.cb(CLIENT, 'g:b2:2');
    assert.ok(!r.texts(CLIENT).some((x) => /Time Square 5/.test(x)), 'pending units never show to clients');
  });
  await t('only Nick can approve; approving shows the unit to clients, tells the agent and posts to the Japanese channel', async () => {
    const r = rig(); await submitted(r);
    await r.cb(A, 'ua:TS5-6001'); await r.cb(CLIENT, 'ua:TS5-6001'); assert.strictEqual(r.units()[0].status, 'pending', 'an agent or a client cannot approve');
    await r.cb(NICK, 'ua:TS5-6001');
    assert.strictEqual(r.units()[0].status, 'active');
    assert.ok(/approved and now shows to clients/.test(r.texts(A).pop()));
    const jp = r.to('@Nick_Cambodia').find((s) => s.method === 'sendMediaGroup');
    assert.ok(jp, 'posted to the channel'); const cap = jp.body.media[0].caption;
    assert.ok(/新着物件/.test(cap) && /32㎡（専有） \/ 41㎡（総面積）/.test(cap) && /LINEでNickに相談/.test(cap) && !/\+855|phc|PHC/i.test(cap), cap);
    const conf = r.last(NICK); assert.ok(/approved and live/.test(conf.body.text) && r.labels(conf).includes('Also post to @NickREAKH'));
    assert.ok(!r.to('@NickREAKH').length, 'the REAKH channel is not posted without Nick\'s tap');
  });
  await t('the one tap posts the English draft to @NickREAKH, and only Nick can tap it', async () => {
    const r = rig(); await submitted(r); await r.cb(NICK, 'ua:TS5-6001');
    await r.cb(A, 'uc:TS5-6001:1'); assert.ok(!r.to('@NickREAKH').length);
    await r.cb(NICK, 'uc:TS5-6001:1');
    const en = r.to('@NickREAKH').find((s) => s.method === 'sendMediaGroup'); assert.ok(en && /New listing/.test(en.body.media[0].caption) && /32 sqm net \/ 41 sqm gross/.test(en.body.media[0].caption));
  });
  await t('a channel the bot cannot post to is reported to Nick, the unit still goes live', async () => {
    const r = rig({ reply: (m, b) => (b.chat_id === '@Nick_Cambodia' ? { ok: false, description: 'Forbidden: bot is not a member of the channel chat' } : null) });
    await submitted(r); await r.cb(NICK, 'ua:TS5-6001');
    assert.strictEqual(r.units()[0].status, 'active'); assert.ok(/Could not post to @Nick_Cambodia/.test(r.last(NICK).body.text) && /administrator/.test(r.last(NICK).body.text));
  });
  await t('clients see the approved unit with a Photos button that sends the photos', async () => {
    const r = rig(); await submitted(r); await r.cb(NICK, 'ua:TS5-6001');
    await r.say(CLIENT, '/buy'); await r.cb(CLIENT, 'g:b1:1'); await r.cb(CLIENT, 'g:b2:2');
    const card = r.to(CLIENT).find((s) => /Time Square 5/.test(s.body.text || '')); assert.ok(card, 'the unit is listed');
    const btns = card.body.reply_markup.inline_keyboard.flat().map((b) => b.callback_data); assert.ok(btns.includes('ph:TS5-6001') && btns.includes('q:TS5-6001'));
    r.sent.length = 0; await r.cb(CLIENT, 'ph:TS5-6001');
    assert.ok(r.to(CLIENT).some((s) => s.method === 'sendMediaGroup' && s.body.media.map((x) => x.media).join() === 'F1,F2'));
  });
  await t('reject: the agent is told, the unit never shows', async () => {
    const r = rig(); await submitted(r); await r.cb(NICK, 'ur:TS5-6001');
    assert.strictEqual(r.units()[0].status, 'rejected'); assert.ok(/was not approved/.test(r.texts(A).pop()));
  });
  await t('weekly check: nothing before 7 days or at night; after 7 days the agent is asked; Still available restarts the clock', async () => {
    const r = rig(); await submitted(r); await r.cb(NICK, 'ua:TS5-6001');
    r.advanceDays(6); assert.strictEqual(await r.bot.runAgentChecks(), 0);
    r.advanceDays(1); r.setTime(Date.parse('2026-11-02T18:00:00Z')); assert.strictEqual(await r.bot.runAgentChecks(), 0, 'night in Phnom Penh');
    r.setTime(Date.parse('2026-11-02T03:00:00Z')); assert.strictEqual(await r.bot.runAgentChecks(), 1);
    const ask = r.last(A); assert.ok(/Still available\?/.test(ask.body.text)); assert.deepStrictEqual(r.labels(ask), ['Still available', 'Sold', 'Price changed']);
    r.sent.length = 0; assert.strictEqual(await r.bot.runAgentChecks(), 0, 'not again the same day');
    await r.cb(A, 'ac:TS5-6001:y'); assert.ok(/confirmed available today/.test(r.texts(A).pop()));
    r.setTime(Date.parse('2026-11-08T03:00:00Z')); assert.strictEqual(await r.bot.runAgentChecks(), 0, '6 days after the confirmation');
    r.setTime(Date.parse('2026-11-09T03:00:00Z')); assert.strictEqual(await r.bot.runAgentChecks(), 1);
  });
  await t('three unanswered reminders hide the unit and tell Nick; the agent brings it back with Still available', async () => {
    const r = rig(); await submitted(r); await r.cb(NICK, 'ua:TS5-6001');
    r.setTime(Date.parse('2026-11-02T03:00:00Z')); await r.bot.runAgentChecks();
    r.advanceHours(24); await r.bot.runAgentChecks(); r.advanceHours(24); await r.bot.runAgentChecks();
    assert.strictEqual(r.units()[0].reminders, 3); r.advanceHours(24); await r.bot.runAgentChecks();
    assert.strictEqual(r.units()[0].status, 'stale'); assert.ok(/did not confirm it after 3 reminders/.test(r.texts(NICK).pop()));
    await r.say(CLIENT, '/buy'); await r.cb(CLIENT, 'g:b1:1'); await r.cb(CLIENT, 'g:b2:2'); assert.ok(!r.texts(CLIENT).some((x) => /Time Square 5/.test(x)));
    await r.cb(A, 'ac:TS5-6001:y'); assert.strictEqual(r.units()[0].status, 'active');
  });
  await t('Sold: hidden at once, Nick is told, and clients who asked in the last 7 days are told too', async () => {
    const r = rig(); await submitted(r); await r.cb(NICK, 'ua:TS5-6001');
    await r.say(CLIENT, '/buy'); await r.cb(CLIENT, 'g:b1:1'); await r.cb(CLIENT, 'g:b2:2'); await r.cb(CLIENT, 'q:TS5-6001');
    r.sent.length = 0; await r.cb(A, 'ac:TS5-6001:s');
    assert.strictEqual(r.units()[0].status, 'sold'); assert.ok(/marked sold by Dara/.test(r.texts(NICK).pop()) && /1 client/.test(r.texts(NICK).pop()));
    assert.ok(r.texts(CLIENT).some((x) => /Time Square 5/.test(x) && /no longer available|成約済み/.test(x)));
  });
  await t('Price changed: the agent types a price, Nick approves, the old price stays until then', async () => {
    const r = rig(); await submitted(r); await r.cb(NICK, 'ua:TS5-6001');
    await r.cb(A, 'ac:TS5-6001:p'); await r.say(A, 'lower'); assert.ok(/as a number/.test(r.last(A).body.text));
    await r.say(A, '79000'); assert.strictEqual(r.units()[0].price, 82000);
    const card = r.last(NICK); assert.ok(/\$82,000 to \$79,000 \(-4%\)/.test(card.body.text)); assert.deepStrictEqual(r.labels(card), ['Approve', 'Reject']);
    await r.cb(NICK, 'pa:TS5-6001'); assert.strictEqual(r.units()[0].price, 79000); assert.ok(/price is now \$79,000/.test(r.texts(A).pop()));
    await r.cb(A, 'ac:TS5-6001:p'); await r.say(A, '50000'); assert.ok(/More than 15 percent/.test(r.last(NICK).body.text));
    await r.cb(NICK, 'pr:TS5-6001'); assert.strictEqual(r.units()[0].price, 79000);
  });
  await t('an agent can only act on their own units', async () => {
    const r = rig(); await submitted(r); await r.cb(NICK, 'ua:TS5-6001'); await r.say(NICK, '/addagent ' + B + ' Other');
    await r.cb(B, 'ac:TS5-6001:s'); await r.cb(B, 'am:TS5-6001'); await r.cb(B, 'ac:TS5-6001:p');
    assert.strictEqual(r.units()[0].status, 'active'); await r.say(B, '/myunits'); assert.ok(!/TS5-6001/.test(r.last(B).body.text), 'agent B must not see agent A\'s unit');
  });
  await t('Cancel stops the wizard, and /units lists everything for Nick', async () => {
    const r = rig(); await r.say(NICK, '/addagent 700001 Dara'); await r.say(A, '/addunit'); await r.say(A, 'Time Square 5'); await r.cb(A, 'aw:cancel');
    assert.ok(/Cancelled/.test(r.texts(A).pop())); await r.say(A, '82000'); assert.ok(!/step/.test(r.texts(A).pop()), 'typing after cancel starts nothing');
    await submitted(r); await r.say(NICK, '/units'); assert.ok(/TS5-6001 Time Square 5 \$82,000 · pending · Dara/.test(r.texts(NICK).pop()));
  });
  console.log(`\nRESULTS: ${passed} / ${total} TESTS PASSED (${Math.round(passed / total * 100)}%)`);
  process.exit(passed === total ? 0 : 1);
})();
