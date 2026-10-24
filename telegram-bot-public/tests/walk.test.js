// Walks every button of every screen in all three languages and checks what Telegram would receive.
const assert = require('assert');
const { createBot } = require('../bot.js');
const flow = require('../config/flow.json');
let passed = 0, total = 0;
async function t(name, fn) { total++; try { await fn(); passed++; console.log(`  ✅ Test ${total}: ${name}`); } catch (e) { console.log(`  ❌ Test ${total}: ${name}\n     ${e.message}`); } }

const ALLOWED = ['b', 'i', 'u', 's', 'code', 'pre', 'blockquote', 'a'];
function checkHtml(html, where) {
  const stack = [];
  const re = /<\/?([a-z]+)(\s[^>]*)?>/gi; let m;
  while ((m = re.exec(html))) {
    const name = m[1].toLowerCase(); assert.ok(ALLOWED.includes(name), where + ' unsupported tag <' + name + '>');
    if (m[0][1] === '/') assert.strictEqual(stack.pop(), name, where + ' unbalanced </' + name + '>'); else stack.push(name);
  }
  assert.strictEqual(stack.length, 0, where + ' unclosed ' + stack.join(','));
  assert.ok(!/<(?![a-z/])/i.test(html.replace(/<[^>]*>/g, '')), where + ' stray <');
}
function checkMessage(body, where) {
  assert.ok(body.text && body.text.length <= 4096, where + ' text length');
  if (body.parse_mode === 'HTML') checkHtml(body.text, where);
  const kb = body.reply_markup && body.reply_markup.inline_keyboard;
  if (kb) { assert.ok(kb.length <= 20, where + ' rows'); kb.forEach((row) => { assert.ok(row.length >= 1 && row.length <= 2, where + ' row size'); row.forEach((b) => {
    assert.ok(b.text && b.text.length > 0, where + ' empty label');
    assert.ok(!!b.url !== !!b.callback_data, where + ' button needs exactly one of url or callback');
    if (b.callback_data) assert.ok(Buffer.byteLength(b.callback_data) <= 64, where + ' callback too long');
  }); }); }
}

