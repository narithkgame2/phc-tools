// @Nick_Cambodia_Bot backup (lite mode). Runs in Google Apps Script and answers clients only while the Mac is off.
//
// How it works
// - The Mac copy of the bot (index.js) tells this script every minute that it is alive (doPost a=sync). With that it sends
//   its screens (config/flow.json), its texts (MSG in bot.js) and each client's language whenever they change. So the backup
//   answers with the same screens, words, buttons and language as the Mac, without a second copy of anything to keep in step.
// - watchdog() runs every minute. When the Mac has been silent for 3 minutes, it points Telegram at this script (setWebhook).
//   When the Mac starts again it removes that link itself (deleteWebhook) and polls as usual. Only one of them answers at a time.
// - What needs the Mac (listings, photos, compare, alerts, the PHC CRM) is kept in a short list and finished by the Mac when it
//   is back (bot.replay in bot.js). The client sees the same answer as on the Mac, and the listings follow later.
//
// Script properties Nick sets by hand (Project Settings > Script properties): TELEGRAM_BOT_TOKEN and BACKUP_KEY.
// Never write the token or the key in this file. Everything else is written by the script itself.
// Tests: node tests/backup.test.js (runs this file against fake Google services and compares every screen with the Mac bot).

var STALE_MS = 3 * 60 * 1000; // the Mac has been silent this long: the backup starts answering
var BACKOFF_MS = 10 * 60 * 1000; // the Mac removed the backup's link although its beats do not reach us: wait before trying again
var CHUNK = 8000; // script properties hold at most 9 KB per value
var LANGS = ['jp', 'en', 'kh'];
var LANG_BUTTONS = ['en', 'jp', 'kh']; // order of the buttons on the language screen (engines/render.js)
var ADMIN_TEXT = 'The Mac is off, so the backup is answering and this needs the Mac. Send it again when I tell you the Mac is back.';

// ---------- storage ----------
function props_() { return PropertiesService.getScriptProperties(); }
// JSON with every non-ASCII character escaped, so one chunk of 8,000 characters is never more than 8,000 bytes
function ascii_(s) { return s.replace(/[\u007f-￿]/g, function (c) { return '\\u' + ('0000' + c.charCodeAt(0).toString(16)).slice(-4); }); }
function getBig_(all, name) {
  var n = Number(all[name + '_n'] || 0), out = '';
  for (var i = 0; i < n; i++) out += all[name + '_' + i] || '';
  return out;
}
function putBig_(all, name, obj) {
  var s = ascii_(JSON.stringify(obj)), set = {}, n = Math.ceil(s.length / CHUNK) || 1, old = Number(all[name + '_n'] || 0);
  for (var i = 0; i < n; i++) set[name + '_' + i] = s.slice(i * CHUNK, (i + 1) * CHUNK);
  set[name + '_n'] = String(n);
  props_().setProperties(set);
  for (var j = n; j < old; j++) props_().deleteProperty(name + '_' + j);
  Object.keys(set).forEach(function (k) { all[k] = set[k]; });
}
function parse_(s, dflt) { try { return s ? JSON.parse(s) : dflt; } catch (e) { return dflt; } }

// ---------- Telegram ----------
function tg_(ctx, method, body) {
  try {
    var r = UrlFetchApp.fetch('https://api.telegram.org/bot' + ctx.token + '/' + method,
      { method: 'post', contentType: 'application/json', payload: JSON.stringify(body), muteHttpExceptions: true });
    return parse_(r.getContentText(), { ok: false });
  } catch (e) { return { ok: false }; }
}

