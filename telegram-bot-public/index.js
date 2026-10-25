// @Nick_Cambodia_Bot (public Japanese investor bot), Phase 1. Long polling, no dependencies.
// Token: read from ~/.phc-secrets/nick-cambodia-bot.env by load-secrets.js. Never written in code.
require('./load-secrets.js');
const fs = require('fs');
const path = require('path');
const { createBot } = require('./bot.js');
const { makeLoader, makeWebsiteLoader, combine } = require('./engines/listings.js');

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token || !/^\d{6,12}:[A-Za-z0-9_-]{30,}$/.test(token)) {
  console.error('\nThe bot token is missing or not valid.\nOpen this private file and paste the token after TELEGRAM_BOT_TOKEN=\n  ~/.phc-secrets/nick-cambodia-bot.env\nThen start the bot again.\n');
  process.exit(1);
}
let boundaries = null;
try { boundaries = JSON.parse(fs.readFileSync(path.join(__dirname, 'config', 'boundaries.json'), 'utf8')); } catch (e) { boundaries = null; }
let places = null;
try { places = JSON.parse(fs.readFileSync(path.join(__dirname, 'config', 'places.json'), 'utf8')); } catch (e) { places = null; } // from Nick's map, see tools/import-map.cjs
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

// What Nick decided about each listing (Available / Not available) and who asked, kept in one small file next to the client store.
const STATE_FILE = path.join(__dirname, 'data', 'listing-state.json');
let lstate = {};
try { lstate = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); } catch (e) { lstate = {}; }
function persistState() { const tmp = STATE_FILE + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(lstate)); fs.renameSync(tmp, STATE_FILE); }
const listingState = { get: (k) => lstate[k], set: (k, v) => { lstate[k] = v; persistState(); }, delete: (k) => { delete lstate[k]; persistState(); } };

const ALERT_FILE = path.join(__dirname, 'data', 'alerts.json');
let astate = {};
try { astate = JSON.parse(fs.readFileSync(ALERT_FILE, 'utf8')); } catch (e) { astate = {}; }
function persistAlerts() { const tmp = ALERT_FILE + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(astate)); fs.renameSync(tmp, ALERT_FILE); }
const alertStore = { get: (k) => astate[String(k)], set: (k, v) => { astate[String(k)] = v; persistAlerts(); }, delete: (k) => { delete astate[String(k)]; persistAlerts(); }, all: () => Object.keys(astate).map((k) => astate[k]) };

// Nick's own second Telegram accounts (data/testers.json, a list of ids). They see Preview listings like Nick does, nobody else does.
let testerIds = [];
try { testerIds = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'testers.json'), 'utf8')); } catch (e) { testerIds = []; }

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

// Listings: a published-CSV link of the Sheet (LISTINGS_CSV_URL), else the local file data/listings.csv. Nothing is shown until Nick marks rows live and approved.
const listingsSource = process.env.LISTINGS_CSV_URL || path.join(__dirname, 'data', 'listings.csv');
// The website feed: Active projects and units from propertyhubcambodia.com (public data, no key). Set WEBSITE_LISTINGS_URL=off to disable.
const websiteFeed = process.env.WEBSITE_LISTINGS_URL === 'off' ? '' : (process.env.WEBSITE_LISTINGS_URL || 'https://www.propertyhubcambodia.com/api/bot-listings');
const bot = createBot({ api, store, flow, nickId: NICK_ID, listingState, alertStore, testerIds, getListings: combine(makeLoader(listingsSource, 300000, places), makeWebsiteLoader(websiteFeed, 300000, { photos: process.env.SHOW_WEBSITE_PHOTOS === '1', places, boundaries })), onError: (e) => console.error('Handler error:', e.message) });

async function setupProfile() {
  const cmds = {
    jp: [['start', 'メインメニュー'], ['buy', '購入物件を探す'], ['rent', '賃貸物件を探す'], ['tour', '内覧を予約する'], ['estimate', '手取りを計算する'], ['nick', 'Nickに相談する'], ['stop', '新着通知を停止する']],
    en: [['start', 'Main menu'], ['buy', 'Find a property to buy'], ['rent', 'Find a place to rent'], ['tour', 'Book a tour'], ['estimate', 'Estimate with my numbers'], ['nick', 'Talk to Nick'], ['stop', 'Stop new listing alerts']],
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
  // Alerts are checked every 10 minutes; the bot itself keeps to one message a day and to 9:00 to 21:00 Japan time.
  setInterval(() => bot.runAlerts().catch((e) => console.error('Alert error:', e.message)), 10 * 60 * 1000);
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
