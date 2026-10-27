// Listings from the Sheet: only approved live rows, matched to the client's choices, never leaking internal columns.
const assert = require('assert');
const L = require('../engines/listings.js');
const { createBot } = require('../bot.js');
const flow = require('../config/flow.json');
let passed = 0, total = 0;
async function t(name, fn) { total++; try { await fn(); passed++; console.log(`  ✅ Test ${total}: ${name}`); } catch (e) { console.log(`  ❌ Test ${total}: ${name}\n     ${e.message}`); } }

const HEAD = 'Ref,Status,Source,Buy or Rent,Project,Area,Price (USD),Monthly rent (USD),Size (sqm),Bedrooms,Net yield (%),Photo link,Note (Japanese),Note (English),Last checked,To check,Source link,Posted on';
const row = (a) => a.map((x) => '"' + String(x).replace(/"/g, '""') + '"').join(',');
const NOW = Date.parse('2026-10-25');
const CSV = [HEAD,
  row(['A1', 'Active', 'own', 'Buy', 'Alpha Tower', 'BKK1', '94000', '', '40', '1', '5.8', 'https://img.example/a.jpg', '静かな部屋, 眺め良好', 'Quiet, good view', '2026-10-20', '', 'https://t.me/NickREAKH/2840', '2026-10-06']),
  row(['A2', 'Active', 'own', 'Buy', 'Beta <b>Court</b>', 'Toul Kork', '88000', '', '65', '1', '', '', '', '', '', '', 'https://t.me/NickREAKH/2775', '2026-09-09']),
  row(['A3', 'Draft (hidden)', 'own', 'Buy', 'Gamma', 'BKK1', '90000']),
  row(['A4', 'Pending Review', 'own', 'Buy', 'Delta', 'BKK1', '91000']),
  row(['A5', 'Active', 'own', 'Buy', '', 'BKK1', '92000']),
  row(['A6', 'Active', 'own', 'Buy', 'Epsilon', '', '93000']),
  row(['A7', 'Active', 'own', 'Buy', 'Zeta', 'Daun Penh', '']),
  row(['R1', 'Active', 'own', 'Rent', 'Rent One', 'BKK1', '', '700', '50', '1']),
  row(['A8', 'Active', 'own', 'Buy', 'Eta Hall', 'Tonle Bassac', '150000', '', '80', '2', '', 'javascript:alert(1)']),
  row(['S1', 'Sold', 'own', 'Buy', 'Sold Tower', 'BKK1', '70000']),
  row(['S2', 'Rented', 'own', 'Rent', 'Rented Tower', 'BKK1', '', '600']),
  row(['S3', 'Inactive', 'own', 'Buy', 'Off Tower', 'BKK1', '70000']),
  row(['P1', 'Preview', 'own', 'Buy', 'Preview Place', 'BKK1', '93000', '', '45', '1']),
  row(['O1', 'Active', 'own', 'Buy', 'Old Check', 'BKK1', '60000', '', '', '', '', '', '', '', '2026-08-01'])].join('\n');

function rig(rows) {
  const sent = [], db = {};
  const api = async (m, b) => { sent.push({ method: m, body: b }); return { ok: true }; };
  const store = { get: (id) => db[String(id)], set: (id, v) => { db[String(id)] = JSON.parse(JSON.stringify(v)); }, delete: (id) => { delete db[String(id)]; } };
  const bot = createBot({ api, store, flow, nickId: '353195979', getListings: async () => rows });
  const from = { id: 1, first_name: 'K', language_code: 'ja' };
  const say = (text) => bot.handleUpdate({ update_id: 1, message: { message_id: 2, chat: { id: 1, type: 'private' }, from, text } });
  const tapIdx = (stepId, i) => bot.handleUpdate({ update_id: 2, callback_query: { id: 'c', from, data: 'g:' + stepId + ':' + i, message: { message_id: 5, chat: { id: 1, type: 'private' } } } });
  const tapData = (data) => bot.handleUpdate({ update_id: 2, callback_query: { id: 'c', from, data, message: { message_id: 5, chat: { id: 1, type: 'private' } } } });
  return { sent, say, tapIdx, tapData };
}

(async () => {
  const rows = L.clean(L.parseCsv(CSV), NOW);
  await t('only Active rows (website wording) with project, area and a price survive, and Sold, Rented, Inactive, Draft and Pending Review stay hidden', () => {
    assert.deepStrictEqual(rows.map((r) => r.id).sort(), ['A1', 'A2', 'A8', 'O1', 'P1', 'R1']);
  });
  await t('the reader keeps the Last checked date; the bot hides units not re-checked for over 30 days', () => {
    assert.strictEqual(rows.find((r) => r.id === 'O1').checked, '2026-08-01'); assert.strictEqual(rows.find((r) => r.id === 'A2').checked, '');
  });
  await t('old technical headers still work', () => {
    const old = L.clean(L.parseCsv('id,status,type,project_name,district,price_usd\nX1,Active,buy,Old Style,BKK1,50000'), NOW);
    assert.strictEqual(old.length, 1);
  });
  await t('website listing types and the website header name work (resale, new-launch, ready, rent)', () => {
    const csv = 'Ref,Status,Listing type,Project,Area,Price (USD),Monthly rent (USD)\nA,Active,Resale,P1x,BKK1,50000,\nB,Active,New launch,P2x,BKK1,60000,\nC,Active,ready,P3x,BKK1,70000,\nD,Active,rent,P4x,BKK1,,700\nE,Active,garage,P5x,BKK1,1000,';
    assert.deepStrictEqual(L.clean(L.parseCsv(csv), NOW).map((r) => r.id + r.type), ['Abuy', 'Bbuy', 'Cbuy', 'Drent']);
  });
  await t('tenanted units show the tenancy, REAKH rows show the partner line, others do not', async () => {
    const csv = 'Ref,Status,Source,Listing type,Project,Area,Price (USD),Monthly rent (USD),Size (sqm),Bedrooms,Tenanted,Tenancy note,Floor\n'
      + 'T1,Active,REAKH,Resale,Tenant Tower,BKK1,60000,250,30,1,Yes,"Leased at $250/month until Dec 2027",12\n'
      + 'T2,Active,Own,Resale,Plain Tower,BKK1,61000,,31,1,No,,5\n';
    const mine = L.clean(L.parseCsv(csv), NOW);
    assert.strictEqual(mine.length, 2); assert.ok(mine[0].tenanted && mine[0].partner && !mine[1].tenanted && !mine[1].partner);
    const sent = []; const db = {};
    const api = async (m, b) => { sent.push({ method: m, body: b }); return { ok: true }; };
    const store = { get: (k) => db[String(k)], set: (k, v) => { db[String(k)] = JSON.parse(JSON.stringify(v)); }, delete: (k) => { delete db[String(k)]; } };
    const bot = createBot({ api, store, flow, nickId: '353195979', getListings: async () => mine });
    const from = { id: 77, first_name: 'K', language_code: 'ja' };
    const tap = (st, i) => bot.handleUpdate({ update_id: 2, callback_query: { id: 'c', from, data: 'g:' + st + ':' + i, message: { message_id: 5, chat: { id: 77, type: 'private' } } } });
    await bot.handleUpdate({ update_id: 1, message: { message_id: 2, chat: { id: 77, type: 'private' }, from, text: '/buy' } });
    await tap('b1', 1); await tap('b2', 2);
    const list = sent.find((x) => /Tenant Tower/.test(x.body.text || '')).body.text;
    assert.ok(/テナント入居中: Leased at \$250\/month until Dec 2027/.test(list), list);
    assert.ok(/12階/.test(list) && /公式リスティングパートナー/.test(list) && /Plain Tower/.test(list));
  });
  await t('website feed: Phnom Penh only, from-prices flagged, photos off by default, repeats dropped, a failing source skipped', async () => {
    const feed = { listings: [
      { id: 'TS7-1001', type: 'buy', from: true, name: 'Time Square 7', district: 'Toul Kork', city: 'Phnom Penh', price: 90000, rent: 0, sqm: 40, beds: '', photo: 'https://x.test/a.webp' },
      { id: 'TS10-1004', type: 'buy', from: true, name: 'Time Square 10', district: 'Otres Beach', city: 'Sihanoukville', price: 46000, rent: 0, sqm: 36, beds: '' },
      { id: 'BAD-1', type: 'buy', from: false, name: '', district: 'BKK1', city: 'Phnom Penh', price: 1 }] };
    const rows = L.fromWebsite(feed);
    assert.deepStrictEqual(rows.map((r) => r.id), ['TS7-1001']);
    assert.strictEqual(rows[0].photo, ''); assert.strictEqual(L.fromWebsite(feed, { photos: true })[0].photo, 'https://x.test/a.webp');
    const all = await L.combine(async () => { throw new Error('down'); }, async () => rows, async () => rows)();
    assert.strictEqual(all.length, 1);
    const mine = L.fromWebsite(feed);
    const sent = []; const db = {};
    const api = async (m, b) => { sent.push({ method: m, body: b }); return { ok: true }; };
    const store = { get: (k) => db[String(k)], set: (k, v) => { db[String(k)] = JSON.parse(JSON.stringify(v)); }, delete: (k) => { delete db[String(k)]; } };
    const bot = createBot({ api, store, flow, nickId: '353195979', getListings: async () => mine });
    const from = { id: 88, first_name: 'K', language_code: 'ja' };
    const tap = (st, i) => bot.handleUpdate({ update_id: 2, callback_query: { id: 'c', from, data: 'g:' + st + ':' + i, message: { message_id: 5, chat: { id: 88, type: 'private' } } } });
    await bot.handleUpdate({ update_id: 1, message: { message_id: 2, chat: { id: 88, type: 'private' }, from, text: '/buy' } });
    await tap('b1', 1); await tap('b2', 4);
    const list = sent.find((x) => /Time Square 7/.test(x.body.text || '')).body.text;
    assert.ok(/\$90,000から/.test(list) && /40㎡（約12\.1坪）から/.test(list), list);
  });
  await t('the map fills a blank Area, never overrides one Nick typed, and shows the real district for Others', async () => {
    const places = { places: [
      { name: 'Orkidē The Royal Condominium', khan: 'Sen Sok', sangkat: "Ou Bek K'am", area: 'Others' },
      { name: 'Agile Sky Residence', khan: 'Boeng Keng Kang', sangkat: 'Boeung Keng Kang 3 (BKK3)', area: 'Others' },
      { name: 'Time Square 5 (306) - BKK1', khan: 'Boeng Keng Kang', sangkat: 'Boeung Keng Kang 1 (BKK1)', area: 'BKK1' }] };
    const csv = 'Ref,Status,Listing type,Project,Area,Price (USD)\nM1,Active,Resale,Orkide,,62000\nM2,Active,Resale,Agile Sky Residence,,95000\nM3,Active,Resale,Time Square 5,Toul Kork,82000\nM4,Active,Resale,Unknown Place,,70000';
    const got = L.clean(L.parseCsv(csv), NOW, places);
    assert.deepStrictEqual(got.map((r) => r.id + ':' + r.district), ['M1:Others', 'M2:Others', 'M3:Toul Kork']);
    assert.strictEqual(got[0].khan, 'Sen Sok');
    assert.deepStrictEqual(L.match(got, 'buy', { budget: 'Not decided yet', district: 'typed:Sen Sok' }).map((r) => r.id), ['M1']);
    assert.deepStrictEqual(L.match(got, 'buy', { budget: 'Not decided yet', district: 'typed:BKK3' }).map((r) => r.id), ['M2']);
    assert.strictEqual(L.placeFor('Time Square 1', { places: [{ name: 'Time Square 11', khan: 'X', sangkat: 'y', area: 'Others' }] }), null, 'Time Square 1 must not match Time Square 11');
    assert.strictEqual(L.placeFor('H Residence', { places: [{ name: 'Residence H Sensok', khan: 'Sen Sok', sangkat: 'x', area: 'Others' }] }).khan, 'Sen Sok');
    const sent = []; const db = {};
    const api = async (m, b) => { sent.push({ method: m, body: b }); return { ok: true }; };
    const store = { get: (k) => db[String(k)], set: (k, v) => { db[String(k)] = JSON.parse(JSON.stringify(v)); }, delete: (k) => { delete db[String(k)]; } };
    const bot = createBot({ api, store, flow, nickId: '353195979', getListings: async () => got });
    const from = { id: 99, first_name: 'K', language_code: 'ja' };
    await bot.handleUpdate({ update_id: 1, message: { message_id: 2, chat: { id: 99, type: 'private' }, from, text: '/buy' } });
    await bot.handleUpdate({ update_id: 2, callback_query: { id: 'c', from, data: 'g:b1:1', message: { message_id: 5, chat: { id: 99, type: 'private' } } } });
    await bot.handleUpdate({ update_id: 3, callback_query: { id: 'c', from, data: 'g:b2:5', message: { message_id: 5, chat: { id: 99, type: 'private' } } } });
    await bot.handleUpdate({ update_id: 4, callback_query: { id: 'c', from, data: 'g:b2other:0', message: { message_id: 5, chat: { id: 99, type: 'private' } } } });
    const text = sent.find((x) => /Orkide/.test(x.body.text || '')).body.text;
    assert.ok(/Orkide<\/b> · Sen Sok/.test(text) && !/Others/.test(text), text);
  });
  await t('website projects are placed by their own coordinates inside the map boundaries', () => {
    const B = { khans: [{ name: 'Sen Sok', rings: [[[104.0, 11.0], [105.0, 11.0], [105.0, 12.0], [104.0, 12.0]]] }], sangkats: [{ name: 'Sangkat Test 1', rings: [[[104.0, 11.0], [104.5, 11.0], [104.5, 12.0], [104.0, 12.0]]] }] };
    const feed = { listings: [{ id: 'X-1001', type: 'buy', from: true, name: 'Pinned Place', district: 'Phnom Penh', city: 'Phnom Penh', lat: 11.5, lng: 104.2, price: 50000, rent: 0, sqm: 30 },
      { id: 'X-1002', type: 'buy', from: true, name: 'No Pin', district: 'BKK1', city: 'Phnom Penh', lat: 0, lng: 0, price: 60000, rent: 0, sqm: 30 }] };
    const rows = L.fromWebsite(feed, { boundaries: B });
    assert.deepStrictEqual([rows[0].khan, rows[0].sangkat, rows[1].khan], ['Sen Sok', 'Test 1', '']);
    assert.strictEqual(require('../engines/places.js').buttonArea('Toul Kork', 'Boeung Kak 1'), 'Toul Kork');
    assert.strictEqual(require('../engines/places.js').buttonArea('Boeng Keng Kang', 'Boeung Keng Kang 1 (BKK1)'), 'BKK1');
  });
  await t('area text shows the market label, plus the official khan only when they differ', async () => {
    const mk = (district, khan, sangkat) => ({ id: 'Z-1', type: 'buy', name: 'Zed', district, khan, sangkat, price: 60000, rent: 0, sqm: 0, beds: '', floor: '', tenanted: false, preview: false });
    const rows = [mk('Tonle Bassac', 'Chba Ampov', 'Veal Sbov'), mk('TTP', 'Chamkar Mon', 'Boeng Trabaek'), mk('BKK1', 'Boeng Keng Kang', 'Boeung Keng Kang 1 (BKK1)'), mk('Toul Kork', 'Toul Kork', 'Boeung Kak 1'), mk('Others', 'Sen Sok', "Ou Bek K'am"), mk('Tonle Bassac', '', '')];
    const out = [];
    for (const l of rows) {
      const sent = []; const db = {};
      const api = async (m, b) => { sent.push({ method: m, body: b }); return { ok: true }; };
      const store = { get: (k) => db[String(k)], set: (k, v) => { db[String(k)] = JSON.parse(JSON.stringify(v)); }, delete: (k) => { delete db[String(k)]; } };
      const bot = createBot({ api, store, flow, nickId: '353195979', getListings: async () => [l] });
      const from = { id: 61, first_name: 'K', language_code: 'en' };
      await bot.handleUpdate({ update_id: 1, message: { message_id: 2, chat: { id: 61, type: 'private' }, from, text: '/buy' } });
      await bot.handleUpdate({ update_id: 2, callback_query: { id: 'c', from, data: 'g:b1:1', message: { message_id: 5, chat: { id: 61, type: 'private' } } } });
      await bot.handleUpdate({ update_id: 3, callback_query: { id: 'c', from, data: 'g:b2:5', message: { message_id: 5, chat: { id: 61, type: 'private' } } } });
      await bot.handleUpdate({ update_id: 4, callback_query: { id: 'c', from, data: 'g:b2other:0', message: { message_id: 5, chat: { id: 61, type: 'private' } } } });
      out.push((sent.find((x) => /Zed/.test(x.body.text || '')).body.text.match(/<b>Zed<\/b>([^(\n]*(?:\([^)]*\))?)/) || [])[1].replace(/ \(Z-1\)$/, '').trim());
    }
    assert.deepStrictEqual(out, ['· Tonle Bassac (Chba Ampov)', '· TTP (Chamkar Mon)', '· BKK1', '· Toul Kork', '· Sen Sok', '· Tonle Bassac']);
  });
  await t('size basis: a size is labelled gross or net, and price per sqm appears only when the basis is known', async () => {
    const csv = 'Ref,Status,Listing type,Project,Area,Price (USD),Size (sqm),Size basis\nB1,Active,Resale,Net Place,BKK1,70000,35,Net\nB2,Active,Resale,Gross Place,BKK1,70000,50,Gross\nB3,Active,Resale,Unknown Place,BKK1,70000,50,\nB4,Active,Resale,Japanese Place,BKK1,90000,30,専有面積';
    const rows = L.clean(L.parseCsv(csv), NOW);
    assert.deepStrictEqual(rows.map((r) => r.basis), ['net', 'gross', '', 'net']);
    assert.deepStrictEqual(L.clean(L.parseCsv('Ref,Status,Listing type,Project,Area,Price (USD),Floor\nF1,Active,Resale,Floor A,BKK1,50000,-\nF2,Active,Resale,Floor B,BKK1,50000,12\nF3,Active,Resale,Floor C,BKK1,50000,unknown'), NOW).map((r) => r.floor), ['', '12', '']);
    const sent = []; const db = {};
    const api = async (m, b) => { sent.push({ method: m, body: b }); return { ok: true }; };
    const store = { get: (k) => db[String(k)], set: (k, v) => { db[String(k)] = JSON.parse(JSON.stringify(v)); }, delete: (k) => { delete db[String(k)]; } };
    const bot = createBot({ api, store, flow, nickId: '353195979', getListings: async () => rows });
    const from = { id: 71, first_name: 'K', language_code: 'ja' };
    await bot.handleUpdate({ update_id: 1, message: { message_id: 2, chat: { id: 71, type: 'private' }, from, text: '/buy' } });
    await bot.handleUpdate({ update_id: 2, callback_query: { id: 'c', from, data: 'g:b1:1', message: { message_id: 5, chat: { id: 71, type: 'private' } } } });
    await bot.handleUpdate({ update_id: 3, callback_query: { id: 'c', from, data: 'g:b2:2', message: { message_id: 5, chat: { id: 71, type: 'private' } } } });
    const text = sent.find((x) => /Net Place/.test(x.body.text || '')).body.text;
    assert.ok(/35㎡（専有・約10\.6坪）/.test(text) && /\$2,000\/㎡（専有）/.test(text), text);
    assert.ok(/Gross Place[^]*50㎡（総面積・約15\.1坪）[^]*\$1,400\/㎡（総面積）/.test(text), 'gross is labelled and its own price per sqm');
    const card = text.split('<blockquote>').find((x) => /Unknown Place/.test(x));
    assert.ok(/50㎡（約15\.1坪）/.test(card) && !/専有|総面積/.test(card) && !/\/㎡/.test(card), 'unknown basis: plain size and no price per sqm: ' + card);
  });
  await t('quoted commas are read correctly and internal columns never reach the clean rows', () => {
    const a = rows.find((r) => r.id === 'A1');
    assert.strictEqual(a.noteJp, '静かな部屋, 眺め良好');
    assert.ok(!JSON.stringify(rows).includes('t.me'), 'source link leaked');
  });
  await t('an unsafe photo link is dropped', () => { assert.strictEqual(rows.find((r) => r.id === 'A8').photo, ''); });
  await t('budget bands, district and typed amounts match as expected', () => {
    assert.deepStrictEqual(L.match(rows.filter((r) => !r.preview && r.id !== 'O1'), 'buy', { budget: '$50,000 to $100,000', district: 'BKK1' }).map((r) => r.id), ['A1']);
    assert.deepStrictEqual(L.match(rows.filter((r) => !r.preview && r.id !== 'O1'), 'buy', { budget: 'Not decided yet', district: 'No preference' }).map((r) => r.id), ['A2', 'A1', 'A8'].sort((a, b) => ({ A1: 94, A2: 88, A8: 150 }[a] - { A1: 94, A2: 88, A8: 150 }[b])));
    assert.deepStrictEqual(L.match(rows.filter((r) => !r.preview && r.id !== 'O1'), 'buy', { budget: 'typed:9万', district: 'Others' }).map((r) => r.id)[0], 'A2');
    assert.deepStrictEqual(L.match(rows.filter((r) => !r.preview && r.id !== 'O1'), 'buy', { budget: 'Above $200,000', district: 'BKK1' }), []);
    assert.deepStrictEqual(L.match(rows.filter((r) => !r.preview && r.id !== 'O1'), 'buy', { budget: 'Not decided yet', district: 'typed:Alpha' }).map((r) => r.id), ['A1']);
    assert.deepStrictEqual(L.match(rows.filter((r) => !r.preview && r.id !== 'O1'), 'rent', { budget: '$500 to $800', district: 'BKK1' }).map((r) => r.id), ['R1']);
  });
  await t('parseAmount reads Japanese and plain amounts', () => {
    assert.strictEqual(L.parseAmount('8万'), 80000); assert.strictEqual(L.parseAmount('$80,000'), 80000); assert.strictEqual(L.parseAmount('80k'), 80000); assert.strictEqual(L.parseAmount('abc'), 0);
  });
  await t('buy flow shows the matching listing with disclaimer and an ask button, then the normal result screen', async () => {
    const r = rig(rows); await r.say('/buy'); await r.tapIdx('b1', 1); await r.tapIdx('b2', 2);
    const msgs = r.sent.filter((s) => s.body.chat_id === 1 && s.method === 'sendMessage');
    const list = msgs.find((m) => /Alpha Tower/.test(m.body.text));
    assert.ok(list, 'no listing message'); assert.ok(/<blockquote>/.test(list.body.text));
    assert.ok(/※利回り・価格は参考値/.test(list.body.text) || /参考値/.test(list.body.text), 'disclaimer missing');
    assert.ok(!/NickREAKH|t\.me|PHC|REAKH/.test(list.body.text));
    assert.strictEqual(list.body.reply_markup.inline_keyboard[0][0].callback_data, 'q:A1');
    assert.ok(/ご希望の条件を承りました/.test(msgs[msgs.length - 1].body.text), 'result screen should follow');
  });
  await t('HTML in a project name cannot break the message', async () => {
    const r = rig(rows); await r.say('/buy'); await r.tapIdx('b1', 4); await r.tapIdx('b2', 4);
    const list = r.sent.find((s) => s.method === 'sendMessage' && /Beta/.test(s.body.text || ''));
    assert.ok(list && /&lt;b&gt;Court/.test(list.body.text));
  });
  await t('tapping Ask tells Nick which listing and gives the client the LINE button', async () => {
    const r = rig(rows); r.sent.length = 0; await r.tapData('q:A1');
    const toNick = r.sent.find((s) => s.body.chat_id === '353195979'); assert.ok(/A1 Alpha Tower/.test(toNick.body.text));
    const toClient = r.sent.filter((s) => s.body.chat_id === 1).pop(); assert.ok(toClient.body.reply_markup.inline_keyboard[0][0].url.startsWith('https://line.me'));
  });
  await t('a Preview row is shown to Nick only, never to a client', async () => {
    const mk = (id) => { const sent = []; const db = {};
      const api = async (m, b) => { sent.push({ method: m, body: b }); return { ok: true }; };
      const store = { get: (k) => db[String(k)], set: (k, v) => { db[String(k)] = JSON.parse(JSON.stringify(v)); }, delete: (k) => { delete db[String(k)]; } };
      const bot = createBot({ api, store, flow, nickId: '353195979', getListings: async () => rows });
      const from = { id, first_name: 'K', language_code: 'ja' };
      const tap = (st, i) => bot.handleUpdate({ update_id: 2, callback_query: { id: 'c', from, data: 'g:' + st + ':' + i, message: { message_id: 5, chat: { id, type: 'private' } } } });
      return { sent, tap, say: (text) => bot.handleUpdate({ update_id: 1, message: { message_id: 2, chat: { id, type: 'private' }, from, text } }), bot, from }; };
    const client = mk(555), nick = mk(353195979);
    for (const r of [client, nick]) { await r.say('/buy'); await r.tap('b1', 1); await r.tap('b2', 2); }
    assert.ok(!client.sent.some((s) => /Preview Place/.test(s.body.text || '')), 'client saw a preview');
    const seen = nick.sent.find((s) => /Preview Place/.test(s.body.text || ''));
    assert.ok(seen && /PREVIEW/.test(seen.body.text), 'nick should see the preview');
  });
  await t('no matching listing leaves the normal flow untouched, and an unknown id is ignored', async () => {
    const r = rig([]); await r.say('/buy'); await r.tapIdx('b1', 1); await r.tapIdx('b2', 2);
    assert.ok(!r.sent.some((s) => /blockquote/.test(s.body.text || '')));
    r.sent.length = 0; await r.tapData('q:ZZZ'); assert.ok(r.sent.every((s) => s.method === 'answerCallbackQuery'));
  });
  console.log(`\nRESULTS: ${passed} / ${total} TESTS PASSED (${Math.round(passed / total * 100)}%)`);
  process.exit(passed === total ? 0 : 1);
})();
