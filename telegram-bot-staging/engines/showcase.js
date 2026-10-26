// Showcase mode: the full @Nick_Cambodia_Bot engine inside @Nick_REAKH_Bot, with its own data files.
const fs = require('fs');
const path = require('path');

const PUB = path.join(__dirname, '..', '..', 'telegram-bot-public');
const { createBot } = require(path.join(PUB, 'bot.js'));
const { makeWebsiteLoader, combine } = require(path.join(PUB, 'engines', 'listings.js'));
const { createTranslator } = require(path.join(PUB, 'engines', 'translate.js'));

const DIR = path.join(__dirname, '..', 'data', 'showcase');
fs.mkdirSync(DIR, { recursive: true });

const readJson = (f, d) => {
  try {
    return JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8'));
  } catch (e) {
    return d;
  }
};

const writeJson = (f, v) => {
  const p = path.join(DIR, f);
  fs.writeFileSync(p + '.tmp', JSON.stringify(v));
  fs.renameSync(p + '.tmp', p);
};

function fileStore(f) {
  let o = readJson(f, {});
  return {
    get: (k) => o[String(k)],
    set: (k, v) => { o[String(k)] = v; writeJson(f, o); },
    delete: (k) => { delete o[String(k)]; writeJson(f, o); },
    all: () => Object.values(o)
  };
}

// 1. Users / client session store
const store = fileStore('users.json');

// 2. Listing decisions store (Available / Not available)
const listingState = fileStore('listing-state.json');

// 3. Client search alerts store
const alertStore = fileStore('alerts.json');

// 4. Agent data (agents, units, sequential counter)
let ad = Object.assign({ agents: {}, units: {}, seq: 0 }, readJson('agents.json', {}));
function persistAgents() {
  writeJson('agents.json', ad);
}
const agentData = {
  getAgent: (k) => ad.agents[String(k)],
  setAgent: (k, v) => { ad.agents[String(k)] = v; persistAgents(); },
  deleteAgent: (k) => { delete ad.agents[String(k)]; persistAgents(); },
  allAgents: () => Object.keys(ad.agents).map((k) => ad.agents[k]),
  getUnit: (k) => ad.units[k],
  setUnit: (k, v) => { ad.units[k] = v; persistAgents(); },
  allUnits: () => Object.keys(ad.units).map((k) => ad.units[k]),
  nextSeq: () => { ad.seq += 1; persistAgents(); return ad.seq; }
};

// 5. Channels: default to Nick Test Lab (-1004372846355) if not yet configured
let defaultChannels = [
  { chat: '-1004372846355', mode: 'confirm', lang: 'jp', phone: '096 96 61 555' }
];
let channels = readJson('channels.json', null);
if (!channels) {
  channels = defaultChannels;
  writeJson('channels.json', channels);
}

// 6. Events store for operational counting
let evlist = readJson('events.json', []);
const events = {
  add: (e) => {
    evlist.push(e);
    if (evlist.length > 30000) evlist = evlist.slice(-30000);
    try { writeJson('events.json', evlist); } catch (err) {}
  },
  since: (t) => evlist.filter((e) => e.t >= t)
};

// 7. Config files from telegram-bot-public
let places = null;
try { places = JSON.parse(fs.readFileSync(path.join(PUB, 'config', 'places.json'), 'utf8')); } catch (e) { places = null; }

let boundaries = null;
try { boundaries = JSON.parse(fs.readFileSync(path.join(PUB, 'config', 'boundaries.json'), 'utf8')); } catch (e) { boundaries = null; }

let flow = null;
try { flow = JSON.parse(fs.readFileSync(path.join(PUB, 'config', 'flow.json'), 'utf8')); } catch (e) { flow = {}; }

// 8. Listings loader: website feed + agent units handled inside createBot
const websiteFeed = process.env.WEBSITE_LISTINGS_URL === 'off' ? '' : (process.env.WEBSITE_LISTINGS_URL || 'https://www.propertyhubcambodia.com/api/bot-listings');
const getListings = combine(makeWebsiteLoader(websiteFeed, 300000, { photos: false, places, boundaries }));

// 9. Translator setup
const translate = createTranslator({ url: process.env.TRANSLATE_URL, key: process.env.TRANSLATE_KEY });

