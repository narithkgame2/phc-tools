// @Nick_Cambodia_Bot (public Japanese investor bot), Phase 1. Long polling, no dependencies.
// Token: read from ~/.phc-secrets/nick-cambodia-bot.env by load-secrets.js. Never written in code.
require('./load-secrets.js');
const fs = require('fs');
const path = require('path');
const { createBot } = require('./bot.js');

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token || !/^\d{6,12}:[A-Za-z0-9_-]{30,}$/.test(token)) {
  console.error('\nThe bot token is missing or not valid.\nOpen this private file and paste the token after TELEGRAM_BOT_TOKEN=\n  ~/.phc-secrets/nick-cambodia-bot.env\nThen start the bot again.\n');
  process.exit(1);
}
const NICK_ID = process.env.NICK_TELEGRAM_ID || '353195979';
const flow = JSON.parse(fs.readFileSync(path.join(__dirname, 'config', 'flow.json'), 'utf8'));

// Small file store: one JSON file, written atomically. Holds each client's language and answers only.
const FILE = path.join(__dirname, 'data', 'users.json');
let users = {};
try { users = JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch (e) { users = {}; }
function persist() {
  const tmp = FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(users));
  fs.renameSync(tmp, FILE);
}
const store = {
  get: (id) => users[String(id)],
  set: (id, v) => { users[String(id)] = v; persist(); },
  delete: (id) => { delete users[String(id)]; persist(); },
};

async function api(method, body) {
  try {
    const r = await fetch('https://api.telegram.org/bot' + token + '/' + method, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const j = await r.json();
    if (!j.ok && !/message is not modified/i.test(j.description || '')) console.error('Telegram error on ' + method + ': ' + (j.description || 'unknown'));
    return j;
  } catch (e) {
    console.error('Network error on ' + method + ': ' + e.message);
    return { ok: false };
  }
}

const bot = createBot({ api, store, flow, nickId: NICK_ID, onError: (e) => console.error('Handler error:', e.message) });

async function setupProfile() {
  const cmds = {
    jp: [['start', 'メインメニュー'], ['buy', '購入物件を探す'], ['rent', '賃貸物件を探す'], ['tour', '内覧を予約する'], ['estimate', '手取りを計算する'], ['nick', 'Nickに相談する']],
    en: [['start', 'Main menu'], ['buy', 'Find a property to buy'], ['rent', 'Find a place to rent'], ['tour', 'Book a tour'], ['estimate', 'Estimate with my numbers'], ['nick', 'Talk to Nick']],
  };
  const mk = (a) => a.map(([command, description]) => ({ command, description }));
  await api('setMyCommands', { commands: mk(cmds.jp) });
  await api('setMyCommands', { commands: mk(cmds.en), language_code: 'en' });
  await api('setMyCommands', { commands: mk(cmds.jp), language_code: 'ja' });
}

async function run() {
  const me = await api('getMe', {});
  console.log('Nick Cambodia bot started as @' + (me.result && me.result.username) + ' (Phase 1, clients only)');
  await setupProfile();
  let offset = 0;
  for (;;) {
    const r = await api('getUpdates', { offset, timeout: 30, allowed_updates: ['message', 'callback_query'] });
    if (!r.ok) { await new Promise((s) => setTimeout(s, 3000)); continue; }
    for (const u of r.result) {
      offset = u.update_id + 1;
      await bot.handleUpdate(u);
    }
  }
}
run();
