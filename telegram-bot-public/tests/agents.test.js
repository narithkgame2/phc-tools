// Phase 2: the agent area. Role check, send-the-post intake, Nick's approval, channels, weekly check, sold, price change.
const assert = require('assert');
const { createBot } = require('../bot.js');
const flow = require('../config/flow.json');
let passed = 0, total = 0;
async function t(name, fn) { total++; try { await fn(); passed++; console.log(`  ✅ Test ${total}: ${name}`); } catch (e) { console.log(`  ❌ Test ${total}: ${name}\n     ${e.message}`); } }

const NICK = 353195979, A = 700001, B = 700002, CLIENT = 555;
const T0 = Date.parse('2026-10-26T03:00:00Z'); // 10:00 in Phnom Penh
const places = { places: [
  { name: 'Time Square 5 (306) - BKK1', khan: 'Boeng Keng Kang', sangkat: 'Boeung Keng Kang 1 (BKK1)', area: 'BKK1' },
  { name: 'Agile Sky Residence', khan: 'Boeng Keng Kang', sangkat: 'Boeung Keng Kang 3 (BKK3)', area: 'Others' }] };
const CHANNELS = [{ chat: '@Nick_Cambodia', mode: 'auto', lang: 'jp' }, { chat: '@NickREAKH', mode: 'confirm', lang: 'en' }];
const POST = 'Time Square 5, 1 bedroom corner unit. 32 sqm net / 41 sqm gross. Floor 15. Selling price $82,000. BKK1';

function rig(opts) {
  opts = opts || {};
  const sent = [], db = {}; let time = T0;
  const api = async (method, body) => { sent.push({ method, body }); return (opts.reply && opts.reply(method, body)) || { ok: true, result: { message_id: sent.length + 100 } }; };
  const store = { get: (k) => db[String(k)], set: (k, v) => { db[String(k)] = JSON.parse(JSON.stringify(v)); }, delete: (k) => { delete db[String(k)]; }, all: () => Object.keys(db).map((k) => db[k]) };
  const ag = {}, un = {}; let seq = 0;
  const agentData = { getAgent: (k) => ag[String(k)], setAgent: (k, v) => { ag[String(k)] = JSON.parse(JSON.stringify(v)); }, deleteAgent: (k) => { delete ag[String(k)]; }, allAgents: () => Object.keys(ag).map((k) => ag[k]),
    getUnit: (k) => (un[k] ? JSON.parse(JSON.stringify(un[k])) : undefined), setUnit: (k, v) => { un[k] = JSON.parse(JSON.stringify(v)); }, allUnits: () => Object.keys(un).map((k) => JSON.parse(JSON.stringify(un[k]))), nextSeq: () => ++seq };
  const bot = createBot({ api, store, flow, nickId: String(NICK), agentData, channels: CHANNELS, places, getListings: async () => [], now: () => time });
  const user = (id, lang, username) => ({ id, first_name: 'U' + id, language_code: lang || 'en', username });
  const msg = (id, extra, username) => bot.handleUpdate({ update_id: 1, message: Object.assign({ message_id: 2, chat: { id, type: 'private' }, from: user(id, 'en', username) }, extra) });
  const say = (id, text, username) => msg(id, { text }, username);
  const photo = (id, fileId, group, caption) => msg(id, { photo: [{ file_id: 's_' + fileId }, { file_id: fileId }], media_group_id: group, caption });
  const video = (id, fileId) => msg(id, { video: { file_id: fileId } });
  const cb = (id, data, lang) => bot.handleUpdate({ update_id: 2, callback_query: { id: 'c', from: user(id, lang), data, message: { message_id: 5, chat: { id, type: 'private' } } } });
  const to = (id) => sent.filter((s) => String(s.body.chat_id) === String(id));
  const texts = (id) => to(id).map((s) => s.body.text || s.body.caption || '').filter(Boolean);
  const labels = (m) => (m.body.reply_markup ? m.body.reply_markup.inline_keyboard.flat().map((b) => b.text) : []);
  const last = (id) => to(id).filter((s) => s.method === 'sendMessage').pop();
  return { sent, bot, agentData, say, photo, video, cb, to, texts, labels, last, user, setTime: (ms) => { time = ms; }, advanceDays: (d) => { time += d * 86400000; }, advanceHours: (h) => { time += h * 3600000; }, units: () => agentData.allUnits() };
}