// ---------- screens: the same rules as engines/render.js ----------
function esc_(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function textOf_(step, lang) { var t = lang !== 'en' && step.tr && step.tr[lang] && step.tr[lang].t; return t || step.text; }
function labelOf_(step, i, lang) { var t = lang !== 'en' && step.tr && step.tr[lang] && step.tr[lang].b && step.tr[lang].b[i]; return t || step.buttons[i].l; }
function fill_(text, vars) { var out = text; Object.keys(vars || {}).forEach(function (k) { out = out.split('[' + k + ']').join(vars[k]); }); return out; }
function keyboard_(step, lang) {
  var rows = [], pending = null;
  step.buttons.forEach(function (b, i) {
    var label = labelOf_(step, i, lang);
    var btn = b.url ? { text: label, url: (b.urls && b.urls[lang]) || b.url } : { text: label, callback_data: (b.cb ? b.cb : step.id === 'start' ? 'l:' + LANG_BUTTONS[i] : 'g:' + step.id + ':' + i) };
    if (b.half) { if (pending) { rows.push([pending, btn]); pending = null; } else pending = btn; }
    else { if (pending) { rows.push([pending]); pending = null; } rows.push([btn]); }
  });
  if (pending) rows.push([pending]);
  return { inline_keyboard: rows };
}
function render_(step, lang, vars) { return { text: fill_(textOf_(step, lang), vars), parse_mode: 'HTML', reply_markup: keyboard_(step, lang), disable_web_page_preview: true }; }

// ---------- the request: one context per execution ----------
function context_() {
  var all = props_().getProperties();
  var cfg = parse_(getBig_(all, 'cfg'), null), live = parse_(getBig_(all, 'live'), {}) || {};
  var ctx = { all: all, token: all.TELEGRAM_BOT_TOKEN, cfg: cfg, live: live, byId: {}, delta: parse_(getBig_(all, 'delta'), { seq: 0, items: [] }), deltaDirty: false };
  if (cfg && cfg.flow) cfg.flow.steps.forEach(function (s) { ctx.byId[s.id] = s; });
  return ctx;
}
function finish_(ctx) { if (ctx.deltaDirty) putBig_(ctx.all, 'delta', ctx.delta); }
function queue_(ctx, item) {
  ctx.delta.seq += 1;
  item.s = ctx.delta.seq; item.at = new Date().toISOString();
  ctx.delta.items.push(item);
  if (ctx.delta.items.length > 300) ctx.delta.items = ctx.delta.items.slice(-300);
  ctx.deltaDirty = true;
}
function msg_(ctx, key, lang) { var m = ctx.cfg.msg[key] || {}; return m[lang] || m.en || ''; }
function isNick_(ctx, id) { return !!ctx.cfg.nickId && String(id) === String(ctx.cfg.nickId); }
function isTester_(ctx, id) { return (ctx.cfg.testers || []).map(String).indexOf(String(id)) >= 0; }
function contactUrl_(ctx, lang) { return (lang && lang !== 'jp' && ctx.cfg.flow.telegram) || ctx.cfg.flow.line; }
function nameOf_(from) { return [from.first_name, from.last_name].filter(Boolean).join(' ') || 'Client'; }
function fromOf_(from) { return { first_name: from.first_name || '', last_name: from.last_name || '', username: from.username || '' }; }

// a client: the backup's own record while it answers, else the language the Mac last sent
function user_(ctx, from) {
  var u = parse_(ctx.all['u_' + from.id], null);
  if (!u) { var lang = (ctx.live.langs || {})[String(from.id)] || null; u = { id: from.id, lang: lang, answers: {}, keys: {}, awaiting: null, known: !!lang }; }
  u.answers = u.answers || {}; u.keys = u.keys || {};
  return u;
}
function save_(ctx, u) { var s = JSON.stringify(u); ctx.all['u_' + u.id] = s; props_().setProperty('u_' + u.id, s); }
function setLang_(ctx, u, lang, from) { u.lang = lang; queue_(ctx, { k: 'lang', id: String(u.id), lang: lang, from: fromOf_(from) }); }

function noteInt_(u, k, v) { if (!v) return; u.int = u.int || {}; u.int[k] = (u.int[k] || []).filter(function (x) { return x !== v; }).concat([v]).slice(-5); }
function interestLines_(u) {
  var it = u.int || {}, out = [];
  if (it.from) out.push('Came from: ' + esc_(it.from));
  if (it.searches && it.searches.length) out.push('Searched: ' + esc_(it.searches.join(' | ')));
  if (it.faq && it.faq.length) out.push('Read: ' + esc_(it.faq.join(', ')));
  if (it.asks && it.asks.length) out.push('Asked about: ' + esc_(it.asks.join(', ')));
  if (it.guide) out.push('Guide sent: ' + esc_(it.guide));
  return out;
}
function summaryFor_(u, ids) { return ids.map(function (id) { return u.answers[id]; }).filter(Boolean).join(' · ') || '-'; }
function varsFor_(u, stepId) {
  var a = u.answers;
  if (stepId === 'bres') return { 'search summary': esc_(summaryFor_(u, ['b1', 'b2'])) };
  if (stepId === 'rres') return { 'search summary': esc_(summaryFor_(u, ['rr1', 'rr2'])) };
  if (stepId === 'tourok') return { day: esc_(a.tourday || '-'), time: esc_(a.tourtime || '-'), 'in person or video': esc_(a.tour || '-') };
  if (stepId === 'calc2') return u.calc || {};
  return {};
}
function clientLine_(from, id) { return 'Client: ' + esc_(nameOf_(from)) + (from.username ? ' (@' + esc_(from.username) + ')' : '') + ' (' + id + ')'; }
var TAG = ' <i>(backup answered, the Mac is off)</i>';
function tellNick_(ctx, text) { if (ctx.cfg.nickId) tg_(ctx, 'sendMessage', { chat_id: String(ctx.cfg.nickId), text: text, parse_mode: 'HTML', disable_web_page_preview: true }); }

function send_(ctx, chatId, u, step, vars, edit) {
  var lang = u.lang || 'jp', body = render_(step, lang, vars);
  var pic = step.photo && step.photo[lang];
  if (pic) {
    var photo = ctx.cfg.media + pic, short = body.text.replace(/<[^>]+>/g, '').length <= 1000;
    var r = short ? tg_(ctx, 'sendPhoto', { chat_id: chatId, photo: photo, caption: body.text, parse_mode: 'HTML', reply_markup: body.reply_markup })
      : tg_(ctx, 'sendPhoto', { chat_id: chatId, photo: photo });
    if (r && r.ok !== false) return short ? r : tg_(ctx, 'sendMessage', Object.assign({ chat_id: chatId }, body));
  }
  if (edit && edit.message_id) {
    var e = tg_(ctx, 'editMessageText', Object.assign({ chat_id: chatId, message_id: edit.message_id }, body));
    if (e && e.ok) return e;
  }
  return tg_(ctx, 'sendMessage', Object.assign({ chat_id: chatId }, body));
}

function notifyNick_(ctx, u, from, step) {
  if (!ctx.cfg.nickId || !step.notify || isNick_(ctx, u.id)) return;
  var lines = ['<b>' + esc_(step.notify) + '</b>' + TAG, clientLine_(from, u.id), 'Language: ' + String(u.lang || '-').toUpperCase()];
  var a = u.answers, det = [];
  function add(k, label) { if (a[k]) { lines.push(label + ': ' + esc_(a[k])); det.push(label.toLowerCase() + ' ' + a[k]); } }
  if (step.id === 'bres') { add('b1', 'Budget'); add('b2', 'District'); }
  if (step.id === 'rres') { add('rr1', 'Monthly budget'); add('rr2', 'District'); }
  if (step.id === 'leaddone') { add('lead1', 'Goal'); add('lead2', 'Timeline'); add('lead3', 'Reply by'); if (a.b1 || a.rr1) lines.push('Last search: ' + esc_(summaryFor_(u, a.rr1 ? ['rr1', 'rr2'] : ['b1', 'b2']))); }
  if (step.id === 'tourok') { add('tour', 'Tour'); add('tourday', 'Day'); add('tourtime', 'Time'); }
  lines.push.apply(lines, interestLines_(u));
  lines.push('Open chat: tg://user?id=' + u.id);
  tellNick_(ctx, lines.join('\n'));
  queue_(ctx, { k: 'crm', id: String(u.id), lang: u.lang, from: fromOf_(from), event: step.notify + (det.length ? ' (' + det.join(', ') + ')' : ''), int: u.int || {} });
}

function goto_(ctx, chatId, from, u, stepId, edit) {
  var byId = ctx.byId, step = byId[stepId] || byId.error;
  if (stepId === 'menu') { u.answers = {}; u.keys = {}; }
  if (step.id === 'bres') u.lastKind = 'buy'; else if (step.id === 'rres') u.lastKind = 'rent';
  if (step.id === 'bres' || step.id === 'rres') {
    noteInt_(u, 'searches', (step.id === 'bres' ? 'buy ' : 'rent ') + summaryFor_(u, step.id === 'bres' ? ['b1', 'b2'] : ['rr1', 'rr2']));
    if (step.id === 'bres' && u.keys && u.keys.b1) u.int.budget = u.keys.b1;
    // the Mac sends the matching listings when it is back (the screen already says Nick sends options within 1 business day)
    queue_(ctx, { k: 'search', id: String(u.id), lang: u.lang, from: fromOf_(from), kind: u.lastKind, keys: JSON.parse(JSON.stringify(u.keys)) });
  }
  if (/^faq[1-5]$/.test(step.id) && byId.faq) noteInt_(u, 'faq', (byId.faq.buttons.filter(function (b) { return b.to === step.id; })[0] || {}).l);
  if (step.id === 'leaddone' && u.keys && u.keys.lead2) { u.int = u.int || {}; u.int.timeline = u.keys.lead2; }
  u.awaiting = step.await || null;
  save_(ctx, u);
  send_(ctx, chatId, u, step, varsFor_(u, step.id), edit);
  notifyNick_(ctx, u, from, step);
  if (step.id === 'forgetdone') forget_(ctx, u.id);
}
function forget_(ctx, id) {
  props_().deleteProperty('u_' + id); delete ctx.all['u_' + id];
  ctx.delta.items = ctx.delta.items.filter(function (x) { return x.id !== String(id); }); // nothing about them goes to the Mac but the deletion
  if (ctx.live.langs && ctx.live.langs[String(id)]) { delete ctx.live.langs[String(id)]; putBig_(ctx.all, 'live', ctx.live); } // their language goes too, as on the Mac
  queue_(ctx, { k: 'forget', id: String(id) });
}

// the guide PDF: the one Nick sent to the bot (/setguide), else the built guide in the repository
function sendGuide_(ctx, chatId, from, u) {
  if (!u.lang) u.lang = 'jp';
  var first = !(u.int && u.int.guide);
  u.int = u.int || {}; u.int.guide = new Date().toISOString().slice(0, 10); save_(ctx, u);
  var lang = u.lang, own = (ctx.cfg.guides || {})[lang === 'jp' ? 'jp' : 'en'];
  var built = ctx.cfg.media + 'faq/' + (lang === 'jp' ? ctx.cfg.guide.jp : ctx.cfg.guide.en);
  var cap = own ? '<b>' + esc_(own.title) + '</b>\n' + msg_(ctx, 'guideAsk', lang) : msg_(ctx, 'guideCap', lang);
  var kb = { inline_keyboard: [[{ text: msg_(ctx, 'nickBtn', lang), url: contactUrl_(ctx, lang) }], [{ text: msg_(ctx, 'menuBtn', lang), callback_data: 'm:menu' }]] };
  var r = tg_(ctx, 'sendDocument', { chat_id: chatId, document: own ? own.fileId : built, caption: cap, parse_mode: 'HTML', reply_markup: kb });
  if (!r || r.ok === false) tg_(ctx, 'sendMessage', { chat_id: chatId, text: msg_(ctx, 'guideCap', lang) + '\n' + built, parse_mode: 'HTML', reply_markup: kb });
  if (isNick_(ctx, u.id) || !first) return;
  tellNick_(ctx, ['<b>Guide sent</b>' + TAG + (isTester_(ctx, u.id) ? ' <i>(tester account)</i>' : ''), clientLine_(from, u.id), 'Language: ' + String(lang).toUpperCase()]
    .concat(interestLines_(u).filter(function (x) { return !/^Guide sent/.test(x); }), ['Open chat: tg://user?id=' + u.id]).join('\n'));
  queue_(ctx, { k: 'crm', id: String(u.id), lang: lang, from: fromOf_(from), event: 'Guide sent (' + (lang === 'jp' ? 'Japanese' : 'English') + ' PDF)', int: u.int });
}
function guideLink_(ref) { return /^guide(_[a-z0-9]{1,20})?$/i.test(ref || ''); }
function openGuide_(ctx, chatId, from, u, ref) {
  var tag = (String(ref).match(/^guide_([a-z0-9]{1,20})$/i) || [])[1];
  if (!(u.int && u.int.from)) { u.int = u.int || {}; u.int.from = 'guide link' + (tag ? ' (' + tag.toLowerCase() + ')' : ''); }
  return sendGuide_(ctx, chatId, from, u);
}
// a unit link (?start=REF or sim_REF): the unit card needs the listings, so the Mac shows it when it is back
function openRef_(ctx, chatId, from, u, ref, sim) {
  if (!(u.int && u.int.from)) { u.int = u.int || {}; u.int.from = (sim ? 'channel post ' : 'unit link ') + ref; }
  save_(ctx, u);
  tg_(ctx, 'sendMessage', { chat_id: chatId, text: msg_(ctx, 'checkingMsg', u.lang), reply_markup: { inline_keyboard: [[{ text: msg_(ctx, 'menuBtn', u.lang), callback_data: 'm:menu' }]] } });
  queue_(ctx, { k: 'ref', id: String(u.id), lang: u.lang, from: fromOf_(from), ref: ref, sim: !!sim });
  if (!isNick_(ctx, u.id)) tellNick_(ctx, '<b>Unit link opened</b>' + TAG + '\n' + clientLine_(from, u.id) + '\nUnit: ' + esc_(ref) + '\nThe Mac shows them the unit when it is back.\nOpen chat: tg://user?id=' + u.id);
}

function handleCallback_(ctx, cb) {
  var from = cb.from, data = cb.data || '', msg = cb.message;
  // Nick's and the agents' own buttons need the Mac: a short note on the button, nothing else
  var macOnly = /^(v|ek|es|aw|am|ac|ak|ua|ur|uc|uw|pn|pa|pr|wp|wx|rp):/.test(data);
  tg_(ctx, 'answerCallbackQuery', macOnly ? { callback_query_id: cb.id, text: ADMIN_TEXT, show_alert: true } : { callback_query_id: cb.id });
  if (!msg || macOnly) return;
  var chatId = msg.chat.id, u = user_(ctx, from);
  if (data.indexOf('l:') === 0) {
    var lang = data.slice(2);
    if (LANGS.indexOf(lang) < 0) return;
    setLang_(ctx, u, lang, from);
    tg_(ctx, 'setMyCommands', { commands: ctx.cfg.cmds[lang] || ctx.cfg.cmds.en, scope: { type: 'chat', chat_id: chatId } });
    if (u.pendingRef) {
      var r = u.pendingRef; delete u.pendingRef; save_(ctx, u);
      return guideLink_(r) ? openGuide_(ctx, chatId, from, u, r) : /^sim_/i.test(r) ? openRef_(ctx, chatId, from, u, r.slice(4), true) : openRef_(ctx, chatId, from, u, r, false);
    }
    return goto_(ctx, chatId, from, u, 'menu', msg);
  }
  if (!u.lang) u.lang = 'jp';
  if (data.indexOf('q:') === 0) { // Ask about a unit: the same answer as on the Mac; the Mac sends Nick the Available / Not available card when it is back
    var ref = data.slice(2);
    noteInt_(u, 'asks', ref); save_(ctx, u);
    if (!isNick_(ctx, u.id)) tellNick_(ctx, '<b>Listing interest</b>' + TAG + (isTester_(ctx, u.id) ? ' <i>(tester account)</i>' : '') + '\n' + clientLine_(from, u.id) + '\nListing: ' + esc_(ref) + interestLines_(u).map(function (x) { return '\n' + x; }).join('') + '\nThe card with Available / Not available follows when the Mac is back.\nOpen chat: tg://user?id=' + u.id);
    tg_(ctx, 'sendMessage', { chat_id: chatId, text: msg_(ctx, 'askDone', u.lang), reply_markup: { inline_keyboard: [[{ text: msg_(ctx, 'nickBtn', u.lang), url: contactUrl_(ctx, u.lang) }]] } });
    return queue_(ctx, { k: 'ask', id: String(u.id), lang: u.lang, from: fromOf_(from), ref: ref });
  }
  if (data === 'gd:get') return sendGuide_(ctx, chatId, from, u);
  if (data.indexOf('ph:') === 0 || data.indexOf('cmp:') === 0) { // photos and compare need the listings: the Mac sends them when it is back
    tg_(ctx, 'sendMessage', { chat_id: chatId, text: msg_(ctx, 'checkingMsg', u.lang) });
    return queue_(ctx, data.indexOf('ph:') === 0 ? { k: 'photos', id: String(u.id), lang: u.lang, ref: data.slice(3) } : { k: 'cmp', id: String(u.id), lang: u.lang, ids: data.slice(4).split(',').slice(0, 3) });
  }
  if (data === 'al:on') {
    var k = u.keys || {}, kind = u.lastKind;
    if (!kind || !(kind === 'buy' ? k.b1 || k.b2 : k.rr1 || k.rr2)) return; // the same as the Mac: nothing to save without a search
    save_(ctx, u);
    queue_(ctx, { k: 'alert', id: String(u.id), lang: u.lang, from: fromOf_(from), kind: kind, keys: JSON.parse(JSON.stringify(k)) });
    return tg_(ctx, 'sendMessage', { chat_id: chatId, text: msg_(ctx, 'alertOn', u.lang), reply_markup: { inline_keyboard: [[{ text: msg_(ctx, 'alertStopBtn', u.lang), callback_data: 'al:off' }]] } });
  }
  if (data === 'al:off') return stopAlerts_(ctx, chatId, u);
  if (data === 'al:keep') {
    if ((ctx.live.alerts || []).map(String).indexOf(String(u.id)) < 0) return;
    queue_(ctx, { k: 'keep', id: String(u.id) });
    return tg_(ctx, 'sendMessage', { chat_id: chatId, text: msg_(ctx, 'alertOn', u.lang), reply_markup: { inline_keyboard: [[{ text: msg_(ctx, 'alertStopBtn', u.lang), callback_data: 'al:off' }]] } });
  }
  if (data === 'm:menu') return goto_(ctx, chatId, from, u, 'menu', msg);
  if (data.indexOf('g:') !== 0) return;
  var parts = data.split(':'), fromId = parts[1], idx = Number(parts[2]);
  var step = ctx.byId[fromId], btn = step && step.buttons[idx];
  if (!btn || !btn.to) return;
  if (!/^(back|main menu|cancel|language)/i.test(btn.l)) {
    var key = fromId.replace(/other$/, '');
    u.answers[key] = labelOf_(step, idx, u.lang);
    u.keys[key] = btn.l;
  }
  return goto_(ctx, chatId, from, u, btn.to, msg);
}
function stopAlerts_(ctx, chatId, u) {
  var al = (ctx.live.alerts || []).map(String), had = al.indexOf(String(u.id)) >= 0;
  if (had) { ctx.live.alerts = al.filter(function (x) { return x !== String(u.id); }); putBig_(ctx.all, 'live', ctx.live); }
  save_(ctx, u);
  queue_(ctx, { k: 'stop', id: String(u.id) });
  return tg_(ctx, 'sendMessage', { chat_id: chatId, text: msg_(ctx, had ? 'alertOff' : 'alertNone', u.lang) });
}

function handleMessage_(ctx, m) {
  var from = m.from, chatId = m.chat.id;
  if (m.chat.type !== 'private') return;
  var text = (m.text || '').trim();
  var u = user_(ctx, from);
  var cmd = text.charAt(0) === '/' ? text.split(/\s+/)[0].split('@')[0].toLowerCase() : '';
  if (isNick_(ctx, from.id) && m.document && /^\/setguide\b/i.test(m.caption || '')) return tg_(ctx, 'sendMessage', { chat_id: chatId, text: ADMIN_TEXT });
  if (cmd === '/start' || cmd === '/menu') {
    var payload = cmd === '/start' ? (text.split(/\s+/)[1] || '') : '';
    var ref = /^[A-Za-z0-9_-]{3,40}$/.test(payload) ? payload : '';
    if (!u.lang) {
      if (/^ja/i.test(from.language_code || '')) setLang_(ctx, u, 'jp', from);
      else { if (ref) u.pendingRef = ref; save_(ctx, u); return goto_(ctx, chatId, from, u, 'start'); }
    }
    if (guideLink_(ref)) return openGuide_(ctx, chatId, from, u, ref);
    if (/^sim_/i.test(ref)) return openRef_(ctx, chatId, from, u, ref.slice(4), true);
    if (ref) return openRef_(ctx, chatId, from, u, ref, false);
    return goto_(ctx, chatId, from, u, 'menu');
  }
  // the agent area and Nick's own commands live on the Mac
  var clientCmd = ['/stop', '/buy', '/rent', '/tour', '/estimate', '/guide', '/faq', '/nick', '/myid'].indexOf(cmd) >= 0;
  var agent = (ctx.live.agents || []).map(String).indexOf(String(from.id)) >= 0;
  var typing = !cmd && u.awaiting;
  if ((isNick_(ctx, from.id) && ((cmd && !clientCmd) || (!cmd && !typing))) || (agent && !clientCmd && !typing)) return tg_(ctx, 'sendMessage', { chat_id: chatId, text: ADMIN_TEXT });
  if (!u.lang) setLang_(ctx, u, /^ja/i.test(from.language_code || '') ? 'jp' : 'en', from);
  if (cmd === '/stop') return stopAlerts_(ctx, chatId, u);
  if (cmd === '/buy') return goto_(ctx, chatId, from, u, 'b1');
  if (cmd === '/rent') return goto_(ctx, chatId, from, u, 'rr1');
  if (cmd === '/tour') return goto_(ctx, chatId, from, u, 'tour');
  if (cmd === '/estimate') return goto_(ctx, chatId, from, u, 'refused'); // the estimate needs the Mac (it is hidden from clients anyway)
  if (cmd === '/guide') return sendGuide_(ctx, chatId, from, u);
  if (cmd === '/faq') return goto_(ctx, chatId, from, u, 'faq');
  if (cmd === '/nick') { save_(ctx, u); return tg_(ctx, 'sendMessage', { chat_id: chatId, text: msg_(ctx, 'nick', u.lang), reply_markup: { inline_keyboard: [[{ text: msg_(ctx, 'nickBtn', u.lang), url: contactUrl_(ctx, u.lang) }]] } }); }
  if (cmd === '/myid') { save_(ctx, u); return tg_(ctx, 'sendMessage', { chat_id: chatId, text: msg_(ctx, 'myid', u.lang).replace('{id}', String(from.id)) }); }
  if (cmd) return goto_(ctx, chatId, from, u, 'refused');
  if (u.awaiting && u.awaiting.indexOf('area:') === 0) {
    var p = u.awaiting.split(':'), nextId = p[1], stepId = p[2];
    var area = text.replace(/\s+/g, ' ').slice(0, 80);
    if (!area) { save_(ctx, u); return goto_(ctx, chatId, from, u, { b2: 'b2other', rr2: 'rr2other' }[stepId] || stepId); }
    u.answers[stepId] = area; u.keys[stepId] = 'typed:' + area;
    return goto_(ctx, chatId, from, u, nextId);
  }
  if (u.awaiting === 'check' || u.awaiting === 'calcown' || u.awaiting === 'ckprice') {
    if (ctx.cfg.nickId) tg_(ctx, 'forwardMessage', { chat_id: String(ctx.cfg.nickId), from_chat_id: chatId, message_id: m.message_id });
    if (u.awaiting === 'check') return goto_(ctx, chatId, from, u, 'check2');
    u.awaiting = null; save_(ctx, u);
    return tg_(ctx, 'sendMessage', { chat_id: chatId, text: msg_(ctx, 'ckGot', u.lang), reply_markup: { inline_keyboard: [[{ text: msg_(ctx, 'menuBtn', u.lang), callback_data: 'm:menu' }]] } });
  }
  save_(ctx, u);
  return goto_(ctx, chatId, from, u, 'unknown');
}

function handleUpdate_(ctx, update) {
  var from = update.callback_query ? update.callback_query.from : update.message && update.message.from;
  var chat = update.callback_query ? update.callback_query.message && update.callback_query.message.chat : update.message && update.message.chat;
  try {
    // private test mode: only Nick and his tester accounts, everyone else gets one polite line (as on the Mac)
    if (ctx.cfg.priv && from && !isNick_(ctx, from.id) && !isTester_(ctx, from.id)) {
      if (update.callback_query) tg_(ctx, 'answerCallbackQuery', { callback_query_id: update.callback_query.id });
      if (chat && chat.type === 'private' && (!update.message || update.message.text)) {
        var lang = (ctx.live.langs || {})[String(from.id)] || (/^ja/i.test(from.language_code || '') ? 'jp' : 'en');
        tg_(ctx, 'sendMessage', { chat_id: chat.id, text: msg_(ctx, 'closed', lang) });
      }
      return;
    }
    if (update.callback_query) return handleCallback_(ctx, update.callback_query);
    if (update.message) return handleMessage_(ctx, update.message);
  } catch (e) {
    console.error('Backup handler error: ' + (e && e.message));
    try {
      if (chat && chat.type === 'private') {
        var u = parse_(ctx.all['u_' + chat.id], null);
        var l = (u && u.lang) || (ctx.live.langs || {})[String(chat.id)] || 'jp';
        tg_(ctx, 'sendMessage', Object.assign({ chat_id: chat.id }, render_(ctx.byId.error, l, {})));
      }
    } catch (e2) { /* nothing more to do */ }
  }
}

// ---------- web app ----------
function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function doGet(e) {
  var p = (e && e.parameter) || {}, all = props_().getProperties();
  if (!all.BACKUP_KEY || p.k !== all.BACKUP_KEY) return json_({ ok: false, error: 'key' });
  var out = { ok: true, token: !!all.TELEGRAM_BOT_TOKEN, synced: !!all.cfg_n, macSecondsAgo: all.beat ? Math.round((Date.now() - Number(all.beat)) / 1000) : null, answering: all.hook === '1' ? 'backup' : 'mac', watchdog: false };
  try { out.watchdog = ScriptApp.getProjectTriggers().some(function (t) { return t.getHandlerFunction() === 'watchdog'; }); } catch (err) { /* not authorised yet */ }
  if (all.TELEGRAM_BOT_TOKEN) {
    var info = tg_({ token: all.TELEGRAM_BOT_TOKEN }, 'getWebhookInfo', {});
    out.tokenOk = !!(info && info.ok);
    if (info && info.ok) { out.linkedToBackup = !!info.result.url; out.lastTelegramError = info.result.last_error_message || ''; }
  }
  return json_(out);
}
function doPost(e) {
  var p = (e && e.parameter) || {}, key = props_().getProperty('BACKUP_KEY');
  if (!key || p.k !== key) return p.a === 'sync' ? json_({ ok: false, error: 'key' }) : HtmlService.createHtmlOutput('');
  if (p.a === 'sync') return sync_(e);
  // a Telegram update. The answer is an empty page (200), so Telegram does not send the same update again.
  var update = parse_(e.postData && e.postData.contents, null);
  if (!update || !update.update_id) return HtmlService.createHtmlOutput('');
  var lock = LockService.getScriptLock();
  try { lock.waitLock(25000); } catch (err) { return HtmlService.createHtmlOutput(''); }
  try {
    var cache = CacheService.getScriptCache(), seen = 'up_' + update.update_id;
    if (cache.get(seen)) return HtmlService.createHtmlOutput('');
    cache.put(seen, '1', 21600);
    var ctx = context_();
    if (!ctx.token || !ctx.cfg) return HtmlService.createHtmlOutput('');
    handleUpdate_(ctx, update);
    finish_(ctx);
  } finally { lock.releaseLock(); }
  return HtmlService.createHtmlOutput('');
}

// The Mac's heartbeat: it is alive; screens and languages when they changed; the items it has finished (ack).
// The answer says what this script holds (so the Mac resends what is missing) and what the Mac still has to finish.
function sync_(e) {
  var body = parse_(e.postData && e.postData.contents, null);
  if (!body) return json_({ ok: false, error: 'body' });
  var lock = LockService.getScriptLock();
  try { lock.waitLock(25000); } catch (err) { return json_({ ok: false, error: 'busy' }); }
  try {
    var p = props_(), all = p.getProperties(), now = Date.now();
    var set = { beat: String(now) };
    if (body.url && /^https:\/\/script\.google\.com\//.test(body.url)) set.selfUrl = String(body.url);
    if (body.cfg && body.hash) { putBig_(all, 'cfg', body.cfg); set.cfgHash = String(body.hash); }
    if (body.live && body.lhash) { putBig_(all, 'live', body.live); set.lhash = String(body.lhash); }
    var cfgHash = set.cfgHash || all.cfgHash || '', lhash = set.lhash || all.lhash || '';
    var delta = parse_(getBig_(all, 'delta'), { seq: 0, items: [] });
    var ack = Number(body.ack || 0);
    if (ack) { var before = delta.items.length; delta.items = delta.items.filter(function (x) { return x.s > ack; }); if (delta.items.length !== before) putBig_(all, 'delta', delta); }
    if (all.hook === '1') {
      // the Mac is back: it removed Telegram's link to this script before it started polling. The backup's own client records go.
      set.hook = '0';
      Object.keys(all).forEach(function (k) { if (/^u_/.test(k)) p.deleteProperty(k); });
      if (all.told === 'backup') {
        set.told = 'mac';
        var cfg = parse_(getBig_(all, 'cfg'), null);
        if (cfg && cfg.nickId && all.TELEGRAM_BOT_TOKEN) tg_({ token: all.TELEGRAM_BOT_TOKEN }, 'sendMessage', { chat_id: String(cfg.nickId), text: 'The Mac is back and answering clients again. It now sends what the backup could not (listings, photos, alerts, CRM rows): ' + delta.items.length + ' item(s).' });
      }
    }
    p.setProperties(set);
    return json_({ ok: true, hash: cfgHash, lhash: lhash, delta: delta.items.slice(0, 50) });
  } finally { lock.releaseLock(); }
}

// ---------- the watchdog: every minute ----------
function watchdog() {
  var lock = LockService.getScriptLock();
  try { lock.waitLock(25000); } catch (err) { return; }
  try {
    var p = props_(), all = p.getProperties(), now = Date.now(), beat = Number(all.beat || 0);
    var ctx = { token: all.TELEGRAM_BOT_TOKEN };
    if (!ctx.token || !all.BACKUP_KEY || !all.selfUrl || !beat || !all.cfg_n) return; // not set up yet, or never heard from the Mac
    var stale = now - beat > STALE_MS;
    if (all.hook === '1') {
      if (!stale) return; // the Mac is back; its next heartbeat switches this off
      var info = tg_(ctx, 'getWebhookInfo', {});
      if (info && info.ok && !info.result.url) p.setProperties({ hook: '0', backoff: String(now) }); // the Mac took Telegram back although its beats do not reach us
      return;
    }
    if (!stale || now - Number(all.backoff || 0) < BACKOFF_MS) return;
    var r = tg_(ctx, 'setWebhook', { url: all.selfUrl + '?a=tg&k=' + encodeURIComponent(all.BACKUP_KEY), allowed_updates: ['message', 'callback_query'], max_connections: 1, drop_pending_updates: false });
    if (!r || !r.ok) { console.error('setWebhook failed: ' + (r && r.description)); return; }
    var set = { hook: '1', hookAt: String(now) };
    if (all.told !== 'backup') {
      set.told = 'backup';
      var cfg = parse_(getBig_(all, 'cfg'), null);
      if (cfg && cfg.nickId) tg_(ctx, 'sendMessage', { chat_id: String(cfg.nickId), text: 'The Mac bot has been silent for ' + Math.round((now - beat) / 60000) + ' minutes (power or internet?). The backup is answering clients now with the same screens. Listings, photos, alerts and CRM rows wait for the Mac.' });
    }
    p.setProperties(set);
  } finally { lock.releaseLock(); }
}

// Run once by hand after pasting this file (it asks Google for permission the first time).
function installWatchdog() {
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'watchdog') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('watchdog').timeBased().everyMinutes(1).create();
  var all = props_().getProperties();
  console.log('Watchdog on. Token saved: ' + (all.TELEGRAM_BOT_TOKEN ? 'yes' : 'NO') + '. Key saved: ' + (all.BACKUP_KEY ? 'yes' : 'NO') + '. Heard from the Mac: ' + (all.beat ? 'yes' : 'not yet'));
}