(async () => {
  const sent = [], db = {};
  const api = async (method, body) => { sent.push({ method, body }); return { ok: true }; };
  const store = { get: (id) => db[String(id)], set: (id, v) => { db[String(id)] = JSON.parse(JSON.stringify(v)); }, delete: (id) => { delete db[String(id)]; } };
  const bot = createBot({ api, store, flow, nickId: '353195979' });
  const visited = {};
  for (const lang of ['jp', 'en', 'kh']) {
    // breadth first over every callback reachable from the menu, using a fresh user for each path
    const seen = new Set(), queue = [[]];
    let uid = 1000;
    while (queue.length) {
      const path = queue.shift(); const id = ++uid + (lang === 'jp' ? 0 : lang === 'en' ? 100000 : 200000);
      const from = { id, first_name: 'T', language_code: 'ja' };
      delete db[String(id)]; sent.length = 0;
      await bot.handleUpdate({ update_id: 1, message: { message_id: 1, chat: { id, type: 'private' }, from, text: '/start' } });
      db[String(id)].lang = lang;
      let last = null;
      for (const [fromId, idx] of path) {
        await bot.handleUpdate({ update_id: 2, callback_query: { id: 'c', from, data: 'g:' + fromId + ':' + idx, message: { message_id: 5, chat: { id, type: 'private' } } } });
      }
      last = sent.filter((s) => s.body.chat_id === id && (s.method === 'sendMessage' || s.method === 'editMessageText')).pop();
      if (path.length === 0) { await bot.handleUpdate({ update_id: 1, message: { message_id: 2, chat: { id, type: 'private' }, from, text: '/menu' } }); last = sent.filter((s) => s.body.chat_id === id).pop(); }
      assert.ok(last, 'no reply on path ' + JSON.stringify(path));
      checkMessage(last.body, lang + ' ' + JSON.stringify(path));
      last.body.reply_markup.inline_keyboard.flat().forEach((b) => {
        if (!b.callback_data || !b.callback_data.startsWith('g:')) return;
        const [, f, i] = b.callback_data.split(':'); const key = f + ':' + i;
        if (seen.has(key)) return; seen.add(key); queue.push(path.concat([[f, Number(i)]]));
      });
      const stepIds = path.map((p) => p[0]); stepIds.forEach((s) => { visited[s] = 1; });
    }
    visited['_' + lang] = seen.size;
  }
  await t('every reachable screen renders valid Telegram HTML and keyboards in Japanese, English and Khmer', () => {
    assert.ok(visited._jp > 20 && visited._en === visited._jp && visited._kh === visited._jp, JSON.stringify([visited._jp, visited._en, visited._kh]));
  });
  await t('walked screens leave no unfilled placeholder except where a client types', () => {
    const bad = sent.filter((s) => /\[[a-z ]+\]/.test(s.body.text || '')); assert.strictEqual(bad.length, 0, bad.map((b) => b.body.text.slice(0, 60)).join(' | '));
  });
  await t('a stale button from an old message is ignored without an error', async () => {
    const from = { id: 9001, first_name: 'T', language_code: 'ja' }; sent.length = 0;
    await bot.handleUpdate({ update_id: 3, callback_query: { id: 'c', from, data: 'g:nope:9', message: { message_id: 5, chat: { id: 9001, type: 'private' } } } });
    await bot.handleUpdate({ update_id: 3, callback_query: { id: 'c', from, data: 'zzz', message: { message_id: 5, chat: { id: 9001, type: 'private' } } } });
    assert.ok(sent.every((s) => s.method === 'answerCallbackQuery'));
  });
  await t('stickers, photos and empty messages get the friendly screen, never a crash', async () => {
    const from = { id: 9002, first_name: 'T', language_code: 'ja' }; sent.length = 0;
    await bot.handleUpdate({ update_id: 4, message: { message_id: 1, chat: { id: 9002, type: 'private' }, from, sticker: { file_id: 'x' } } });
    await bot.handleUpdate({ update_id: 5, message: { message_id: 2, chat: { id: 9002, type: 'private' }, from, photo: [{ file_id: 'y' }], caption: '' } });
    assert.ok(sent.some((s) => s.method === 'sendMessage' && s.body.chat_id === 9002));
  });
  await t('a very long message does not break the notification to Nick', async () => {
    const from = { id: 9003, first_name: 'T'.repeat(300), language_code: 'ja' }; sent.length = 0;
    await bot.handleUpdate({ update_id: 6, message: { message_id: 1, chat: { id: 9003, type: 'private' }, from, text: '/estimate' } });
    await bot.handleUpdate({ update_id: 7, message: { message_id: 2, chat: { id: 9003, type: 'private' }, from, text: 'x'.repeat(6000) } });
    assert.ok(sent.every((s) => !s.body.text || s.body.text.length <= 4096));
  });
  await t('names with HTML characters cannot break the alert to Nick', async () => {
    const from = { id: 9004, first_name: '<b>Evil</b> & "Co"', username: 'a_b', language_code: 'ja' }; sent.length = 0;
    await bot.handleUpdate({ update_id: 8, message: { message_id: 1, chat: { id: 9004, type: 'private' }, from, text: '/tour' } });
    for (let i = 0; i < 3; i++) {
      const m = sent.filter((s) => s.body.chat_id === 9004 && s.method !== 'answerCallbackQuery').pop();
      const data = m.body.reply_markup.inline_keyboard[0][0].callback_data;
      await bot.handleUpdate({ update_id: 9, callback_query: { id: 'c', from, data, message: { message_id: 5, chat: { id: 9004, type: 'private' } } } });
    }
    const alert = sent.filter((s) => s.body.chat_id === '353195979').pop();
    assert.ok(alert && !/<b>Evil<\/b>/.test(alert.body.text) && /&lt;b&gt;Evil/.test(alert.body.text));
    checkHtml(alert.body.text, 'alert');
  });
  console.log(`\nRESULTS: ${passed} / ${total} TESTS PASSED (${Math.round(passed / total * 100)}%)`);
  process.exit(passed === total ? 0 : 1);
})();
