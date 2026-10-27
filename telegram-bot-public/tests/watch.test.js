// Nick posts once in @NickREAKH; the bot sees it and offers the Japanese version for @Nick_Cambodia. Also the reading rules
// settled with Nick on 2026-10-27 (project name, urgent, payment plan, Floor G, sqm with tsubo, sqft). Fake Telegram, no network.
const assert = require('assert');
const { createBot } = require('../bot.js');
const { parsePost } = require('../engines/postparse.js');
const { buildJP } = require('../engines/jpline.js');
const { composeEN } = require('../engines/compose.js');
const flow = require('../config/flow.json');
let passed = 0, total = 0;
async function t(name, fn) { total++; try { await fn(); passed++; console.log(`  ✅ Test ${total}: ${name}`); } catch (e) { console.log(`  ❌ Test ${total}: ${name}\n     ${e.message}`); } }

const NICK = 353195979, T0 = Date.parse('2026-10-27T05:00:00Z');
const places = { places: [{ name: 'Time Square 8', khan: 'Toul Kork', sangkat: 'Toul Kork', area: 'Toul Kork' }] };
const CHANNELS = [{ chat: '@Nick_Cambodia', mode: 'confirm', lang: 'jp', phone: '096 96 61 555' },
  { chat: '@NickREAKH', mode: 'confirm', lang: 'en', watch: true, footer: '📞 096 96 61 555', buttons: [{ text: 'Telegram', url: 'https://t.me/Nick_REAKH' }] }];
// Nick's own @NickREAKH template (from his channel, 2026-10-27)
const OWN = '#ForSale $45,000 (Urgent)\n\nM Residence | Studio\n\n📍 BKK1, Phnom Penh\n▫️ Floor: 11\n▫️ Net Size : 29 sqm\n\n――――――――――\n📞 096 96 61 555\n🏠 t.me/NickREAKH\n📱 t.me/Nick_REAKH';
const REAKH = { id: -1001234, type: 'channel', username: 'NickREAKH' };

function rig() {
  const sent = [], db = {}; let time = T0; const timers = [];
  const api = async (method, body) => { sent.push({ method, body }); return { ok: true, result: { message_id: sent.length + 100 } }; };
  const store = { get: (k) => db[String(k)], set: (k, v) => { db[String(k)] = JSON.parse(JSON.stringify(v)); }, delete: (k) => { delete db[String(k)]; }, all: () => Object.keys(db).map((k) => db[k]) };
  const ag = {}, un = {}; let seq = 0;
  const agentData = { getAgent: (k) => ag[String(k)], setAgent: (k, v) => { ag[String(k)] = v; }, deleteAgent: (k) => { delete ag[String(k)]; }, allAgents: () => Object.keys(ag).map((k) => ag[k]),
    getUnit: (k) => (un[k] ? JSON.parse(JSON.stringify(un[k])) : undefined), setUnit: (k, v) => { un[k] = JSON.parse(JSON.stringify(v)); }, allUnits: () => Object.keys(un).map((k) => un[k]), nextSeq: () => ++seq };
  const bot = createBot({ api, store, flow, nickId: String(NICK), agentData, channels: CHANNELS, places, getListings: async () => [], now: () => time, later: (fn, ms) => timers.push({ fn, at: time + ms }) });
  const post = (chat, extra, id) => bot.handleUpdate({ update_id: 9, channel_post: Object.assign({ message_id: id || 501, chat, date: 0 }, extra) });
  const say = (id, text) => bot.handleUpdate({ update_id: 1, message: { message_id: 2, chat: { id, type: 'private' }, from: { id, first_name: 'Nick', language_code: 'en' }, text } });
  const cb = (id, data) => bot.handleUpdate({ update_id: 2, callback_query: { id: 'c', from: { id, first_name: 'N', language_code: 'en' }, data, message: { message_id: 5, chat: { id, type: 'private' } } } });
  const to = (id) => sent.filter((s) => String(s.body.chat_id) === String(id));
  const texts = (id) => to(id).map((s) => s.body.text || s.body.caption || '');
  const data = (id, re) => { const b = to(id).flatMap((s) => (s.body.reply_markup ? s.body.reply_markup.inline_keyboard.flat() : [])).filter((x) => re.test(x.text)).pop(); return b && b.callback_data; };
  const runTimers = async (ms) => { time += ms; for (const x of timers.splice(0)) if (x.at <= time) await x.fn(); else timers.push(x); await new Promise((r) => setTimeout(r, 0)); };
  return { sent, bot, post, say, cb, to, texts, data, runTimers, units: () => agentData.allUnits() };
}

