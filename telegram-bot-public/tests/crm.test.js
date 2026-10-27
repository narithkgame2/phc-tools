// The bot and the PHC CRM: the free guide, interest tracking, and which clients become CRM rows. Fake Telegram, fake CRM, no network.
const assert = require('assert');
const { createBot } = require('../bot.js');
const { createCrm, leadFor } = require('../engines/crm.js');
const flow = require('../config/flow.json');
let passed = 0, total = 0;
async function t(name, fn) { total++; try { await fn(); passed++; console.log(`  ✅ Test ${total}: ${name}`); } catch (e) { console.log(`  ❌ Test ${total}: ${name}\n     ${e.message}`); } }
const NICK = '353195979', TESTER = 5712964982;

function rig(opts = {}) {
  const sent = [], db = {}, crmCalls = [];
  const api = async (method, body) => { sent.push({ method, body }); return { ok: true, result: { message_id: sent.length } }; };
  const store = { get: (id) => db[String(id)], set: (id, v) => { db[String(id)] = JSON.parse(JSON.stringify(v)); }, delete: (id) => { delete db[String(id)]; } };
  const crm = opts.noCrm ? null : {
    upsert: async (lead, event) => { crmCalls.push({ type: 'upsert', lead, event }); return opts.crmDown ? null : { success: true }; },
    forget: async (id) => { crmCalls.push({ type: 'forget', id }); return { success: true }; },
  };
  const listings = [{ id: 'TS7-5001', name: 'Time Square 7', type: 'buy', price: 94000, beds: 1, net: 33, district: 'Toul Kork', area: 'Toul Kork', live: true }];
  const bot = createBot({ api, store, flow, nickId: NICK, crm, testerIds: [TESTER], getListings: async () => listings });
  let msgId = 100;
  const U = (id, lang, extra) => Object.assign({ id, first_name: 'Kenji', last_name: 'Tanaka', username: 'kenji_t', language_code: lang }, extra || {});
  const say = (from, text, extra) => bot.handleUpdate({ update_id: 1, message: Object.assign({ message_id: ++msgId, chat: { id: from.id, type: 'private' }, from, text }, extra || {}) });
  const data = (from, d) => bot.handleUpdate({ update_id: 2, callback_query: { id: 'cb', from, data: d, message: { message_id: 50, chat: { id: from.id, type: 'private' } } } });
  const lastTo = (chat) => sent.filter((s) => s.body.chat_id === chat && (s.method === 'sendMessage' || s.method === 'editMessageText')).pop();
  const tap = (from, label) => {
    const m = lastTo(from.id); let d = null;
    m.body.reply_markup.inline_keyboard.forEach((r) => r.forEach((b) => { if (b.text === label) d = b.callback_data; }));
    assert.ok(d, 'button not found: ' + label + ' in ' + JSON.stringify(m.body.reply_markup.inline_keyboard.map((r) => r.map((b) => b.text))));
    return data(from, d);
  };
  const toNick = () => sent.filter((s) => String(s.body.chat_id) === NICK && s.method === 'sendMessage');
  const docs = (chat) => sent.filter((s) => s.method === 'sendDocument' && s.body.chat_id === chat);
  return { sent, db, bot, U, say, data, tap, lastTo, toNick, docs, crmCalls };
}

