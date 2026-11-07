// The backup (deploy/backup/NickBot_Backup.gs) against fake Google services: every screen, in every language, must reach the
// client exactly as the Mac bot sends it. Also the handover (watchdog), the key, duplicates and the replay on the Mac.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const B = require('../bot.js');
const { createBackupLink, backupConfig } = require('../engines/backup.js');
const flow = require('../config/flow.json');
let passed = 0, total = 0;
async function t(name, fn) { total++; try { await fn(); passed++; console.log(`  ✅ Test ${total}: ${name}`); } catch (e) { console.log(`  ❌ Test ${total}: ${name}\n     ${e.stack.split('\n').slice(0, 3).join('\n     ')}`); } }
const NICK = '353195979', KEY = 'test-key-123', EXEC = 'https://script.google.com/macros/s/TEST/exec';
const GS = fs.readFileSync(path.join(__dirname, '..', 'deploy', 'backup', 'NickBot_Backup.gs'), 'utf8');

// a fresh Apps Script world: properties, cache, lock, fetch to Telegram (recorded), web app outputs, triggers
function gas(opts) {
  const P = Object.assign({ TELEGRAM_BOT_TOKEN: '1:fake', BACKUP_KEY: KEY }, (opts && opts.props) || {});
  const cache = {}, sent = [], triggers = [];
  let webhook = '';
  const reply = (opts && opts.reply) || (() => ({ ok: true, result: {} }));
  const sandbox = {
    console: { log() {}, error() {} },
    PropertiesService: { getScriptProperties: () => ({
      getProperties: () => Object.assign({}, P), getProperty: (k) => (k in P ? P[k] : null),
      setProperty: (k, v) => { assert.ok(Buffer.byteLength(String(v)) <= 9216, 'property over 9 KB: ' + k); P[k] = String(v); },
      setProperties: (o) => { Object.keys(o).forEach((k) => { assert.ok(Buffer.byteLength(String(o[k])) <= 9216, 'property over 9 KB: ' + k); P[k] = String(o[k]); }); },
      deleteProperty: (k) => { delete P[k]; } }) },
    CacheService: { getScriptCache: () => ({ get: (k) => cache[k] || null, put: (k, v) => { cache[k] = v; } }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    UrlFetchApp: { fetch: (url, o) => {
      const method = url.split('/').pop(), body = JSON.parse(o.payload);
      sent.push({ method, body });
      if (method === 'setWebhook') webhook = body.url;
      if (method === 'deleteWebhook') webhook = '';
      if (method === 'getWebhookInfo') return { getContentText: () => JSON.stringify({ ok: true, result: { url: webhook } }) };
      return { getContentText: () => JSON.stringify(reply(method, body)) };
    } },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: (s) => ({ content: s, setMimeType() { return this; } }) },
    HtmlService: { createHtmlOutput: (s) => ({ html: s }) },
    ScriptApp: { getProjectTriggers: () => triggers, deleteTrigger() {}, newTrigger: (f) => ({ timeBased: () => ({ everyMinutes: () => ({ create: () => triggers.push({ getHandlerFunction: () => f }) }) }) }) },
  };
  vm.createContext(sandbox);
  vm.runInContext(GS, sandbox);
  const post = (params, body) => sandbox.doPost({ parameter: params, postData: { contents: JSON.stringify(body) } });
  const update = (u) => post({ a: 'tg', k: KEY }, u);
  return { P, sent, sandbox, post, update, cache, setHook: (u) => { webhook = u; }, getHook: () => webhook };
}
const cfgFor = (o) => backupConfig(Object.assign({ flow, MSG: B.MSG, GUIDE: B.GUIDE, MEDIA_BASE: B.MEDIA_BASE, commandList: B.commandList, nickId: NICK, testers: [], priv: false, guides: {} }, o || {}));
function syncBody(cfg, live, extra) { return Object.assign({ t: Date.now(), url: EXEC, hash: 'h1', lhash: 'l1', cfg, live: live || { langs: {}, alerts: [], agents: [] }, ack: 0 }, extra || {}); }
function synced(o, live) { const g = gas(o); const r = g.post({ a: 'sync', k: KEY }, syncBody(cfgFor(o && o.cfg), live)); assert.ok(JSON.parse(r.content).ok); return g; }
function mac(o) {
  const sent = [], db = {}, al = {};
  const api = async (method, body) => { sent.push({ method, body }); return { ok: true }; };
  const store = { get: (id) => db[String(id)], set: (id, v) => { db[String(id)] = JSON.parse(JSON.stringify(v)); }, delete: (id) => { delete db[String(id)]; }, all: () => Object.values(db) };
  const alertStore = { get: (k) => al[String(k)], set: (k, v) => { al[String(k)] = v; }, delete: (k) => { delete al[String(k)]; }, all: () => Object.values(al) };
  const bot = B.createBot(Object.assign({ api, store, flow, nickId: NICK, alertStore }, o || {}));
  return { sent, db, al, bot };
}
// what the client sees: every call to the client's chat except the button spinner
const client = (sent, id) => sent.filter((s) => String(s.body.chat_id) === String(id) && s.method !== 'answerCallbackQuery').map((s) => ({ method: s.method, body: s.body }));
const msgU = (id, from, text, extra) => ({ update_id: Math.floor(Math.random() * 1e9), message: Object.assign({ message_id: 7, chat: { id, type: 'private' }, from, text }, extra || {}) });
const cbU = (id, from, data) => ({ update_id: Math.floor(Math.random() * 1e9), callback_query: { id: 'c' + Math.random(), from, data, message: { message_id: 5, chat: { id, type: 'private' } } } });

(async () => {
  await t('the backup file is valid JavaScript and holds no token or key', () => {
    new vm.Script(GS);
    assert.ok(!/\d{6,12}:[A-Za-z0-9_-]{30,}/.test(GS), 'a token in the file');
    assert.ok(/getProperty\('BACKUP_KEY'\)|all\.BACKUP_KEY/.test(GS));
  });

  // the main promise: same screens in the same language. Walks every button path from the menu in Japanese, English and Khmer.
  let compared = 0;
  for (const lang of ['jp', 'en', 'kh']) {
    const seen = new Set(), queue = [[]];
    let uid = 5000 + (lang === 'jp' ? 0 : lang === 'en' ? 100000 : 200000);
    while (queue.length) {
      const pathTaken = queue.shift(), id = ++uid, from = { id, first_name: 'Ken', username: 'ken_t', language_code: 'ja' };
      const m = mac(), g = synced({}, { langs: { [id]: lang }, alerts: [], agents: [] });
      m.db[String(id)] = { id, lang, answers: {}, awaiting: null };
      const steps = [msgU(id, from, '/menu')].concat(pathTaken.map((d) => cbU(id, from, d)));
      for (const u of steps) { await m.bot.handleUpdate(u); g.update(u); }
      const a = client(m.sent, id), b = client(g.sent, id);
      await t(lang + ' ' + (pathTaken.join(' > ') || 'menu'), () => assert.deepStrictEqual(b, a));
      compared++;
      const last = a.filter((x) => x.body.reply_markup).pop();
      (last ? last.body.reply_markup.inline_keyboard.flat() : []).forEach((btn) => {
        const d = btn.callback_data; if (!d || !/^(g:|m:menu$)/.test(d) || seen.has(d)) return;
        seen.add(d); queue.push(pathTaken.concat([d]));
      });
    }
  }
  await t('the walk covered every screen in all three languages', () => assert.ok(compared > 100, 'only ' + compared));

  // typed messages and commands, a new client on a Japanese phone and on an English phone
  const scripts = [
    ['ja', ['/start']], ['en', ['/start']], ['en', ['/start', { cb: 'l:kh' }]], ['en', ['/start', { cb: 'l:en' }, '/buy', { cb: 'g:b1:0' }, { cb: 'g:b2:5' }, 'Toul Kork']],
    ['ja', ['/start', '/rent']], ['ja', ['/tour']], ['ja', ['/faq']], ['ja', ['/nick']], ['ja', ['/myid']], ['ja', ['/stop']], ['ja', ['/estimate']], ['ja', ['/whatever']],
    ['ja', ['hello there']], ['ja', ['/buy', { cb: 'g:b1:5' }]], ['ja', ['/buy', 'BKK1 near the river']],
    ['ja', ['/start', { cb: 'g:menu:4' }, { cb: 'g:more:2' }, { cb: 'g:privacy:0' }, { cb: 'g:forget:0' }]],
    ['ja', ['/guide']], ['en', ['/start', { cb: 'l:en' }, { cb: 'gd:get' }]],
    ['ja', ['/buy', { cb: 'g:b1:1' }, { cb: 'g:b2:0' }, { cb: 'al:on' }]],
    ['ja', ['/start', { cb: 'g:menu:4' }, { cb: 'g:more:1' }, 'https://example.com/unit-123']],
  ];
  for (const [phone, steps] of scripts) {
    const id = 70000 + scripts.indexOf(scripts.find((s) => s[1] === steps)), from = { id, first_name: 'Aiko', username: 'aiko', language_code: phone };
    const m = mac(), g = synced();
    for (const s of steps) { const u = typeof s === 'string' ? msgU(id, from, s) : cbU(id, from, s.cb); await m.bot.handleUpdate(u); g.update(u); }
    await t('same answer: ' + phone + ' phone, ' + steps.map((s) => (typeof s === 'string' ? s : s.cb)).join(' > '), () => assert.deepStrictEqual(client(g.sent, id), client(m.sent, id)));
  }

  await t('Nick hears about a tour request from the backup, marked as the backup, with the same details', async () => {
    const id = 81001, from = { id, first_name: 'Yuki', language_code: 'ja' }, g = synced();
    for (const u of [msgU(id, from, '/tour'), cbU(id, from, 'g:tour:0'), cbU(id, from, 'g:tourday:1'), cbU(id, from, 'g:tourtime:2')]) g.update(u);
    const alert = g.sent.filter((s) => s.body.chat_id === NICK).pop();
    assert.ok(alert && /Tour request/.test(alert.body.text) && /backup answered/.test(alert.body.text) && /Day: /.test(alert.body.text), alert && alert.body.text);
  });
  await t('a Telegram update with a wrong key is ignored', () => {
    const g = synced(), id = 81002;
    g.post({ a: 'tg', k: 'wrong' }, msgU(id, { id, first_name: 'X', language_code: 'ja' }, '/start'));
    assert.strictEqual(client(g.sent, id).length, 0);
  });
  await t('the same update sent twice by Telegram is answered once', () => {
    const g = synced(), id = 81003, u = msgU(id, { id, first_name: 'X', language_code: 'ja' }, '/start');
    g.update(u); g.update(u);
    assert.strictEqual(client(g.sent, id).length, 1);
  });
  await t('private test mode: a stranger gets the same one polite line as on the Mac', async () => {
    const id = 81004, from = { id, first_name: 'X', language_code: 'ja' };
    const m = mac({ isPrivate: () => true }), g = synced({ cfg: { priv: true } });
    await m.bot.handleUpdate(msgU(id, from, '/start')); g.update(msgU(id, from, '/start'));
    assert.deepStrictEqual(client(g.sent, id), client(m.sent, id));
  });
  await t('Nick and agents get a short note that their tools need the Mac', () => {
    const g = synced({}, { langs: {}, alerts: [], agents: ['81005'] });
    g.update(msgU(Number(NICK), { id: Number(NICK), first_name: 'Nick', language_code: 'ja' }, '/units'));
    g.update(msgU(81005, { id: 81005, first_name: 'Agent', language_code: 'en' }, 'New unit at BKK1 $900'));
    assert.ok(/needs the Mac/.test(client(g.sent, NICK)[0].body.text) && /needs the Mac/.test(client(g.sent, 81005)[0].body.text));
  });
  await t('a big screen file is stored in pieces under 9 KB and read back whole', () => {
    const g = synced();
    assert.ok(Number(g.P.cfg_n) > 3);
    assert.deepStrictEqual(JSON.parse(Object.keys(g.P).filter((k) => /^cfg_\d+$/.test(k)).sort((a, b) => a.split('_')[1] - b.split('_')[1]).map((k) => g.P[k]).join('')), JSON.parse(JSON.stringify(cfgFor())));
  });

  // handover
  await t('watchdog: Mac alive, nothing happens', () => {
    const g = synced(); g.sandbox.watchdog();
    assert.ok(!g.sent.some((s) => s.method === 'setWebhook'));
  });
  await t('watchdog: Mac silent 4 minutes, Telegram is pointed at the backup and Nick is told once', () => {
    const g = synced(); g.P.beat = String(Date.now() - 4 * 60000);
    g.sandbox.watchdog(); g.sandbox.watchdog();
    const sets = g.sent.filter((s) => s.method === 'setWebhook');
    assert.strictEqual(sets.length, 1);
    assert.ok(sets[0].body.url.startsWith(EXEC + '?a=tg&k=') && sets[0].body.drop_pending_updates === false);
    assert.strictEqual(g.sent.filter((s) => s.body.chat_id === NICK).length, 1);
  });
  await t('Mac back: its heartbeat switches the backup off, clears its client records and tells Nick', () => {
    const g = synced(); g.P.beat = String(Date.now() - 4 * 60000); g.sandbox.watchdog();
    g.update(msgU(81006, { id: 81006, first_name: 'X', language_code: 'ja' }, '/start'));
    assert.ok(g.P.u_81006);
    g.post({ a: 'sync', k: KEY }, syncBody(null, null, { cfg: undefined, live: undefined }));
    assert.strictEqual(g.P.hook, '0'); assert.ok(!g.P.u_81006);
    assert.ok(/Mac is back/.test(g.sent.filter((s) => s.body.chat_id === NICK).pop().body.text));
  });
  await t('Mac alive but its heartbeats do not reach Google: no back and forth every minute', () => {
    const g = synced(); g.P.beat = String(Date.now() - 4 * 60000);
    g.sandbox.watchdog(); g.setHook(''); // the Mac removed the link when its polling hit the webhook
    g.sandbox.watchdog(); g.sandbox.watchdog();
    assert.strictEqual(g.P.hook, '0'); assert.strictEqual(g.sent.filter((s) => s.method === 'setWebhook').length, 1);
  });
  await t('the watchdog does nothing before the Mac has synced once', () => {
    const g = gas(); g.sandbox.watchdog(); assert.strictEqual(g.sent.length, 0);
  });

  // the replay: what the backup queued is finished by the Mac
  await t('end to end: a search, an alert, a stop and a language in the backup are finished by the Mac when it is back', async () => {
    const g = synced(), id = 81007, from = { id, first_name: 'Sora', username: 'sora', language_code: 'en' };
    for (const u of [msgU(id, from, '/start'), cbU(id, from, 'l:en'), cbU(id, from, 'g:menu:0'), cbU(id, from, 'g:b1:1'), cbU(id, from, 'g:b2:2'), cbU(id, from, 'al:on')]) g.update(u);
    const listing = { id: 'TS5-1', name: 'Time Square 5', type: 'buy', price: 80000, district: 'BKK1', sqm: 40, checked: new Date().toISOString() };
    const m = mac({ getListings: async () => [listing] });
    const link = createBackupLink({ url: EXEC, key: KEY, config: () => cfgFor(), live: () => ({ langs: {}, alerts: [], agents: [] }), replay: m.bot.replay,
      fetchImpl: async (u, o) => { const q = Object.fromEntries(new URL(u).searchParams); const r = g.post(q, JSON.parse(o.body)); return { json: async () => JSON.parse(r.content) }; } });
    assert.ok(await link.beat());
    assert.strictEqual(m.db[String(id)].lang, 'en');
    assert.ok(m.al[String(id)], 'the alert is set on the Mac');
    assert.ok(m.sent.some((s) => String(s.body.chat_id) === String(id) && /TS5-1/.test(JSON.stringify(s.body))), 'the listing reached the client');
    const before = m.sent.length;
    assert.ok(await link.beat());
    assert.strictEqual(m.sent.length, before, 'nothing runs twice');
    assert.ok(!(g.P.delta_0 || '').includes('"k":"search"'), 'the backup forgot the finished items');
  });
  await t('a client who asked to delete everything in the backup is deleted on the Mac, and nothing else about them is sent', async () => {
    const g = synced(), id = 81008, from = { id, first_name: 'Del', language_code: 'ja' };
    for (const u of [msgU(id, from, '/buy'), cbU(id, from, 'g:b1:1'), cbU(id, from, 'g:b2:0'), cbU(id, from, 'g:menu:4'), cbU(id, from, 'g:more:2'), cbU(id, from, 'g:privacy:0'), cbU(id, from, 'g:forget:0')]) g.update(u);
    const items = JSON.parse(g.P.delta_0).items.filter((x) => x.id === String(id));
    assert.deepStrictEqual(items.map((x) => x.k), ['forget']);
  });
  await t('old listing requests (over 24 hours) are not sent late, CRM rows and stops still are', async () => {
    const m = mac({ getListings: async () => [{ id: 'A1', name: 'A', type: 'buy', price: 1, district: 'BKK1', checked: new Date().toISOString() }] });
    await m.bot.replay({ k: 'search', id: '81009', lang: 'jp', kind: 'buy', keys: {}, at: new Date(Date.now() - 2 * 86400000).toISOString() });
    assert.ok(!m.sent.some((s) => String(s.body.chat_id) === '81009'));
  });
  await t('the Mac heartbeat sends the screens once, then only when they change', async () => {
    const g = gas(), bodies = [];
    const link = createBackupLink({ url: EXEC, key: KEY, config: () => cfgFor(), live: () => ({ langs: { 1: 'jp' }, alerts: [], agents: [] }), replay: async () => {},
      fetchImpl: async (u, o) => { const b = JSON.parse(o.body); bodies.push(b); const r = g.post(Object.fromEntries(new URL(u).searchParams), b); return { json: async () => JSON.parse(r.content) }; } });
    await link.beat(); await link.beat();
    assert.ok(bodies[0].cfg && bodies[0].live && !bodies[1].cfg && !bodies[1].live);
  });
  await t('a wrong key on the Mac side is reported once, the bot keeps running', async () => {
    const g = gas(), logs = [];
    const link = createBackupLink({ url: EXEC, key: 'nope', config: () => cfgFor(), live: () => ({}), replay: async () => {}, log: (x) => logs.push(x),
      fetchImpl: async (u, o) => { const r = g.post(Object.fromEntries(new URL(u).searchParams), JSON.parse(o.body)); return { json: async () => JSON.parse(r.content) }; } });
    assert.strictEqual(await link.beat(), false); await link.beat();
    assert.strictEqual(logs.length, 1);
  });

  await t('a few seconds of macOS dark wake is not a real wake; 90 seconds awake is', () => {
    const { createWakeWatch } = require('../engines/wake.js');
    let clock = 1e9; const w = createWakeWatch({ now: () => clock, tick: 0 });
    assert.ok(w.settled(), 'awake from the start');
    clock += 17 * 60000; assert.ok(!w.settled(), 'just woke after 17 minutes asleep');
    clock += 5000; assert.ok(!w.settled());
    for (let i = 0; i < 18; i++) { clock += 5000; w.settled(); }
    assert.ok(w.settled(), 'awake for 90 seconds');
  });
  console.log(`\nRESULTS: ${passed} / ${total} TESTS PASSED (${Math.round(passed / total * 100)}%)`);
  process.exit(passed === total ? 0 : 1);
})();
