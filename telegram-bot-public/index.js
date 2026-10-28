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
  all: () => Object.keys(users).map((k) => users[k]),
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

// Phase 2 agent area: who the agents are, the units they submitted, and the channels approved units are posted to.
const AGENT_FILE = path.join(__dirname, 'data', 'agents.json');
let ad = { agents: {}, units: {}, seq: 0 };
try { ad = Object.assign(ad, JSON.parse(fs.readFileSync(AGENT_FILE, 'utf8'))); } catch (e) { /* first run */ }
function persistAgents() { const tmp = AGENT_FILE + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(ad)); fs.renameSync(tmp, AGENT_FILE); }
const agentData = {
  getAgent: (k) => ad.agents[String(k)], setAgent: (k, v) => { ad.agents[String(k)] = v; persistAgents(); }, deleteAgent: (k) => { delete ad.agents[String(k)]; persistAgents(); }, allAgents: () => Object.keys(ad.agents).map((k) => ad.agents[k]),
  getUnit: (k) => ad.units[k], setUnit: (k, v) => { ad.units[k] = v; persistAgents(); }, allUnits: () => Object.keys(ad.units).map((k) => ad.units[k]), nextSeq: () => { ad.seq += 1; persistAgents(); return ad.seq; },
};
let channels = [];
try { channels = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'channels.json'), 'utf8')); } catch (e) { channels = []; } // [{ "chat": "@Nick_Cambodia", "mode": "auto" | "confirm", "lang": "jp" | "en" }]

// The guide PDFs Nick sent to the bot (/setguide): Telegram file ids, so a big report needs no public link.
const GUIDE_FILE = path.join(__dirname, 'data', 'guides.json');
let gd = {};
try { gd = JSON.parse(fs.readFileSync(GUIDE_FILE, 'utf8')); } catch (e) { gd = {}; }
const guideStore = { get: (k) => gd[k], set: (k, v) => { gd[k] = v; const tmp = GUIDE_FILE + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(gd)); fs.renameSync(tmp, GUIDE_FILE); } };

// Counts of what happened (new clients, searches, asks, replies ...) for the Monday numbers. Kept to the last 30000 events.
const EVENTS_FILE = path.join(__dirname, 'data', 'events.json');
let evlist = [];
try { evlist = JSON.parse(fs.readFileSync(EVENTS_FILE, 'utf8')); } catch (e) { evlist = []; }
const eventStore = {
  add: (e) => { evlist.push(e); if (evlist.length > 30000) evlist = evlist.slice(-30000); try { const tmp = EVENTS_FILE + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(evlist)); fs.renameSync(tmp, EVENTS_FILE); } catch (err) { /* counting must never stop the bot */ } },
  since: (t) => evlist.filter((e) => e.t >= t),
};

async function api(method, body) {
  try {
    const r = await fetch('https://api.telegram.org/bot' + token + '/' + method, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const j = await r.json();
    if (!j.ok && /Conflict/i.test(j.description || '')) console.error('Another copy of this bot is already running with the same token. Stop one of them (only one may run at a time).');
    else if (!j.ok && !/message is not modified/i.test(j.description || '')) console.error('Telegram error on ' + method + ': ' + (j.description || 'unknown'));
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
const { createTranslator } = require('./engines/translate.js');
const translate = createTranslator({ url: process.env.TRANSLATE_URL, key: process.env.TRANSLATE_KEY });
console.log('Translator for unknown lines: ' + (translate ? 'on' : 'off (set TRANSLATE_URL and TRANSLATE_KEY to switch it on)'));
// The PHC CRM: clients who show real interest become rows in the Leads tab (bot key, set by deploy/crm/setup-crm.sh)
const { createCrm } = require('./engines/crm.js');
const crm = createCrm({ url: process.env.CRM_URL, key: process.env.CRM_KEY, onError: (e) => console.error(e.message) });
console.log('PHC CRM link: ' + (crm ? 'on' : 'off (run deploy/crm/setup-crm.sh to switch it on)'));
const bot = createBot({ api, translate, crm, guideStore, store, flow, nickId: NICK_ID, listingState, alertStore, testerIds, agentData, channels, places, events: eventStore, botUsername: process.env.BOT_USERNAME || 'Nick_Cambodia_Bot', isPrivate: () => { try { return JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'mode.json'), 'utf8')).private === true; } catch (e) { return false; } }, getListings: combine(makeLoader(listingsSource, 300000, places), makeWebsiteLoader(websiteFeed, 300000, { photos: process.env.SHOW_WEBSITE_PHOTOS === '1', places, boundaries })), onError: (e) => console.error('Handler error:', e.message) });

async function setupProfile() {
  // the default follows the Telegram app language; a client who picks a language in the bot gets that list for their chat
  const { commandList, MENU_V } = require('./bot.js');
  await api('setMyCommands', { commands: commandList('jp') });
  await api('setMyCommands', { commands: commandList('en'), language_code: 'en' });
  await api('setMyCommands', { commands: commandList('jp'), language_code: 'ja' });
  // clients who picked a language before this existed: give each their own list once
  const langs = {};
  try { for (const x of store.all ? store.all() : []) if (x && x.id && x.lang && x.menuV !== MENU_V) langs[x.id] = x.lang; } catch (e) {}
  for (const [id, lang] of Object.entries(langs)) {
    // tried once only, so a client who blocked the bot does not log an error on every start
    await api('setMyCommands', { commands: commandList(lang), scope: { type: 'chat', chat_id: Number(id) } });
    const x = store.get(id); if (x) { x.menuV = MENU_V; delete x.menuSet; store.set(id, x); }
  }
}

async function run() {
  const me = await api('getMe', {});
  console.log('Nick Cambodia bot started as @' + (me.result && me.result.username) + '');
  await setupProfile();
  // Tell Nick where the bot is running each time it starts, so he knows whether the hosted copy or his Mac is answering.
  if (NICK_ID) await api('sendMessage', { chat_id: NICK_ID, text: 'Bot started on ' + require('os').hostname() + ' (@' + ((me.result && me.result.username) || '?') + ').' });
  // Alerts are checked every 10 minutes; the bot itself keeps to one message a day and to 9:00 to 21:00 Japan time.
  setInterval(() => bot.runOps().catch((e) => console.error('Ops error:', e.message)), 10 * 60 * 1000);
  setInterval(() => bot.runAgentChecks().catch((e) => console.error('Agent check error:', e.message)), 10 * 60 * 1000);
  setInterval(() => bot.runAlerts().catch((e) => console.error('Alert error:', e.message)), 10 * 60 * 1000);
  let offset = 0;
  for (;;) {
    const r = await api('getUpdates', { offset, timeout: 30, allowed_updates: ['message', 'callback_query', 'channel_post'] }); // channel_post: Nick's own listings in a watched channel
    if (!r.ok) { await new Promise((s) => setTimeout(s, 3000)); continue; }
    for (const u of r.result) {
      offset = u.update_id + 1;
      await bot.handleUpdate(u);
    }
  }
}
run();