(async () => {
  console.log('\nThe bot and the PHC CRM\n');

  await t('the CRM link stays off until a link and a key are set', async () => {
    assert.strictEqual(createCrm({}), null);
    assert.strictEqual(createCrm({ url: 'https://x' }), null);
  });

  await t('the CRM link sends the bot action with the key, and a refusal is reported, not thrown', async () => {
    const calls = [], errors = [];
    const fake = async (url, o) => { calls.push({ url, body: JSON.parse(o.body), o }); return { status: 200, json: async () => (calls.length === 1 ? { success: true, created: true } : { error: 'Unauthorized' }) }; };
    const crm = createCrm({ url: 'https://crm', key: 'phc_bot_x', fetchImpl: fake, onError: (e) => errors.push(e.message) });
    const ok = await crm.upsert({ id: 'TG-1' }, 'Guide sent');
    assert.deepStrictEqual(ok, { success: true, created: true });
    assert.deepStrictEqual(calls[0].body, { key: 'phc_bot_x', sheet: 'Leads', action: 'botUpsert', lead: { id: 'TG-1' }, event: 'Guide sent' });
    assert.strictEqual(calls[0].o.headers['Content-Type'], 'text/plain');
    assert.strictEqual(await crm.forget(1), null);
    assert.deepStrictEqual(calls[1].body, { key: 'phc_bot_x', sheet: 'Leads', action: 'botForget', id: 'TG-1' });
    assert.ok(/Unauthorized/.test(errors[0]));
  });

  await t('a CRM row looks like a website lead: nationality, budget band, score, telegram, assigned by the CRM to Nick', async () => {
    const l = leadFor({ id: 77, lang: 'jp', int: { budget: '$100,000 to $200,000', timeline: 'Now' } }, { first_name: 'Taro', last_name: 'Yamada', username: 'taro' });
    assert.deepStrictEqual([l.id, l.fullName, l.nationality, l.telegram, l.budget, l.timeline, l.score], ['TG-77', 'Taro Yamada', 'Japanese', '@taro tg:77', '$100K-$200K', '0-3 months', 4]);
    assert.ok(/LINE/.test(l.notes) && !/PHC/.test(l.notes));
    const e = leadFor({ id: 8, lang: 'en', int: { timeline: 'Later' } }, { first_name: 'Ann' }, { tester: true });
    assert.deepStrictEqual([e.fullName, e.nationality, e.telegram, e.budget, e.timeline], ['TEST Ann', 'Other', 'tg:8', '', '']);
    assert.ok(/Telegram/.test(e.notes) && /TEST ACCOUNT/.test(e.notes));
  });

  await t('the main menu offers the free guide in Japanese, English and Khmer', async () => {
    for (const [lang, code, label] of [['jp', 'ja', '無料資料（PDF）を受け取る'], ['en', 'en', 'Free guide (PDF)'], ['kh', 'km', 'ឯកសារឥតគិតថ្លៃ (PDF)']]) {
      const r = rig(), me = r.U(11, code); await r.say(me, '/start');
      if (lang !== 'jp') await r.tap(me, lang === 'en' ? 'English' : 'ខ្មែរ');
      const kb = r.lastTo(11).body.reply_markup.inline_keyboard.flat();
      assert.ok(kb.some((b) => b.text === label && b.callback_data === 'gd:get'), lang);
    }
  });

  await t('Japanese client: the guide PDF arrives with the LINE button; Nick gets one card with what they looked at; one CRM row', async () => {
    const r = rig(), me = r.U(12, 'ja'); await r.say(me, '/start');
    await r.tap(me, '物件を購入する'); await r.tap(me, '10万から20万ドル'); await r.tap(me, 'BKK1');
    await r.data(me, 'g:faq:1'); // reads Extra costs
    r.crmCalls.length = 0; r.toNick().length; const before = r.toNick().length;
    await r.data(me, 'gd:get');
    const d = r.docs(12).pop();
    assert.ok(/guide-5-things-2026-jp\.pdf$/.test(d.body.document) && /購入前に知っておきたい5つのこと/.test(d.body.caption));
    assert.strictEqual(d.body.reply_markup.inline_keyboard[0][0].url, 'https://line.me/ti/p/@615ueovq');
    const card = r.toNick().slice(before).map((s) => s.body.text).find((x) => /Guide sent/.test(x));
    assert.ok(card && /Kenji Tanaka \(@kenji_t\)/.test(card) && /Searched: buy 10万から20万ドル · BKK1/.test(card) && /Read: Extra costs/.test(card), card);
    const up = r.crmCalls.filter((c) => c.type === 'upsert');
    assert.strictEqual(up.length, 1);
    assert.strictEqual(up[0].lead.id, 'TG-12'); assert.strictEqual(up[0].lead.budget, '$100K-$200K'); assert.strictEqual(up[0].lead.nationality, 'Japanese');
    assert.ok(/^Guide sent \(Japanese PDF\)/.test(up[0].event) && /Read: Extra costs/.test(up[0].event), up[0].event);
    // asking again: the PDF again, but no second card and no second CRM write
    const n = r.toNick().length; await r.data(me, 'gd:get');
    assert.strictEqual(r.docs(12).length, 2); assert.strictEqual(r.toNick().length, n); assert.strictEqual(r.crmCalls.filter((c) => c.type === 'upsert').length, 1);
  });

  await t('English and Khmer clients get the English guide with the Telegram button; the Khmer caption is Khmer', async () => {
    const r = rig(), en = r.U(13, 'en'), kh = r.U(14, 'km');
    await r.say(en, '/start'); await r.tap(en, 'English'); await r.say(en, '/guide');
    await r.say(kh, '/start'); await r.tap(kh, 'ខ្មែរ'); await r.data(kh, 'gd:get');
    const a = r.docs(13).pop(), b = r.docs(14).pop();
    assert.ok(/guide-5-things-2026-en\.pdf$/.test(a.body.document) && /5 things to know/.test(a.body.caption));
    assert.ok(/guide-5-things-2026-en\.pdf$/.test(b.body.document) && /ភាសាអង់គ្លេស/.test(b.body.caption));
    assert.strictEqual(a.body.reply_markup.inline_keyboard[0][0].url, 'https://t.me/Nick_REAKH');
  });

  await t('Nick sends the full report once with /setguide jp; Japanese clients then get that file (no public link needed)', async () => {
    const r = rig(), nick = r.U(Number(NICK), 'ja'), client = r.U(15, 'ja');
    const doc = { file_id: 'FILE123', file_name: 'カンボジア・コンドミニアム投資ガイド2026｜Realestate.com.kh 市場分析レポート（日本語版）.pdf', file_size: 26645449 };
    await r.say(nick, '', { document: doc, caption: '/setguide jp' });
    assert.ok(/Saved\. Japanese clients/.test(r.lastTo(Number(NICK)).body.text) && /25\.4 MB/.test(r.lastTo(Number(NICK)).body.text));
    await r.say(client, '/start'); await r.data(client, 'gd:get');
    const d = r.docs(15).pop();
    assert.strictEqual(d.body.document, 'FILE123');
    assert.ok(/カンボジア・コンドミニアム投資ガイド2026/.test(d.body.caption) && /1営業日以内/.test(d.body.caption));
    // English clients still get the English guide
    const en = r.U(16, 'en'); await r.say(en, '/start'); await r.tap(en, 'English'); await r.data(en, 'gd:get');
    assert.ok(/-en\.pdf$/.test(r.docs(16).pop().body.document));
  });

  await t('only Nick can set the guide', async () => {
    const r = rig(), other = r.U(17, 'ja'), client = r.U(18, 'ja');
    await r.say(other, '', { document: { file_id: 'EVIL', file_name: 'x.pdf' }, caption: '/setguide jp' });
    await r.say(client, '/start'); await r.data(client, 'gd:get');
    assert.ok(/guide-5-things-2026-jp\.pdf$/.test(r.docs(18).pop().body.document));
  });

  await t('a guide link (t.me/Nick_Cambodia_Bot?start=guide) sends the guide and records where the client came from', async () => {
    const r = rig(), me = r.U(19, 'ja'); await r.say(me, '/start guide');
    assert.strictEqual(r.docs(19).length, 1);
    assert.strictEqual(r.db['19'].int.from, 'guide link');
    assert.ok(/Came from: guide link/.test(r.crmCalls[0].event));
    const en = r.U(20, 'en'); await r.say(en, '/start guide'); await r.tap(en, 'English'); // language first, then the guide
    assert.strictEqual(r.docs(20).length, 1);
  });

  await t('asking about a unit: Nick\'s card shows the interests and the CRM row gets the unit', async () => {
    const r = rig(), me = r.U(21, 'ja'); await r.say(me, '/start');
    await r.data(me, 'q:TS7-5001');
    const card = r.toNick().pop().body.text;
    assert.ok(/Listing interest/.test(card) && /Asked about: TS7-5001/.test(card), card);
    const up = r.crmCalls.pop();
    assert.strictEqual(up.lead.interestedIn, 'TS7-5001 Time Square 7');
    assert.ok(/^Asked about TS7-5001 Time Square 7, \$94,000/.test(up.event), up.event);
  });

  await t('a search request, a tour and the Ask Nick form each update the CRM row', async () => {
    const r = rig(), me = r.U(22, 'en'); await r.say(me, '/start'); await r.tap(me, 'English');
    await r.tap(me, 'Find a property to buy'); await r.tap(me, '$50,000 to $100,000'); await r.tap(me, 'BKK1');
    const s = r.crmCalls.pop();
    assert.ok(/^Search request \(budget \$50,000 to \$100,000, district BKK1\)/.test(s.event), s.event);
    assert.strictEqual(s.lead.budget, 'Under $100K');
    await r.say(me, '/nick'); await r.data(me, 'g:menu:5'); // nothing: Talk to Nick is a link
    await r.say(me, '/start'); await r.data(me, 'g:more:0'); // any screen; then the Ask Nick form
    const lead1 = flow.steps.find((x) => x.id === 'lead1');
    if (lead1) {
      await r.data(me, 'g:lead1:1'); await r.data(me, 'g:lead2:0'); await r.data(me, 'g:lead3:1');
      const f = r.crmCalls.pop();
      assert.ok(/^Ask Nick \(goal Invest, timeline Now, reply by Nick messages me first\)/.test(f.event), f.event);
      assert.strictEqual(f.lead.timeline, '0-3 months');
    }
  });

  await t('Nick testing his own bot never becomes a CRM row; a tester account does, marked TEST', async () => {
    const r = rig(), nick = r.U(Number(NICK), 'ja'), tester = r.U(TESTER, 'ja');
    await r.say(nick, '/start'); await r.data(nick, 'gd:get'); await r.data(nick, 'q:TS7-5001');
    assert.strictEqual(r.crmCalls.length, 0);
    await r.say(tester, '/start'); await r.data(tester, 'gd:get');
    assert.strictEqual(r.crmCalls[0].lead.fullName, 'TEST Kenji Tanaka');
    assert.ok(/\(tester account\)/.test(r.toNick().pop().body.text));
  });

  await t('"Delete my data" also blanks the CRM row', async () => {
    const r = rig(), me = r.U(23, 'ja'); await r.say(me, '/start'); await r.data(me, 'gd:get');
    await r.data(me, 'g:privacy:0'); // Delete my data
    const del = flow.steps.find((x) => x.id === 'forget');
    const yes = del.buttons.findIndex((b) => b.to === 'forgetdone');
    await r.data(me, 'g:forget:' + yes);
    assert.deepStrictEqual(r.crmCalls.pop(), { type: 'forget', id: 23 });
    assert.strictEqual(r.db['23'], undefined);
  });

  await t('if the CRM is down, the client still gets everything', async () => {
    const r = rig({ crmDown: true }), me = r.U(24, 'ja'); await r.say(me, '/start');
    await r.data(me, 'gd:get'); await r.data(me, 'q:TS7-5001');
    assert.strictEqual(r.docs(24).length, 1);
    assert.ok(/Nickに伝えました/.test(r.lastTo(24).body.text));
  });

  await t('without a CRM link the bot works exactly as before', async () => {
    const r = rig({ noCrm: true }), me = r.U(25, 'ja'); await r.say(me, '/start'); await r.data(me, 'gd:get'); await r.data(me, 'q:TS7-5001');
    assert.strictEqual(r.docs(25).length, 1); assert.ok(/Listing interest/.test(r.toNick().pop().body.text));
  });

  await t('the privacy screen says what is kept and that requests go into Nick\'s client list, in all 3 languages', async () => {
    const p = flow.steps.find((x) => x.id === 'privacy');
    assert.ok(/topics and units you look at/.test(p.text) && /Nick's client list/.test(p.text));
    assert.ok(/ご覧になったテーマと物件/.test(p.tr.jp.t) && /顧客リスト/.test(p.tr.jp.t));
    assert.ok(/បញ្ជីអតិថិជន/.test(p.tr.kh.t));
  });

  console.log(`\nRESULTS: ${passed} / ${total} TESTS PASSED (${Math.round((passed / total) * 100)}%)`);
  process.exit(passed === total ? 0 : 1);
})();