function createShowcaseEngine(customApi, options = {}) {
  const activeApi = customApi;
  const activeChannels = options.channels || channels;
  const activeGetListings = options.getListings || getListings;
  const activeNow = options.now;

  const bot = createBot({
    api: activeApi,
    store: options.store || store,
    flow: options.flow || flow,
    nickId: String(options.nickId || '353195979'),
    listingState: options.listingState || listingState,
    alertStore: options.alertStore || alertStore,
    testerIds: options.testerIds || [],
    isPrivate: () => false,
    agentData: options.agentData || agentData,
    channels: activeChannels,
    places: options.places || places,
    events: options.events || events,
    botUsername: options.botUsername || 'Nick_REAKH_Bot',
    getListings: activeGetListings,
    translate: options.translate !== undefined ? options.translate : translate,
    now: activeNow,
    onError: (e) => console.error('[Showcase Error]:', e.message)
  });

  return bot;
}

// Check if a unit REF exists in showcase agentData
function isShowcaseUnit(ref) {
  if (!ref) return false;
  return Boolean(agentData.getUnit(ref));
}

// Check if callback_data matches the showcase engine's shape (xx: or xxx:)
function isShowcaseCallback(data) {
  if (typeof data !== 'string') return false;
  return /^[a-zA-Z]{1,4}:/.test(data);
}

// Router function to cleanly handle showcase mode updates
async function handleShowcaseRoute(update, ctx = {}) {
  const engine = ctx.showcaseEngine;
  const userMode = ctx.userShowcaseMode || {};

  // 1. Showcase inline button callbacks (shape: xx: or xxx:)
  if (update.callback_query && update.callback_query.data) {
    if (isShowcaseCallback(update.callback_query.data)) {
      if (engine) await engine.handleUpdate(update);
      return { handled: true, action: 'showcase_callback' };
    }
    // Any callback not matching xx: / xxx: (e.g. menu_..., srch_..., admin_...) falls through to REAKH bot
    return { handled: false, action: 'reakh_callback' };
  }

  // 2. Message / command routing
  if (update.message) {
    const msg = update.message;
    const chatId = msg.chat ? msg.chat.id : null;
    const userId = msg.from ? msg.from.id : chatId;
    const text = (msg.text || msg.caption || '').trim();

    // /exit command: switch back to normal REAKH menu
    if (text === '/exit') {
      delete userMode[chatId];
      delete userMode[userId];
      if (typeof ctx.saveState === 'function') ctx.saveState();
      const userLang = (ctx.userLanguages && ctx.userLanguages[chatId]) || 'EN';
      const senderName = (msg.from && msg.from.first_name) || 'Valued Client';
      if (typeof ctx.sendTelegramMessage === 'function' && typeof ctx.getMainMenu === 'function') {
        const menu = ctx.getMainMenu(userLang, senderName);
        const exitPrefix = userLang === 'JP'
          ? '🔙 <b>展示モード（Showcase）を終了し、通常モードに戻りました。</b>\n\n'
          : '🔙 <b>Exited Showcase Mode. Returned to Realestate.com.kh desk.</b>\n\n';
        await ctx.sendTelegramMessage(chatId, exitPrefix + menu.text, menu.reply_markup);
      }
      return { handled: true, action: 'exit' };
    }

    // /showcase command: enter showcase mode and launch engine (/start)
    if (text === '/showcase') {
      userMode[chatId] = true;
      userMode[userId] = true;
      if (typeof ctx.saveState === 'function') ctx.saveState();
      if (engine) {
        const showcaseStartUpdate = {
          ...update,
          message: { ...msg, text: '/start' }
        };
        await engine.handleUpdate(showcaseStartUpdate);
      }
      return { handled: true, action: 'showcase_enter' };
    }

    // Deep link /start REF: if REF is a showcase unit, enter showcase mode and pass on
    if (text.startsWith('/start ')) {
      const param = text.slice(7).trim();
      const hasUnit = (ctx.agentData && ctx.agentData.getUnit(param)) || isShowcaseUnit(param);
      if (hasUnit) {
        userMode[chatId] = true;
        userMode[userId] = true;
        if (typeof ctx.saveState === 'function') ctx.saveState();
        if (engine) await engine.handleUpdate(update);
        return { handled: true, action: 'showcase_deeplink' };
      }
    }

    // If user is currently in showcase mode: all messages and media go to showcase engine
    if (userMode[chatId] || userMode[userId]) {
      if (engine) await engine.handleUpdate(update);
      return { handled: true, action: 'showcase_message' };
    }
  }

  return { handled: false };
}

module.exports = {
  createShowcaseEngine,
  handleShowcaseRoute,
  isShowcaseUnit,
  isShowcaseCallback,
  store,
  listingState,
  alertStore,
  agentData,
  channels,
  events,
  DIR
};