(async () => {
  console.log('\nWatching @NickREAKH, and the reading rules\n');

  await t('Nick posts an album in @NickREAKH: after a short pause he gets one card with the unit and Prepare it', async () => {
    const r = rig(); await r.say(NICK, '/addagent ' + NICK + ' Nick');
    await r.post(REAKH, { photo: [{ file_id: 's1' }, { file_id: 'P1' }], media_group_id: 'g1', caption: OWN }, 501);
    await r.post(REAKH, { photo: [{ file_id: 's2' }, { file_id: 'P2' }], media_group_id: 'g1' }, 502);
    assert.ok(!r.texts(NICK).some((x) => /New listing/.test(x)), 'nothing yet while the album is still arriving');
    await r.runTimers(7000);
    const card = r.texts(NICK).find((x) => /New listing in @NickREAKH/.test(x));
    assert.ok(card && /M Residence · \$45,000 \(Urgent\)/.test(card) && /2 photos/.test(card), card);
    assert.strictEqual(r.data(NICK, /Prepare it/), 'wp:501');
  });

  await t('Prepare it runs the usual flow; approving offers @Nick_Cambodia only, and the Japanese post follows the rules', async () => {
    const r = rig(); await r.say(NICK, '/addagent ' + NICK + ' Nick');
    await r.post(REAKH, { photo: [{ file_id: 'P1' }], media_group_id: 'g1', caption: OWN }, 501);
    await r.post(REAKH, { photo: [{ file_id: 'P2' }], media_group_id: 'g1' }, 502);
    await r.bot.flushWatch();
    await r.cb(NICK, 'wp:501');
    assert.ok(r.texts(NICK).some((x) => /I read your post\. Found: M Residence, sale \$45,000, size/.test(x)), r.texts(NICK).join(' | '));
    await r.cb(NICK, 'aw:submit');
    const u = r.units()[0];
    assert.ok(u && u.source === 'NickREAKH' && u.urgent === true && u.media.length === 2 && u.net === 29 && u.floor === '11', JSON.stringify(u));
    await r.cb(NICK, 'ua:' + u.ref);
    assert.ok(!r.data(NICK, /NickREAKH/), 'never offered back to @NickREAKH');
    const also = r.data(NICK, /Nick_Cambodia/); assert.ok(also, 'one tap for @Nick_Cambodia');
    await r.cb(NICK, also);
    const jp = r.to('@Nick_Cambodia').find((x) => x.method === 'sendMessage' && x.body.reply_markup).body.text;
    assert.ok(/\$45,000（早期売却希望）/.test(jp) && /29㎡（専有・約8\.8坪）/.test(jp) && /11階/.test(jp) && !/緊急|Urgent/.test(jp), jp);
    assert.strictEqual(r.to('@NickREAKH').length, 0, 'nothing posted to @NickREAKH');
  });

  await t('a post that is not a listing (no price) is ignored; so are the bot\'s own posts and other channels', async () => {
    const r = rig();
    await r.post(REAKH, { text: 'Why net size matters when you compare condos. A short guide for this week.' }, 601);
    await r.post(REAKH, { text: OWN, reply_markup: { inline_keyboard: [[{ text: 'Telegram', url: 'https://t.me/Nick_REAKH' }]] } }, 602);
    await r.post({ id: -1009, type: 'channel', username: 'SomeoneElse' }, { text: OWN }, 603);
    await r.bot.flushWatch();
    assert.ok(!r.texts(NICK).some((x) => /New listing/.test(x)), r.texts(NICK).join(' | '));
  });

  await t('Not this one drops it; only Nick can use the card', async () => {
    const r = rig(); await r.post(REAKH, { text: OWN }, 701); await r.bot.flushWatch();
    await r.cb(555, 'wp:701'); assert.strictEqual(r.units().length, 0);
    await r.cb(NICK, 'wx:701'); assert.ok(/OK, not this one/.test(r.texts(NICK).pop()));
    await r.cb(NICK, 'wp:701'); assert.ok(/no longer waiting/.test(r.texts(NICK).pop()));
  });

  await t('the channel button says what it opens (似た物件を探す), and /hide takes a duplicate out without a banner', async () => {
    const r = rig(); await r.say(NICK, '/addagent ' + NICK + ' Nick');
    await r.post(REAKH, { photo: [{ file_id: 'P1' }], caption: OWN }, 801); await r.bot.flushWatch();
    await r.cb(NICK, 'wp:801'); await r.cb(NICK, 'aw:submit'); const u = r.units()[0]; await r.cb(NICK, 'ua:' + u.ref); await r.cb(NICK, r.data(NICK, /Nick_Cambodia/));
    const btns = r.to('@Nick_Cambodia').find((x) => x.body.reply_markup).body.reply_markup.inline_keyboard.flat().map((b) => b.text);
    assert.ok(btns.includes('似た物件を探す') && !btns.some((b) => /写真/.test(b)), btns.join(','));
    const url = r.to('@Nick_Cambodia').find((x) => x.body.reply_markup).body.reply_markup.inline_keyboard.flat().find((b) => b.text === '似た物件を探す').url;
    assert.ok(new RegExp('start=sim_' + u.ref + '$').test(url), url);
    const before = r.sent.length; await r.say(NICK, '/hide ' + u.ref.toLowerCase());
    assert.strictEqual(r.units()[0].status, 'hidden'); assert.ok(/is hidden/.test(r.texts(NICK).pop()));
    assert.ok(!r.sent.slice(before).some((x) => /^edit/.test(x.method)), 'no banner edit on the channel posts');
    await r.say(555, '/hide ' + u.ref); assert.strictEqual(r.units()[0].status, 'hidden', 'only Nick can hide');
  });

  await t('似た物件を探す opens the unit and up to 3 similar ones, without sending the photos again', async () => {
    const sent = [], db = {};
    const api = async (method, body) => { sent.push({ method, body }); return { ok: true, result: { message_id: sent.length } }; };
    const store = { get: (k) => db[String(k)], set: (k, v) => { db[String(k)] = JSON.parse(JSON.stringify(v)); }, delete: (k) => { delete db[String(k)]; } };
    const L = (id, price, district, media) => ({ id, name: 'Unit ' + id, type: 'buy', price, net: 30, beds: 1, district, area: district, media: media || [] });
    const listings = [L('A1', 100000, 'BKK1', [{ t: 'photo', id: 'X' }]), L('A2', 95000, 'BKK1', [{ t: 'photo', id: 'Y' }]), L('A3', 110000, 'Toul Kork'), L('A4', 300000, 'BKK1'), L('A5', 120000, 'BKK1')];
    const bot = createBot({ api, store, flow, nickId: String(NICK), getListings: async () => listings });
    await bot.handleUpdate({ update_id: 1, message: { message_id: 1, chat: { id: 42, type: 'private' }, from: { id: 42, first_name: 'K', language_code: 'ja' }, text: '/start sim_A1' } });
    assert.ok(!sent.some((x) => /sendMediaGroup|sendPhoto|sendVideo/.test(x.method)), 'no photos again');
    const m = sent.filter((x) => x.method === 'sendMessage').pop().body;
    assert.ok(/この物件と、似た条件の物件/.test(m.text) && /A1/.test(m.text) && /A2/.test(m.text) && /A5/.test(m.text) && /A3/.test(m.text) && !/A4/.test(m.text), m.text);
    assert.ok(m.text.indexOf('A2') < m.text.indexOf('A3'), 'the same area comes first');
    const cbs = m.reply_markup.inline_keyboard.flat().map((b) => b.callback_data);
    assert.ok(cbs.includes('q:A1') && cbs.includes('q:A2') && !cbs.includes('ph:A1') && cbs.includes('ph:A2') && cbs.includes('m:menu'), cbs.join(','));
    assert.strictEqual(db['42'].int.from, 'channel post A1');
    sent.length = 0;
    await bot.handleUpdate({ update_id: 2, message: { message_id: 2, chat: { id: 43, type: 'private' }, from: { id: 43, first_name: 'E', language_code: 'en' }, text: '/start sim_A4' } });
    await bot.handleUpdate({ update_id: 3, callback_query: { id: 'c', from: { id: 43, first_name: 'E', language_code: 'en' }, data: 'l:en', message: { message_id: 5, chat: { id: 43, type: 'private' } } } });
    const e = sent.filter((x) => x.method === 'sendMessage').pop().body.text;
    assert.ok(/This unit and similar ones/.test(e) && /No similar units right now/.test(e), e);
  });

  // ---- the reading rules (Nick, 2026-10-27), on posts in the formats the Content Bot learned from real agents
  const p = (text) => parsePost(text, places);
  await t('project name from "Project:" and from a title with emoji or sale words, written clean', async () => {
    assert.strictEqual(p(['🔥 Time Square 8 🔥 Resale', 'Property Details', 'Bedroom: 2', 'Floor: 18th', 'Size: 78 sqm', 'Selling price: $99,000'].join('\n')).name, 'Time Square 8');
    assert.strictEqual(p(['Urgent Sale – Time Square 8 | 2-Bedroom Resale Unit', 'Project: Time Square 8', 'Floor: 32', 'Selling Price: $99,000'].join('\n')).name, 'Time Square 8');
    assert.strictEqual(p('Cozy studio for sale\nProject: Odom Living\nFloor: 3\nSize: 30 sqm\nPrice: $60,000').name, 'Odom Living');
  });

  await t('urgent: JP （早期売却希望）, EN (Urgent); never 緊急 or "best value"', async () => {
    assert.strictEqual(p('Urgent Sale – Time Square 8\nSelling Price: $99,000').urgent, true);
    assert.strictEqual(p('Time Square 8\nSelling Price: $99,000').urgent, false);
    assert.ok(/^#売出中 \$45,000（早期売却希望）/.test(buildJP(OWN, [], { price: 45000 }).text));
    const en = composeEN({ name: 'Time Square 8', type: 'buy', price: 99000, urgent: true, features: [] }, { footer: '' }).text;
    assert.ok(/^#ForSale \$99,000 \(Urgent\)/.test(en), en);
  });

  await t('payment plan: read only when a sale post states amounts, a rental never has one', async () => {
    const pay = p(['Time Square 8 | 2BR', 'Selling Price: $99,000', 'Monthly Payment: $678 from November 2026 to March 2029', 'Handover Payment: $50,888', 'Down payment 30%'].join('\n')).payment;
    assert.deepStrictEqual(pay, [{ k: 'monthly', value: '$678 from November 2026 to March 2029' }, { k: 'handover', value: '$50,888' }, { k: 'down', value: '30%' }]);
    assert.deepStrictEqual(p('Studio for rent\nRent: $550/month\nMonthly: $550').payment, []);
    assert.deepStrictEqual(p('Studio for sale\nHandover: Early 2027\nPrice: $60,000').payment, [], 'a handover date is not a payment');
    const jp = buildJP('TIME SQUARE 8 | 2BR\n\nPayment Plan\n✅ Monthly Payment: $678 from November 2026 to March 2029\n✅ Handover Payment: $50,888\n✅ Down payment: 30%', [], { bullet: '▫️' }).text;
    assert.ok(/<b>支払い条件<\/b>/.test(jp) && /▫️ 月々：\$678（2026年11月から2029年3月まで）/.test(jp) && /▫️ 引き渡し時：\$50,888/.test(jp) && /▫️ 頭金：30%/.test(jp), jp);
    const en = composeEN({ name: 'Time Square 8', type: 'buy', price: 99000, payment: pay, features: [] }, { footer: '' }).text;
    assert.ok(/PAYMENT PLAN|𝗣𝗔𝗬𝗠𝗘𝗡𝗧 𝗣𝗟𝗔𝗡/.test(en) && /✅ Monthly Payment: \$678 from November 2026 to March 2029/.test(en) && /✅ Handover Payment: \$50,888/.test(en), en);
  });

  await t('Floor G is 1階（地上階） in Japanese and Ground Floor in English; other floors keep the building number', async () => {
    assert.strictEqual(p('SKY VILLA | STUDIO\n#ForRent $650/month\n✅ Floor G\n✅ 38 sqm').floor, 'G');
    assert.strictEqual(p('Ground floor shop unit\n#ForRent $900/month').floor, 'G');
    assert.ok(/▫️ 1階（地上階）/.test(buildJP('X | STUDIO\n✅ Floor G', [], { bullet: '▫️' }).text));
    assert.ok(/▫️ 11階/.test(buildJP('X | STUDIO\n✅ 11th Floor', [], { bullet: '▫️' }).text));
    const { linesToTranslate } = require('../engines/jpline.js');
    assert.ok(/▫️ G10-09号室 \| 9階/.test(buildJP('X | 1BR\n✅ Unit G10-09 | 9th Floor', [], { bullet: '▫️' }).text));
    assert.deepStrictEqual(linesToTranslate('X | 1BR\n✅ Unit G10-09 | 9th Floor', [], {}), [], 'a unit number never goes to Google');
    assert.ok(/✅ Ground Floor/.test(composeEN({ name: 'Sky Villa', type: 'rent', price: 650, floor: 'G', features: [] }, { footer: '' }).text));
  });

  await t('sizes: Japanese shows ㎡ with 坪; a post in sqft becomes sqm; sqft is never shown', async () => {
    assert.strictEqual(p('#ForSale $50,000\nSKY | 1BR UNIT\n✅ 900 sqft\n✅ 1 Bedroom').plain, 83.6);
    const jp = buildJP('SKY | 1BR\n✅ 900 sqft\n✅ 47㎡ Gross | 38㎡ Net\n✅ 57㎡', [], { bullet: '▫️', gross: 57 }).text;
    assert.ok(/▫️ 83\.6㎡（約25\.3坪）/.test(jp) && /38㎡（専有・約11\.5坪） \| 47㎡（総面積）(?!・)/.test(jp) && /57㎡（総面積・約17\.2坪）/.test(jp) && !/sqft/.test(jp), jp);
  });

  await t('the Content Bot\'s real agent formats still read right (price, sale or rent, bedrooms, floor, size)', async () => {
    const cases = [
      [['🔥 Time Square 8 🔥 Resale', 'Property Details', 'Bedroom: 2', 'Floor: 18th', 'Size: 78 sqm', 'Furnished: Fully furnished', 'View: City view', 'Selling price: $99,000', 'Payment Plan', 'Monthly Payment: $550', 'Down payment 30%', '📞 012 345 678'].join('\n'), { type: 'buy', price: 99000, beds: 2, floor: '18', plain: 78 }],
      ['Studio for sale\nFloor: 3\nSize: 30 sqm\nPrice: $60,000\nMonthly Payment: $400', { type: 'buy', price: 60000, floor: '3', plain: 30 }],
      ['Studio for rent\nFloor: 3\nSize: 30 sqm\nRent: $550/month', { type: 'rent', price: 550, floor: '3', plain: 30 }],
      ['#ForRent $650/month\n\nSKY VILLA | STUDIO\n📍 Tonle Bassac, Phnom Penh\n\nUNIT DETAILS\n✅ Studio | 1 Bath\n✅ Floor G\n✅ 38 sqm\n✅ Fully Furnished\n💧 Water $0.5 per m3', { type: 'rent', price: 650, floor: 'G', plain: 38, beds: 0 }],
      ['#ForSale $35,000\n\nRESIDENCE L | 1BR UNIT\n📍 BKK1, Phnom Penh\n\nUNIT DETAILS\n✅ Unit G10-09 | 9th Floor\n✅ 1 Bedroom | 1 Bathroom\n✅ 47㎡ Gross | 38㎡ Net\n✅ Strata Title', { type: 'buy', price: 35000, beds: 1, floor: '9', net: 38, gross: 47 }],
      ['#ForSale $98,000 → $94,000\n\nTIME SQUARE 5 | 1BR UNIT\n📍 BKK1, Phnom Penh\n✅ 15th Floor\n✅ 32 sqm Net | 41 sqm Gross', { type: 'buy', price: 94000, priceFrom: 98000, floor: '15', net: 32, gross: 41 }],
      [OWN, { type: 'buy', price: 45000, floor: '11', net: 29, beds: 0, name: 'M Residence', urgent: true }],
    ];
    for (const [text, want] of cases) { const got = p(text); for (const k of Object.keys(want)) assert.deepStrictEqual(got[k], want[k], k + ' in: ' + text.split('\n')[0]); }
  });

  console.log(`\nRESULTS: ${passed} / ${total} TESTS PASSED (${Math.round((passed / total) * 100)}%)`);
  process.exit(passed === total ? 0 : 1);
})();
