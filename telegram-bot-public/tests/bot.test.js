// Simulated conversations against a fake Telegram. No network, no token.
const assert = require('assert');
const { createBot } = require('../bot.js');
const flow = require('../config/flow.json');
let passed = 0, total = 0;
async function t(name, fn) { total++; try { await fn(); passed++; console.log(`  ✅ Test ${total}: ${name}`); } catch (e) { console.log(`  ❌ Test ${total}: ${name}\n     ${e.message}`); } }

function rig(opts) {
  const sent = [], db = {};
  const api = async (method, body) => { sent.push({ method, body }); return { ok: true }; };
  const store = { get: (id) => db[String(id)], set: (id, v) => { db[String(id)] = JSON.parse(JSON.stringify(v)); }, delete: (id) => { delete db[String(id)]; } };
  const bot = createBot({ api, store, flow, nickId: '353195979', testerIds: (opts || {}).testers || [] });
  let msgId = 100;
  const U = (id, lang) => ({ id, first_name: 'Kenji', username: 'kenji_t', language_code: lang });
  const say = (from, text, extra) => bot.handleUpdate({ update_id: 1, message: Object.assign({ message_id: ++msgId, chat: { id: from.id, type: 'private' }, from, text }, extra || {}) });
  const lastTo = (chat) => sent.filter((s) => (s.body.chat_id === chat) && (s.method === 'sendMessage' || s.method === 'editMessageText')).pop();
  const firstLabel = (chat) => lastTo(chat).body.reply_markup.inline_keyboard[0][0].text;
  const tap = (from, label) => {
    const m = lastTo(from.id); let data = null;
    m.body.reply_markup.inline_keyboard.forEach((r) => r.forEach((b) => { if (b.text === label) data = b.callback_data; }));
    assert.ok(data, 'button not found: ' + label + ' in ' + JSON.stringify(m.body.reply_markup.inline_keyboard.map((r) => r.map((b) => b.text))));
    return bot.handleUpdate({ update_id: 2, callback_query: { id: 'cb', from, data, message: { message_id: 50, chat: { id: from.id, type: 'private' } } } });
  };
  return { sent, db, bot, U, say, tap, lastTo, firstLabel };
}
const NICK = '353195979';

