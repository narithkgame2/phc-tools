// ═══════════════════════════════════════════════════════════════
//  SHOWCASE MODE TEST SUITE: @Nick_Cambodia_Bot Engine in Staging
//  Verifies:
//  1. Unit submission by agent (photos, description, Done, Submit)
//  2. Nick approves unit and posts to test channel -1004372846355
//  3. SOLD command edits channel post with 🔴 成約済
//  4. /showcase enters showcase mode
//  5. Deep link /start REF enters showcase mode and loads unit
//  6. REAKH button (menu_...) is not captured and reaches REAKH bot
//  7. /exit command leaves showcase mode and returns REAKH menu
//  8. Callback prefix isolation: xx: vs REAKH prefixes
// ═══════════════════════════════════════════════════════════════

const assert = require('assert');
const showcase = require('../engines/showcase.js');

let passed = 0;
let total = 0;

async function t(name, fn) {
  total++;
  try {
    await fn();
    passed++;
    console.log(`  ✅ Test ${total}: ${name}`);
  } catch (e) {
    console.error(`  ❌ Test ${total} FAILED: ${name}\n     ${e.message}`);
    throw e;
  }
}

const NICK = 353195979;
const AGENT = 700001;
const CLIENT = 800001;
const TEST_CHANNEL = '-1004372846355';
const T0 = Date.parse('2026-10-26T03:00:00Z');

const places = {
  places: [
    { name: 'Time Square 5 (306) - BKK1', khan: 'Boeng Keng Kang', sangkat: 'Boeung Keng Kang 1 (BKK1)', area: 'BKK1' }
  ]
};

const CHANNELS = [
  { chat: TEST_CHANNEL, mode: 'confirm', lang: 'jp', phone: '096 96 61 555' }
];

const POST = 'Time Square 5, 1 bedroom corner unit. 32 sqm net / 41 sqm gross. Floor 15. Selling price $82,000. BKK1';

function createTestRig() {
  const sent = [];
  const db = {};
  const ag = {};
  const un = {};
  let seq = 0;
  let time = T0;

  const api = async (method, body) => {
    sent.push({ method, body });
    return { ok: true, result: { message_id: sent.length + 100 } };
  };

  const store = {
    get: (k) => db[String(k)],
    set: (k, v) => { db[String(k)] = JSON.parse(JSON.stringify(v)); },
    delete: (k) => { delete db[String(k)]; },
    all: () => Object.keys(db).map((k) => db[k])
  };

  const agentData = {
    getAgent: (k) => ag[String(k)],
    setAgent: (k, v) => { ag[String(k)] = JSON.parse(JSON.stringify(v)); },
    deleteAgent: (k) => { delete ag[String(k)]; },
    allAgents: () => Object.keys(ag).map((k) => ag[k]),
    getUnit: (k) => (un[k] ? JSON.parse(JSON.stringify(un[k])) : undefined),
    setUnit: (k, v) => { un[k] = JSON.parse(JSON.stringify(v)); },
    allUnits: () => Object.keys(un).map((k) => JSON.parse(JSON.stringify(un[k]))),
    nextSeq: () => ++seq
  };

  const bot = showcase.createShowcaseEngine(api, {
    store,
    agentData,
    channels: CHANNELS,
    places,
    getListings: async () => [],
    now: () => time,
    translate: null,
    nickId: String(NICK)
  });

  const user = (id, lang, username) => ({ id, first_name: 'U' + id, language_code: lang || 'en', username });
  const msg = (id, extra) => bot.handleUpdate({ update_id: 1, message: Object.assign({ message_id: 2, chat: { id, type: 'private' }, from: user(id, 'en') }, extra) });
  const say = (id, text) => msg(id, { text });
  const photo = (id, fileId, group, caption) => msg(id, { photo: [{ file_id: 's_' + fileId }, { file_id: fileId }], media_group_id: group, caption });
  const video = (id, fileId) => msg(id, { video: { file_id: fileId } });
  const cb = (id, data, lang) => bot.handleUpdate({ update_id: 2, callback_query: { id: 'c', from: user(id, lang), data, message: { message_id: 5, chat: { id, type: 'private' } } } });

  const to = (id) => sent.filter((s) => String(s.body.chat_id) === String(id));
  const texts = (id) => to(id).map((s) => s.body.text || s.body.caption || '').filter(Boolean);
  const labels = (m) => (m && m.body && m.body.reply_markup ? m.body.reply_markup.inline_keyboard.flat().map((b) => b.text) : []);
  const last = (id) => to(id).filter((s) => s.method === 'sendMessage').pop();

  return {
    sent,
    bot,
    agentData,
    say,
    photo,
    video,
    cb,
    to,
    texts,
    labels,
    last,
    user,
    units: () => agentData.allUnits()
  };
}