// the agent sends the post (two photos with the description, plus a video), taps Done and Submit: TS5-6001 is pending
async function submitted(r, agent) {
  agent = agent || A;
  await r.say(NICK, '/addagent ' + agent + ' Dara');
  await r.photo(agent, 'F1', 'g1', POST); await r.photo(agent, 'F2', 'g1'); await r.video(agent, 'V1');
  await r.cb(agent, 'aw:collectdone'); await r.cb(agent, 'aw:submit');
}

(async () => {
  await t('role check: a normal client sees the usual unknown-command screen and nothing opens', async () => {
    const r = rig(); const from = { id: CLIENT, first_name: 'C', language_code: 'ja' };
    for (const text of ['/myunits', '/addagent 555 Me', '/addunit']) await r.bot.handleUpdate({ update_id: 1, message: { message_id: 2, chat: { id: CLIENT, type: 'private' }, from, text } });
    assert.ok(r.texts(CLIENT).every((x) => /ご利用いただけません/.test(x)), r.texts(CLIENT).join('|'));
    assert.strictEqual(r.agentData.allAgents().length, 0, 'a client must not be able to add himself');
    await r.photo(CLIENT, 'X1', 'g', POST); assert.ok(!r.texts(CLIENT).some((x) => /Received/.test(x)), 'a client sending a post is not an agent');
    await r.cb(CLIENT, 'aw:start'); assert.ok(!r.texts(CLIENT).some((x) => /Add a unit/.test(x)));
  });
  await t('Nick sending a post from his admin account is told how to become an agent, and then it works', async () => {
    const r = rig();
    await r.photo(NICK, 'F1', 'g1', POST); assert.ok(/You are the admin/.test(r.last(NICK).body.text) && new RegExp('/addagent ' + NICK + ' Nick').test(r.last(NICK).body.text));
    await r.say(NICK, '/addagent ' + NICK + ' Nick'); await r.photo(NICK, 'F2', 'g2', POST);
    assert.ok(/Received: 1 photo and the description/.test(r.last(NICK).body.text), 'the admin can now send posts like an agent');
  });
  await t('Nick adds agents by id or by @username (once they have opened the bot), lists and removes them', async () => {
    const r = rig();
    await r.say(NICK, '/addagent abc'); assert.ok(/Send: \/addagent/.test(r.texts(NICK).pop()));
    await r.say(NICK, '/addagent @Monika_PHC Monika'); assert.ok(/have not met @Monika_PHC/.test(r.texts(NICK).pop()));
    await r.say(900001, '/start', 'Monika_PHC');
    await r.say(NICK, '/addagent @Monika_PHC Monika'); assert.ok(/Agent added: Monika \(900001\)/.test(r.texts(NICK).pop()));
    await r.say(NICK, '/addagent 700001 Dara Sok'); await r.say(NICK, '/agents'); assert.ok(/Monika \(900001\)/.test(r.texts(NICK).pop()) && /Dara Sok \(700001\)/.test(r.texts(NICK).pop()));
    await r.say(NICK, '/removeagent 700001'); await r.say(NICK, '/agents'); assert.ok(!/Dara Sok/.test(r.texts(NICK).pop()));
  });
  await t('send the post: an album is acknowledged once, the bot reads it and asks nothing when everything is there', async () => {
    const r = rig(); await r.say(NICK, '/addagent 700001 Dara');
    await r.photo(A, 'F1', 'g1', POST); await r.photo(A, 'F2', 'g1'); await r.video(A, 'V1');
    const got = r.sent.filter((x) => x.method === 'sendMessage' && x.body.chat_id === A && /Received/.test(x.body.text)).map((x) => x.body.text); assert.strictEqual(got.length, 2, 'one summary for the album, one for the video: ' + got.join('|'));
    const edits = r.sent.filter((x) => x.method === 'editMessageText' && x.body.chat_id === A); assert.ok(edits.length === 1 && /Received: 2 photos and the description/.test(edits[0].body.text), 'the album summary is updated, not left stale');
    assert.ok(/Received: 1 photo and 1 video and the description|Received: 2 photos and 1 video and the description/.test(r.texts(A).filter((x) => /Received/.test(x)).pop()));
    await r.cb(A, 'aw:collectdone');
    const read = r.texts(A).find((x) => /I read your post/.test(x)); assert.ok(/Time Square 5/.test(read) && /sale \$82,000/.test(read), read);
    const confirm = r.last(A); assert.ok(/Check your unit/.test(confirm.body.text) && /32 sqm net \/ 41 sqm gross/.test(confirm.body.text) && /floor 15/.test(confirm.body.text) && /1 bedroom/.test(confirm.body.text) && /Area: BKK1/.test(confirm.body.text) && /2 photos and 1 video/.test(confirm.body.text));
    assert.deepStrictEqual(r.labels(confirm), ['Submit', 'Cancel']);
  });
  await t('a post with details missing: the bot asks only those questions, in order', async () => {
    const r = rig(); await r.say(NICK, '/addagent 700001 Dara');
    await r.photo(A, 'F1', 'g1', 'Time Square 5 for sale $82,000'); await r.cb(A, 'aw:collectdone');
    assert.ok(/Net size/.test(r.last(A).body.text)); await r.say(A, '-'); assert.ok(/Gross size/.test(r.last(A).body.text));
    await r.say(A, '-'); assert.ok(/at least one size/.test(r.last(A).body.text)); await r.say(A, '41');
    assert.ok(/bedrooms/.test(r.last(A).body.text)); await r.cb(A, 'aw:beds:1'); assert.ok(/Which floor/.test(r.last(A).body.text));
    await r.say(A, 'abc'.replace('abc', '15')); assert.ok(/Check your unit/.test(r.last(A).body.text), 'area came from the map, media was sent: nothing else to ask');
    assert.ok(!r.texts(A).some((x) => /Which project|for sale or for rent|Selling price/.test(x)), 'it must not ask what the post already said');
  });
  await t('an unlabelled size is clarified as net or gross, and an agent with no photo is asked for one', async () => {
    const r = rig(); await r.say(NICK, '/addagent 700001 Dara');
    await r.say(A, 'Time Square 5, 1 bedroom, 56 sqm, floor 15, selling price $82,000 in BKK1 near the river'); await r.cb(A, 'aw:collectdone');
    assert.ok(/says 56 sqm\. Is that the net size/.test(r.last(A).body.text)); assert.deepStrictEqual(r.labels(r.last(A)), ['Net', 'Gross', 'Not sure', 'Cancel']);
    await r.cb(A, 'aw:plain:net'); assert.ok(/no photos yet/.test(r.last(A).body.text));
    await r.photo(A, 'F1', 'g9'); await r.cb(A, 'aw:media:done'); assert.ok(/56 sqm net/.test(r.last(A).body.text));
  });
  await t('a post with both a sale price and a rent price lets the agent choose, including both as two listings', async () => {
    const r = rig(); await r.say(NICK, '/addagent 700001 Dara');
    await r.photo(A, 'F1', 'g1', 'Agile Sky Residence 2BR 72 sqm (Gross size) floor 17 #ForSale $125,000 #ForRent $1,200/month'); await r.cb(A, 'aw:collectdone');
    const q = r.last(A); assert.ok(/sale price and a rent price/.test(q.body.text)); assert.deepStrictEqual(r.labels(q), ['For sale $125,000', 'For rent $1,200', 'Both, as two listings', 'Cancel']);
    await r.cb(A, 'aw:type:both'); await r.cb(A, 'aw:area:Others').catch(() => {}); await r.cb(A, 'aw:submit');
    const refs = r.units().map((u) => u.ref + ':' + u.type + ':' + u.price).sort(); assert.deepStrictEqual(refs, ['ASR-6001:buy:125000', 'ASR-6002:rent:1200'], refs.join(','));
    assert.strictEqual(r.to(NICK).filter((s) => /New unit to approve/.test(s.body.text || '')).length, 2, 'Nick approves each listing separately');
  });
  await t('step by step still works for an agent who prefers it, and a normal chat message is not hijacked', async () => {
    const r = rig(); await r.say(NICK, '/addagent 700001 Dara');
    await r.say(A, 'hello'); assert.ok(/did not catch/.test(r.texts(A).pop()) && !r.texts(A).some((x) => /Received/.test(x)), 'small talk gets the normal reply, not an intake');
    await r.say(A, '/addunit'); assert.ok(/Send me the post/.test(r.last(A).body.text)); await r.cb(A, 'aw:steps'); assert.ok(/Which project/.test(r.last(A).body.text));
    await r.say(A, 'Time Square 5'); await r.cb(A, 'aw:type:buy'); await r.say(A, 'cheap'); assert.ok(/as a number/.test(r.last(A).body.text));
    await r.say(A, '82,000'); await r.say(A, '32'); assert.ok(/bedrooms/.test(r.last(A).body.text), 'with a net size given the gross size is not demanded'); await r.cb(A, 'aw:beds:1'); await r.say(A, '15');
    assert.ok(/Which area/.test(r.last(A).body.text) && r.labels(r.last(A)).includes('Use BKK1 (from the map)')); await r.cb(A, 'aw:area:BKK1');
    assert.ok(/no photos yet/.test(r.last(A).body.text)); await r.photo(A, 'F1', 'g1'); await r.cb(A, 'aw:media:done'); await r.cb(A, 'aw:submit');
    assert.strictEqual(r.units()[0].ref, 'TS5-6001');
  });
  await t('a post about another city is refused politely and nothing is kept', async () => {
    const r = rig(); await r.say(NICK, '/addagent 700001 Dara');
    await r.photo(A, 'F1', 'g1', 'Condo in Sihanoukville beachfront, 1 bedroom, selling price $65,000'); await r.cb(A, 'aw:collectdone');
    assert.ok(/Phnom Penh units only/.test(r.last(A).body.text)); assert.strictEqual(r.units().length, 0);
  });
  await t('a submission reaches Nick with the photos and the video and Approve / Reject; nothing shows to clients yet', async () => {
    const r = rig(); await submitted(r);
    const card = r.last(NICK); assert.ok(/New unit to approve/.test(card.body.text) && /TS5-6001/.test(card.body.text) && /32 sqm net \/ 41 sqm gross/.test(card.body.text) && /2 photos and 1 video/.test(card.body.text));
    assert.deepStrictEqual(r.labels(card), ['Approve', 'Reject']);
    const album = r.to(NICK).find((s) => s.method === 'sendMediaGroup'); assert.deepStrictEqual(album.body.media.map((x) => x.type), ['photo', 'photo', 'video']);
    assert.ok(/Submitted as .*TS5-6001/.test(r.texts(A).pop()));
    await r.say(CLIENT, '/buy'); await r.cb(CLIENT, 'g:b1:1'); await r.cb(CLIENT, 'g:b2:2');
    assert.ok(!r.texts(CLIENT).some((x) => /Time Square 5/.test(x)), 'pending units never show to clients');
  });
  await t('only Nick can approve; approving shows the unit to clients, tells the agent and posts to the Japanese channel', async () => {
    const r = rig(); await submitted(r);
    await r.cb(A, 'ua:TS5-6001'); await r.cb(CLIENT, 'ua:TS5-6001'); assert.strictEqual(r.units()[0].status, 'pending', 'an agent or a client cannot approve');
    await r.cb(NICK, 'ua:TS5-6001'); assert.strictEqual(r.units()[0].status, 'active'); assert.ok(/approved and now shows to clients/.test(r.texts(A).pop()));
    const jp = r.to('@Nick_Cambodia').find((s) => s.method === 'sendMediaGroup'); assert.ok(jp, 'posted to the channel'); const cap = jp.body.media[0].caption;
    assert.ok(/新着物件/.test(cap) && /32㎡（専有） \/ 41㎡（総面積）/.test(cap) && /LINEでNickに相談/.test(cap) && !/\+855|phc/i.test(cap), cap);
    const conf = r.last(NICK); assert.ok(/approved and live/.test(conf.body.text) && r.labels(conf).includes('Also post to @NickREAKH'));
    assert.ok(!r.to('@NickREAKH').length, 'the REAKH channel is not posted without Nick\'s tap');
  });
  await t('the one tap posts the English draft to @NickREAKH, and only Nick can tap it', async () => {
    const r = rig(); await submitted(r); await r.cb(NICK, 'ua:TS5-6001');
    await r.cb(A, 'uc:TS5-6001:1'); assert.ok(!r.to('@NickREAKH').length); await r.cb(NICK, 'uc:TS5-6001:1');
    const en = r.to('@NickREAKH').find((s) => s.method === 'sendMediaGroup'); assert.ok(en && /^#ForSale \$82,000/.test(en.body.media[0].caption) && /41㎡ Gross \| 32㎡ Net/.test(en.body.media[0].caption) && /Selling Price: \$82,000/.test(en.body.media[0].caption));
  });
  await t('sold by message: an agent retires their own unit, not another agent\'s; Nick confirms price changes', async () => {
    const r = rig(); await submitted(r); await r.cb(NICK, 'ua:TS5-6001');
    await r.say(CLIENT, 'SOLD TS5-6001'); assert.strictEqual(r.units()[0].status, 'active', 'a client cannot retire a unit');
    await r.say(A, 'TS5-6001 price reduced to $79,000');
    assert.ok(/Sent to Nick/.test(r.texts(A).pop()) && r.units()[0].price === 82000, 'old price stays until approved');
    await r.cb(NICK, 'pa:TS5-6001'); assert.strictEqual(r.units()[0].price, 79000);
    await r.say(NICK, 'TS5-6001 now 75000'); const c = r.last(NICK); assert.ok(/Change this price/.test(c.body.text) && r.labels(c).includes('Confirm'));
    await r.cb(NICK, 'pn:TS5-6001:75000'); assert.strictEqual(r.units()[0].price, 75000);
    await r.say(A, 'sold ts5-6001'); assert.strictEqual(r.units()[0].status, 'sold'); assert.ok(/marked sold/.test(r.texts(A).pop()));
    assert.ok(r.texts(NICK).some((x) => /was marked sold by/.test(x)));
  });
  await t('the website-draft helper sends Nick a #unit caption to forward', async () => {
    const r = rig(); await submitted(r); await r.cb(NICK, 'ua:TS5-6001'); r.sent.length = 0;
    await r.cb(NICK, 'uw:TS5-6001');
    const g = r.to(NICK).find((s) => s.method === 'sendMediaGroup'); assert.ok(g && /^#unit\n#ForSale/.test(g.body.media[0].caption) && g.body.media[0].caption.length <= 1024);
    assert.ok(r.texts(NICK).some((x) => /@PHC_Content_Bot/.test(x)));
  });
  await t('a channel the bot cannot post to is reported to Nick, the unit still goes live', async () => {
    const r = rig({ reply: (m, b) => (b.chat_id === '@Nick_Cambodia' ? { ok: false, description: 'Forbidden: bot is not a member of the channel chat' } : null) });
    await submitted(r); await r.cb(NICK, 'ua:TS5-6001');
    assert.strictEqual(r.units()[0].status, 'active'); assert.ok(/Could not post to @Nick_Cambodia/.test(r.last(NICK).body.text) && /administrator/.test(r.last(NICK).body.text));
  });
  await t('clients see the approved unit with a Photos button that sends the album including the video', async () => {
    const r = rig(); await submitted(r); await r.cb(NICK, 'ua:TS5-6001');
    await r.say(CLIENT, '/buy'); await r.cb(CLIENT, 'g:b1:1'); await r.cb(CLIENT, 'g:b2:2');
    const card = r.to(CLIENT).find((s) => /Time Square 5/.test(s.body.text || '')); assert.ok(card, 'the unit is listed');
    const btns = card.body.reply_markup.inline_keyboard.flat().map((b) => b.callback_data); assert.ok(btns.includes('ph:TS5-6001') && btns.includes('q:TS5-6001'));
    r.sent.length = 0; await r.cb(CLIENT, 'ph:TS5-6001');
    assert.deepStrictEqual(r.to(CLIENT).find((s) => s.method === 'sendMediaGroup').body.media.map((x) => x.type + ':' + x.media), ['photo:F1', 'photo:F2', 'video:V1']);
  });
  await t('reject: the agent is told, the unit never shows', async () => {
    const r = rig(); await submitted(r); await r.cb(NICK, 'ur:TS5-6001');
    assert.strictEqual(r.units()[0].status, 'rejected'); assert.ok(/was not approved/.test(r.texts(A).pop()));
  });
  await t('weekly check: nothing before 7 days or at night; after 7 days the agent is asked; Still available restarts the clock', async () => {
    const r = rig(); await submitted(r); await r.cb(NICK, 'ua:TS5-6001');
    r.advanceDays(6); assert.strictEqual(await r.bot.runAgentChecks(), 0);
    r.setTime(Date.parse('2026-11-02T18:00:00Z')); assert.strictEqual(await r.bot.runAgentChecks(), 0, 'night in Phnom Penh');
    r.setTime(Date.parse('2026-11-02T03:00:00Z')); assert.strictEqual(await r.bot.runAgentChecks(), 1);
    const ask = r.last(A); assert.ok(/Still available\?/.test(ask.body.text)); assert.deepStrictEqual(r.labels(ask), ['Still available', 'Sold', 'Price changed']);
    assert.strictEqual(await r.bot.runAgentChecks(), 0, 'not again the same day');
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
  await t('Cancel stops the intake, and /units lists everything for Nick', async () => {
    const r = rig(); await r.say(NICK, '/addagent 700001 Dara'); await r.say(A, '/addunit'); await r.cb(A, 'aw:cancel');
    assert.ok(/Cancelled/.test(r.texts(A).pop())); await r.say(A, '82000'); assert.ok(!/Received|Which/.test(r.texts(A).pop()), 'typing after cancel starts nothing');
    await submitted(r); await r.say(NICK, '/units'); assert.ok(/TS5-6001 Time Square 5 \$82,000 · pending · Dara/.test(r.texts(NICK).pop()));
  });
  console.log(`\nRESULTS: ${passed} / ${total} TESTS PASSED (${Math.round(passed / total * 100)}%)`);
  process.exit(passed === total ? 0 : 1);
})();