(async () => {
  await t('a Japanese phone goes straight to the Japanese menu, no language screen', async () => {
    const r = rig(), me = r.U(1, 'ja'); await r.say(me, '/start');
    assert.ok(r.lastTo(1).body.text.includes('買う前に、正しく比較しましょう'));
    assert.strictEqual(r.db['1'].lang, 'jp');
  });
  await t('other phones see the language screen first, then the chosen language sticks', async () => {
    const r = rig(), me = r.U(2, 'en'); await r.say(me, '/start');
    assert.ok(r.lastTo(2).body.text.includes('言語を選択'));
    await r.tap(me, '日本語'); assert.ok(r.lastTo(2).body.text.includes('買う前に'));
    assert.strictEqual(r.db['2'].lang, 'jp');
  });
  await t('the ☰ menu follows the language picked in the bot, for that chat only (Khmer gets the English list)', async () => {
    const r = rig(), menu = (id) => r.sent.filter((s) => s.method === 'setMyCommands' && s.body.scope && s.body.scope.chat_id === id).pop();
    const jp = r.U(5, 'en'); await r.say(jp, '/start'); await r.tap(jp, '日本語');
    assert.strictEqual(menu(5).body.scope.type, 'chat'); assert.strictEqual(menu(5).body.commands.find((c) => c.command === 'faq').description, 'よくある質問');
    assert.strictEqual(r.db['5'].menuV, require('../bot.js').MENU_V);
    assert.ok(!menu(5).body.commands.some((c) => c.command === 'estimate'), 'the estimate is hidden from the menu for now');
    const kh = r.U(6, 'km'); await r.say(kh, '/start'); await r.tap(kh, 'ខ្មែរ');
    assert.strictEqual(menu(6).body.commands.find((c) => c.command === 'faq').description, 'Common questions');
  });
  await t('menu: Talk to Nick opens the official LINE and the keyboard is complete', async () => {
    const r = rig(), me = r.U(3, 'ja'); await r.say(me, '/start');
    const kb = r.lastTo(3).body.reply_markup.inline_keyboard;
    assert.strictEqual(kb.flat().find((b) => b.url).url, 'https://line.me/ti/p/@615ueovq');
    assert.ok(kb.flat().length >= 5);
  });
  await t('English and Khmer clients reach Nick on Telegram, Japanese clients on LINE', async () => {
    const r = rig();
    const url = async (id, lang, btn) => { const me = r.U(id, lang); await r.say(me, '/start'); if (btn) await r.tap(me, btn); await r.say(me, '/nick');
      const m = r.lastTo(id).body; return { url: m.reply_markup.inline_keyboard[0][0].url, text: m.text }; };
    const en = await url(31, 'en', 'English'), kh = await url(32, 'km', 'ខ្មែរ'), jp = await url(33, 'ja') // a Japanese phone skips the language screen;
    assert.strictEqual(en.url, 'https://t.me/Nick_REAKH'); assert.ok(/Telegram/.test(en.text) && !/LINE/.test(en.text), en.text);
    assert.strictEqual(kh.url, 'https://t.me/Nick_REAKH'); assert.ok(!/LINE/.test(kh.text), kh.text);
    assert.strictEqual(jp.url, 'https://line.me/ti/p/@615ueovq'); assert.ok(/LINE/.test(jp.text));
  });
  await t('buy search ends with a request that tells Nick budget and district', async () => {
    const r = rig(), me = r.U(4, 'ja'); await r.say(me, '/start');
    await r.tap(me, '物件を購入する');
    const budget = r.firstLabel(4); await r.tap(me, budget);
    const district = r.firstLabel(4); await r.tap(me, district);
    const done = r.lastTo(4).body.text; assert.ok(done.includes('承りました') && done.includes(budget) && done.includes(district), done);
    const toNick = r.sent.filter((s) => s.body.chat_id === NICK).pop().body.text;
    assert.ok(toNick.includes('Search request') && toNick.includes(budget) && toNick.includes('tg://user?id=4'));
  });
  await t('the estimate is hidden from clients for now: no More button, /estimate gets the usual refusal; testers still get it', async () => {
    const r = rig({ testers: [14] }), me = r.U(13, 'ja'); await r.say(me, '/start'); await r.tap(me, 'その他');
    assert.ok(!r.lastTo(13).body.reply_markup.inline_keyboard.some((row) => /試算/.test(row[0].text)), 'no estimate button for clients');
    await r.say(me, '/estimate'); assert.ok(!/物件の価格/.test(r.lastTo(13).body.text));
    const tester = r.U(14, 'ja'); await r.say(tester, '/estimate'); assert.ok(/① 物件の価格は/.test(r.lastTo(14).body.text));
  });
  await t('estimate then ask Nick: three answers, one notification, 1 business day promise', async () => {
    const r = rig({ testers: [5] }), me = r.U(5, 'en'); await r.say(me, '/start'); await r.tap(me, 'English');
    await r.say(me, '/estimate'); await r.say(me, '68000'); await r.say(me, '650'); await r.say(me, '35');
    await r.tap(me, 'Ask Nick to review it');
    for (let i = 0; i < 2; i++) await r.tap(me, r.firstLabel(5));
    await r.tap(me, 'Nick messages me first');
    assert.ok(r.lastTo(5).body.text.includes('1 business day'));
    const notes = r.sent.filter((s) => s.body.chat_id === NICK && /Ask Nick/.test(s.body.text));
    assert.strictEqual(notes.length, 1); assert.ok(/Goal: /.test(notes[0].body.text) && /Reply by: Nick messages me first/.test(notes[0].body.text), notes[0].body.text);
  });
  await t('estimate: one question at a time, then every line in dollars (Nick method plus the building fee)', async () => {
    const r = rig({ testers: [6] }), me = r.U(6, 'en'); await r.say(me, '/start'); await r.tap(me, 'English'); await r.say(me, '/estimate');
    assert.ok(/① What is the price/.test(r.lastTo(6).body.text));
    await r.say(me, '$68,000'); assert.ok(/② What is the monthly rent/.test(r.lastTo(6).body.text));
    await r.say(me, '650'); assert.ok(/③ What is the size/.test(r.lastTo(6).body.text));
    await r.say(me, '35 sqm');
    const x = r.lastTo(6).body.text; // 7,800 rent; 1,092 tax; 780 management; 650 empty month; 35 x 1.5 x 12 = 630; keep 4,648
    for (const want of ['Rent: $7,800', 'Tax 14%: $1,092', 'Rental management 10%: $780', 'Empty months, 1 month: $650', '(35 sqm at $1.50 per sqm a month): $630', 'You keep: $4,648', 'Gross yield 11.5%', 'net yield about 6.8%', 'for reference only']) assert.ok(x.includes(want), want + '\n' + x);
    assert.deepStrictEqual(r.lastTo(6).body.reply_markup.inline_keyboard.map((row) => row[0].text), ['Ask Nick to review it', 'Try other numbers', 'Main menu']);
  });
  await t('estimate in Japanese with no size: Nick signature example $34,900 gives 8.6% to about 5.8%', async () => {
    const r = rig({ testers: [7] }), me = r.U(7, 'ja'); await r.say(me, '/estimate'); await r.say(me, '34900'); await r.say(me, '250'); await r.tap(me, '分からない');
    const x = r.lastTo(7).body.text;
    for (const want of ['家賃：3,000ドル', '－ 税金 14%：420ドル', '－ 賃貸管理費 10%：300ドル', '－ 空室 1か月：250ドル', '手取り：2,030ドル', '表面利回り 8.6%', '手取りの利回り 約5.8%', '建物の管理費（1㎡あたり月1から2ドル）は含みません', '参考値']) assert.ok(x.includes(want), want + '\n' + x);
  });
  await t('bad estimate input gets a gentle retry at each question, not a result', async () => {
    const r = rig({ testers: [8] }), me = r.U(8, 'ja'); await r.say(me, '/estimate');
    for (const bad of ['hello', '500', '1 2 3']) { await r.say(me, bad); assert.ok(r.lastTo(8).body.text.includes('価格を数字で'), bad); }
    await r.say(me, '6.8万'); assert.ok(/② 月額家賃/.test(r.lastTo(8).body.text), 'man (10,000) is read');
    await r.say(me, 'abc'); assert.ok(r.lastTo(8).body.text.includes('月額家賃を数字で'));
    await r.say(me, '650'); for (const bad of ['0', '9999', 'big']) { await r.say(me, bad); assert.ok(r.lastTo(8).body.text.includes('広さ（㎡）を数字で'), bad); }
  });
  await t('the old one line "100000 700" still works: price and rent at once, then the size', async () => {
    const r = rig({ testers: [9] }), me = r.U(9, 'en'); await r.say(me, '/start'); await r.tap(me, 'English'); await r.say(me, '/estimate'); await r.say(me, '100000 700');
    assert.ok(/③ What is the size/.test(r.lastTo(9).body.text)); await r.tap(me, 'I do not know');
    const x = r.lastTo(9).body.text; assert.ok(x.includes('Gross yield 8.4%') && x.includes('net yield about 5.7%') && x.includes('is not included'), x);
  });
  await t('own calculation: the client is told Nick checks it; Nick gets their message, a draft and what is missing; nothing is sent until he taps', async () => {
    const r = rig({ testers: [10] }), me = r.U(10, 'ja'), nick = r.U(NICK, 'en');
    await r.say(me, '/estimate'); await r.tap(me, '自分の計算を送る');
    await r.say(me, 'Time Square 5\n－ 家賃              500ドル/month\n－ 建物の管理費       1ドル/sqm\n－ Size: 50 sqm');
    assert.ok(r.lastTo(10).body.text.includes('1営業日以内'));
    assert.ok(r.sent.some((s) => s.method === 'forwardMessage' && s.body.chat_id === NICK), 'the original goes to Nick');
    const card = r.lastTo(NICK).body.text;
    for (const want of ['Estimate to check', 'Time Square 5', 'rent $500/month', 'building fee $1/sqm', '50 sqm', 'Missing from their version: price, tax, rental management, empty months', '手取り：3,460ドル', 'not sent yet']) assert.ok(card.includes(want), want + '\n' + card);
    const toClient = () => r.sent.filter((s) => s.body.chat_id === 10 && s.method === 'sendMessage').length, before = toClient();
    await r.tap(nick, 'Ask for the price'); assert.ok(r.lastTo(10).body.text.includes('物件の価格を教えてください'));
    await r.say(me, '120000');
    const card2 = r.lastTo(NICK).body.text; assert.ok(card2.includes('price $120,000') && card2.includes('手取りの利回り 約2.9%'), card2);
    await r.tap(nick, 'Send to client');
    const sent = r.lastTo(10).body.text; assert.ok(sent.includes('手取り：3,460ドル') && sent.includes('表面利回り 5.0%') && sent.includes('参考値'), sent);
    assert.ok(toClient() === before + 3, 'the client got: the price question, the received note, the reply');
    await r.bot.handleUpdate({ update_id: 3, callback_query: { id: 'cb', from: nick, data: 'ek:x:10', message: { message_id: 51, chat: { id: NICK, type: 'private' } } } });
    assert.ok(/already handled/.test(r.lastTo(NICK).body.text), 'an old card does nothing a second time');
    await r.bot.handleUpdate({ update_id: 4, callback_query: { id: 'cb', from: me, data: 'ek:s:10', message: { message_id: 52, chat: { id: 10, type: 'private' } } } });
    assert.ok(toClient() === before + 3, 'a client cannot press Nick buttons');
  });
  await t('all three numbers in one line, "68000, 650, 35", give the result at once; the same line as an own calculation gets a draft', async () => {
    const r = rig({ testers: [12] }), me = r.U(12, 'ja'); await r.say(me, '/estimate'); await r.say(me, '68000, 650, 35');
    const x = r.lastTo(12).body.text; assert.ok(x.includes('手取り：4,648ドル') && x.includes('約6.8%'), x);
    await r.say(me, '/estimate'); await r.tap(me, '自分の計算を送る'); await r.say(me, '68000, 650, 35');
    const card = r.lastTo(NICK).body.text; assert.ok(card.includes('price $68,000 · rent $650/month · 35 sqm') && card.includes('手取り：4,648ドル'), card);
  });
  await t('own short stay calculation: Nick gets his sheet model with the tax line, and no Send button', async () => {
    const r = rig({ testers: [11] }), me = r.U(11, 'ja'); await r.say(me, '/estimate'); await r.tap(me, '自分の計算を送る');
    await r.say(me, 'Gatsby 1BR\n1泊 60ドル\n稼働率 60%\n60sqm\n価格 $84,000');
    const m = r.lastTo(NICK), x = m.body.text;
    for (const want of ['Short stay', '219 nights', '$13,140', '$9,108 before the operator fee', '$7,286', '8.7% of $84,000', 'If 14% rental tax applies', '6.5%']) assert.ok(x.includes(want), want + '\n' + x);
    assert.ok(!m.body.reply_markup.inline_keyboard.some((row) => row[0].text === 'Send to client'));
  });
  await t('the FAQ shows its picture in Japanese and English, with the answer and buttons', async () => {
    const r = rig(), jp = r.U(31, 'ja'); await r.say(jp, '/start');
    await r.tap(jp, 'その他'); await r.tap(jp, 'よくある質問'); await r.tap(jp, '購入の流れ');
    const ph = r.sent.filter((x) => x.method === 'sendPhoto').pop();
    assert.ok(ph && /assets\/faq\/faq-02-process\.png\?v=[0-9a-f]{8}$/.test(ph.body.photo) && /購入の流れ/.test(ph.body.caption) && ph.body.reply_markup.inline_keyboard.length >= 2, ph && JSON.stringify(ph.body).slice(0, 200));
    const en = r.U(32, 'en'); await r.say(en, '/start'); await r.tap(en, 'English'); const n0 = r.sent.length;
    await r.tap(en, 'More'); await r.tap(en, 'Common questions'); await r.tap(en, 'How buying works');
    const after = r.sent.slice(n0), enPh = after.find((x) => x.method === 'sendPhoto');
    assert.ok(enPh && /faq-02-process-en\.png\?v=/.test(enPh.body.photo) && /The buying process/.test(enPh.body.caption), 'English gets the English picture');
    const step = require('../config/flow.json').steps.find((x) => x.id === 'faq4'); assert.ok(!step.photo.kh, 'Khmer pictures stay off until Nick has checked the Khmer');
  });
  await t('estimate reading: amounts with commas, $, man and k; a project name; sizes, not fees per sqm', () => {
    const E = require('../engines/estimate.js');
    assert.deepStrictEqual([E.amountOf('68,000'), E.amountOf('$68,000'), E.amountOf('6.8万'), E.amountOf('68k')], [68000, 68000, 68000, 68000]);
    const d = E.readOwn('Time Square 5\nRent $500 a month\nBuilding fee $1/sqm\nSize 50 sqm');
    assert.strictEqual(d.name, 'Time Square 5'); assert.strictEqual(d.rent, 500); assert.strictEqual(d.size, 50); assert.strictEqual(d.bldFee, 1); assert.strictEqual(d.price, 0);
  });
  await t('tour booking fills day, time and mode, leaves no placeholder, and tells Nick', async () => {
    const r = rig(), me = r.U(9, 'ja'); await r.say(me, '/tour');
    for (let i = 0; i < 3; i++) await r.tap(me, r.firstLabel(9));
    const done = r.lastTo(9).body.text; assert.ok(!/\[[^\]]+\]/.test(done), done);
    assert.ok(r.sent.some((s) => s.body.chat_id === NICK && /Tour request/.test(s.body.text)));
  });
  await t('check a listing forwards the message to Nick and confirms', async () => {
    const r = rig(), me = r.U(10, 'ja'); await r.say(me, '/start'); await r.tap(me, 'その他'); await r.tap(me, '物件のチェックを依頼');
    await r.say(me, 'https://example.com/listing/1');
    assert.ok(r.sent.some((s) => s.method === 'forwardMessage' && s.body.chat_id === NICK));
    assert.ok(r.lastTo(10).body.text.includes('1営業日'));
  });
  await t('deleting my data removes everything', async () => {
    const r = rig(), me = r.U(11, 'ja'); await r.say(me, '/start'); await r.tap(me, 'その他'); await r.tap(me, 'プライバシーとデータ');
    await r.tap(me, 'データを削除する'); await r.tap(me, r.firstLabel(11));
    assert.strictEqual(r.db['11'], undefined);
  });
  await t('staff commands do not exist for clients: polite reply, nothing leaks, Nick not pinged', async () => {
    const r = rig(), me = r.U(12, 'ja');
    for (const c of ['/digest', '/stats', '/admin', '/syncchannels', '/broadcastdigest', '/myunit']) {
      await r.say(me, c); const x = r.lastTo(12).body.text;
      assert.ok(/ご利用|利用でき|not available/i.test(x), c + ': ' + x);
      assert.ok(!/digest|admin|staff/i.test(x.replace(/<[^>]+>/g, '')), c);
    }
    assert.ok(!r.sent.some((s) => s.body.chat_id === NICK));
  });
  await t('plain text gets the "did not catch that" screen with buttons', async () => {
    const r = rig(), me = r.U(13, 'ja'); await r.say(me, '/start'); await r.say(me, 'こんにちは');
    assert.ok(r.lastTo(13).body.reply_markup.inline_keyboard.length > 0);
  });
  await t('the bot ignores group chats completely', async () => {
    const r = rig(), me = r.U(14, 'ja'); await r.bot.handleUpdate({ update_id: 3, message: { message_id: 1, chat: { id: -100, type: 'supergroup' }, from: me, text: '/start' } });
    assert.strictEqual(r.sent.length, 0);
  });
  await t('a failing store sends the friendly error screen and does not crash', async () => {
    const sent = []; let first = true;
    const bad = { get: () => { if (first) { first = false; throw new Error('disk'); } return { lang: 'ja' }; }, set() {}, delete() {} };
    const bot = createBot({ api: async (m, b) => { sent.push({ m, b }); return { ok: true }; }, store: bad, flow, nickId: NICK, onError: () => {} });
    await bot.handleUpdate({ update_id: 1, message: { message_id: 1, chat: { id: 5, type: 'private' }, from: { id: 5, first_name: 'x' }, text: '/start' } });
    assert.ok(sent.length >= 1);
  });
  await t('Other area: the next message typed becomes the district and the request goes to Nick', async () => {
    const r = rig(), me = r.U(20, 'ja'); await r.say(me, '/buy'); await r.tap(me, r.firstLabel(20)); await r.tap(me, 'その他');
    assert.ok(r.lastTo(20).body.text.includes('メッセージ欄') && r.lastTo(20).body.text.includes('例:'));
    await r.say(me, 'Time Square 8 の周辺');
    assert.ok(r.lastTo(20).body.text.includes('承りました') && r.lastTo(20).body.text.includes('Time Square 8 の周辺'));
    const alert = r.sent.filter((s) => s.body.chat_id === NICK).pop().body.text;
    assert.ok(alert.includes('District: Time Square 8 の周辺'), alert);
    assert.strictEqual(r.db['20'].awaiting, null);
  });
  await t('Other area works for rent and escapes HTML in what the client typed', async () => {
    const r = rig(), me = r.U(21, 'en'); await r.say(me, '/start'); await r.tap(me, 'English'); await r.tap(me, 'Find a place to rent');
    await r.tap(me, r.firstLabel(21)); await r.tap(me, 'Others'); await r.say(me, '<b>Sen Sok</b> & more');
    const done = r.lastTo(21).body.text; assert.ok(done.includes('&lt;b&gt;Sen Sok&lt;/b&gt; &amp; more'), done);
    assert.ok(r.sent.filter((s) => s.body.chat_id === NICK).pop().body.text.includes('&lt;b&gt;Sen Sok'));
  });
  await t('typing a command while waiting for an area still works and stops the waiting', async () => {
    const r = rig(), me = r.U(22, 'ja'); await r.say(me, '/buy'); await r.tap(me, r.firstLabel(22)); await r.tap(me, 'その他');
    await r.say(me, '/menu'); assert.ok(r.lastTo(22).body.text.includes('買う前に'));
    assert.strictEqual(r.db['22'].awaiting, null);
    await r.say(me, 'Sen Sok'); assert.ok(!r.sent.some((s) => s.body.chat_id === NICK), 'must not send a request');
  });
  await t('a sticker while waiting asks again instead of breaking', async () => {
    const r = rig(), me = r.U(23, 'ja'); await r.say(me, '/buy'); await r.tap(me, r.firstLabel(23)); await r.tap(me, 'その他');
    await r.say(me, '', { text: undefined, sticker: { file_id: 'x' } });
    assert.ok(r.lastTo(23).body.text.includes('メッセージ欄')); assert.strictEqual(r.db['23'].awaiting, 'area:bres:b2');
  });
  await t('Back from Other area returns to the districts and stops capturing text', async () => {
    const r = rig(), me = r.U(24, 'ja'); await r.say(me, '/buy'); await r.tap(me, r.firstLabel(24)); await r.tap(me, 'その他'); await r.tap(me, '戻る');
    assert.ok(r.lastTo(24).body.text.includes('エリア') || r.lastTo(24).body.text.includes('Where')); assert.strictEqual(r.db['24'].awaiting, null);
  });
  await t('a very long typed area is cut to 80 characters', async () => {
    const r = rig(), me = r.U(25, 'ja'); await r.say(me, '/buy'); await r.tap(me, r.firstLabel(25)); await r.tap(me, 'その他');
    await r.say(me, 'あ'.repeat(500)); assert.ok(r.db['25'].answers.b2.length === 80);
  });

  await t('budget screens accept a typed amount and carry on to the district', async () => {
    const r = rig(), me = r.U(30, 'ja'); await r.say(me, '/buy');
    assert.ok(!/ご入力いただくこともできます/.test(r.lastTo(30).body.text), 'no vague typing hint on the budget screen');
    await r.say(me, '約8万ドル');
    assert.ok(r.lastTo(30).body.text.includes('エリア') || r.lastTo(30).body.text.includes('Where'));
    assert.strictEqual(r.db['30'].answers.b1, '約8万ドル'); assert.strictEqual(r.db['30'].awaiting, null);
    await r.tap(me, r.firstLabel(30)); assert.ok(r.sent.filter((s) => s.body.chat_id === NICK).pop().body.text.includes('Budget: 約8万ドル'));
  });
  await t('typed rent budget works too, and a sticker at the budget screen just shows it again', async () => {
    const r = rig(), me = r.U(31, 'en'); await r.say(me, '/start'); await r.tap(me, 'English'); await r.tap(me, 'Find a place to rent');
    await r.say(me, '', { text: undefined, sticker: { file_id: 'x' } }); assert.ok(r.lastTo(31).body.text.includes('monthly budget'));
    await r.say(me, 'about 700 a month'); assert.strictEqual(r.db['31'].answers.rr1, 'about 700 a month');
  });

  await t('No preference skips the area and still sends the search request to Nick', async () => {
    const r = rig(), me = r.U(32, 'en'); await r.say(me, '/start'); await r.tap(me, 'English'); await r.tap(me, 'Find a property to buy');
    await r.tap(me, r.firstLabel(32)); await r.tap(me, 'Others'); await r.tap(me, 'No preference');
    assert.ok(r.lastTo(32).body.text.includes('Your search is saved'));
    assert.ok(r.sent.filter((s) => s.body.chat_id === NICK).pop().body.text.includes('District: No preference'));
    assert.strictEqual(r.db['32'].awaiting, null);
  });
  await t('the district screen has one catch-all button, not two', async () => {
    const r = rig(), me = r.U(33, 'en'); await r.say(me, '/start'); await r.tap(me, 'English'); await r.tap(me, 'Find a property to buy'); await r.tap(me, r.firstLabel(33));
    const labels = r.lastTo(33).body.reply_markup.inline_keyboard.flat().map((b) => b.text);
    assert.ok(labels.includes('Others') && !labels.includes('Any area') && !labels.includes('Other area'), labels.join(' | '));
    const rows = r.lastTo(33).body.reply_markup.inline_keyboard.map((row) => row.length);
    assert.deepStrictEqual(rows, [2, 2, 2, 1], 'rows should be 2,2,2,1 but are ' + rows.join(','));
  });

  console.log(`\nRESULTS: ${passed} / ${total} TESTS PASSED (${Math.round(passed / total * 100)}%)`);
  process.exit(passed === total ? 0 : 1);
})();