(async () => {
  console.log('\n=======================================================');
  console.log('🚀 RUNNING SHOWCASE MODE TEST SUITE');
  console.log('=======================================================\n');

  await t('1. Showcase callback and prefix isolation', async () => {
    // Showcase shape: ^[a-zA-Z]{1,4}:
    assert.strictEqual(showcase.isShowcaseCallback('g:1'), true);
    assert.strictEqual(showcase.isShowcaseCallback('m:main'), true);
    assert.strictEqual(showcase.isShowcaseCallback('ua:TS5-6001'), true);
    assert.strictEqual(showcase.isShowcaseCallback('uc:TS5-6001:0'), true);
    assert.strictEqual(showcase.isShowcaseCallback('aw:submit'), true);
    assert.strictEqual(showcase.isShowcaseCallback('cmp:add'), true);

    // REAKH buttons: must NEVER match showcase callback
    assert.strictEqual(showcase.isShowcaseCallback('menu_main'), false);
    assert.strictEqual(showcase.isShowcaseCallback('btn_explore_prop'), false);
    assert.strictEqual(showcase.isShowcaseCallback('srch_step1_sale'), false);
    assert.strictEqual(showcase.isShowcaseCallback('admin_sold_ts7_A1'), false);
    assert.strictEqual(showcase.isShowcaseCallback('owner_start_wizard'), false);
    assert.strictEqual(showcase.isShowcaseCallback(''), false);
    assert.strictEqual(showcase.isShowcaseCallback(null), false);
  });

  await t('2. Submit showcase unit: photos, intake, and submission for approval', async () => {
    const r = createTestRig();

    // Nick adds Dara as agent
    await r.say(NICK, `/addagent ${AGENT} Dara`);
    assert.strictEqual(r.agentData.allAgents().length, 1);

    // Agent Dara submits photos and post description
    await r.photo(AGENT, 'P1', 'g1', POST);
    await r.photo(AGENT, 'P2', 'g1');
    await r.video(AGENT, 'V1');
    await r.cb(AGENT, 'aw:collectdone');
    await r.cb(AGENT, 'aw:submit');

    // Unit TS5-6001 should be pending
    const units = r.units();
    assert.strictEqual(units.length, 1);
    assert.strictEqual(units[0].ref, 'TS5-6001');
    assert.strictEqual(units[0].status, 'pending');

    // Nick should have received approval card
    const nickApproval = r.last(NICK);
    assert.ok(nickApproval, 'Nick received approval card');
    assert.ok(/TS5-6001/.test(nickApproval.body.text), 'Approval card references unit TS5-6001');
    assert.deepStrictEqual(r.labels(nickApproval), ['Approve', 'Reject']);
  });

  await t('3. Approve unit and post to test channel -1004372846355', async () => {
    const r = createTestRig();
    await r.say(NICK, `/addagent ${AGENT} Dara`);
    await r.photo(AGENT, 'P1', 'g1', POST);
    await r.photo(AGENT, 'P2', 'g1');
    await r.cb(AGENT, 'aw:collectdone');
    await r.cb(AGENT, 'aw:submit');

    // Nick approves
    await r.cb(NICK, 'ua:TS5-6001');
    assert.strictEqual(r.units()[0].status, 'active');

    // Nick taps "Also post to -1004372846355" (channel index 0)
    await r.cb(NICK, 'uc:TS5-6001:0');

    // Channel -1004372846355 receives the album and message
    const channelSent = r.to(TEST_CHANNEL);
    assert.ok(channelSent.length >= 2, 'Channel received album and text card');
    const album = channelSent.find((s) => s.method === 'sendMediaGroup');
    assert.ok(album, 'Channel received photo album');
    const card = channelSent.find((s) => s.method === 'sendMessage');
    assert.ok(card, 'Channel received message card');
    assert.ok(/#売出中 \$82,000/.test(card.body.text), 'Card contains Japanese title');
  });

  await t('4. Status change: SOLD edits channel post with 🔴 成約済', async () => {
    const r = createTestRig();
    await r.say(NICK, `/addagent ${AGENT} Dara`);
    await r.photo(AGENT, 'P1', 'g1', POST);
    await r.photo(AGENT, 'P2', 'g1');
    await r.cb(AGENT, 'aw:collectdone');
    await r.cb(AGENT, 'aw:submit');
    await r.cb(NICK, 'ua:TS5-6001');
    await r.cb(NICK, 'uc:TS5-6001:0');

    // Agent marks unit SOLD
    await r.say(AGENT, 'SOLD TS5-6001');
    assert.strictEqual(r.units()[0].status, 'sold');

    // Channel post was edited
    const channelEdits = r.sent.filter((s) => String(s.body.chat_id) === TEST_CHANNEL && s.method === 'editMessageText');
    assert.ok(channelEdits.length > 0, 'Channel message was edited after SOLD');
    const editedText = channelEdits[0].body.text;
    assert.ok(/成約済/.test(editedText), `Edited post carries 成約済: ${editedText.slice(0, 50)}`);
  });

  await t('5. Full router: /showcase switches mode and passes /start to engine', async () => {
    const r = createTestRig();
    const userShowcaseMode = {};
    let saved = false;

    const update = {
      update_id: 101,
      message: {
        message_id: 1,
        chat: { id: CLIENT, type: 'private' },
        from: { id: CLIENT, first_name: 'Tester' },
        text: '/showcase'
      }
    };

    const res = await showcase.handleShowcaseRoute(update, {
      showcaseEngine: r.bot,
      userShowcaseMode,
      saveState: () => { saved = true; },
      getMainMenu: () => ({ text: 'REAKH Menu', reply_markup: {} })
    });

    assert.strictEqual(res.handled, true);
    assert.strictEqual(res.action, 'showcase_enter');
    assert.strictEqual(userShowcaseMode[CLIENT], true, 'User is now marked in showcase mode');
    assert.strictEqual(saved, true, 'State was saved');

    // Bot engine handled /start: sent Japanese language / main menu selection
    assert.ok(r.to(CLIENT).length > 0, 'Showcase engine responded to /start');
  });

  await t('6. Full router: /exit command leaves showcase mode and returns REAKH menu', async () => {
    const r = createTestRig();
    const userShowcaseMode = { [CLIENT]: true };
    let saved = false;
    let sentToChat = null;
    let sentText = null;

    const update = {
      update_id: 102,
      message: {
        message_id: 2,
        chat: { id: CLIENT, type: 'private' },
        from: { id: CLIENT, first_name: 'Tester' },
        text: '/exit'
      }
    };

    const res = await showcase.handleShowcaseRoute(update, {
      showcaseEngine: r.bot,
      userShowcaseMode,
      userLanguages: { [CLIENT]: 'EN' },
      saveState: () => { saved = true; },
      getMainMenu: (lang, name) => ({ text: `Main menu for ${name}`, reply_markup: { inline_keyboard: [] } }),
      sendTelegramMessage: async (chatId, text, markup) => {
        sentToChat = chatId;
        sentText = text;
      }
    });

    assert.strictEqual(res.handled, true);
    assert.strictEqual(res.action, 'exit');
    assert.strictEqual(userShowcaseMode[CLIENT], undefined, 'User exited showcase mode');
    assert.strictEqual(saved, true, 'State was saved');
    assert.strictEqual(sentToChat, CLIENT);
    assert.ok(/Exited Showcase Mode/.test(sentText), 'Confirmation of exit delivered');
    assert.ok(/Main menu for Tester/.test(sentText), 'REAKH main menu attached');
  });

  await t('7. Full router: Deep link /start REF enters showcase mode', async () => {
    const r = createTestRig();
    // Add active unit to agentData
    r.agentData.setUnit('TS5-6001', { ref: 'TS5-6001', price: 82000, status: 'active', project: 'Time Square 5' });

    const userShowcaseMode = {};
    const update = {
      update_id: 103,
      message: {
        message_id: 3,
        chat: { id: CLIENT, type: 'private' },
        from: { id: CLIENT, first_name: 'Tester' },
        text: '/start TS5-6001'
      }
    };

    const res = await showcase.handleShowcaseRoute(update, {
      showcaseEngine: r.bot,
      userShowcaseMode,
      agentData: r.agentData,
      saveState: () => {}
    });

    assert.strictEqual(res.handled, true);
    assert.strictEqual(res.action, 'showcase_deeplink');
    assert.strictEqual(userShowcaseMode[CLIENT], true, 'User entered showcase mode via deep link');
  });

  await t('8. Full router: REAKH button callback passes through unhandled (reakh_callback)', async () => {
    const r = createTestRig();
    const userShowcaseMode = { [CLIENT]: true };

    const update = {
      update_id: 104,
      callback_query: {
        id: 'cb_test',
        from: { id: CLIENT, first_name: 'Tester' },
        data: 'menu_main',
        message: { message_id: 10, chat: { id: CLIENT, type: 'private' } }
      }
    };

    const res = await showcase.handleShowcaseRoute(update, {
      showcaseEngine: r.bot,
      userShowcaseMode
    });

    assert.strictEqual(res.handled, false, 'REAKH button callback must NOT be handled by showcase');
    assert.strictEqual(res.action, 'reakh_callback');
  });

  console.log(`\n=======================================================`);
  console.log(`🎉 ALL ${passed}/${total} SHOWCASE TESTS PASSED PERFECTLY!`);
  console.log(`=======================================================\n`);
})();
