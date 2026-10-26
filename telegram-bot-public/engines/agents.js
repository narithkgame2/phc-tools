// Phase 2: the owner and agent area of @Nick_Cambodia_Bot. Hidden: only Telegram ids Nick added with /addagent can open it,
// everyone else gets the normal "unknown command" screen. An agent sends the post (photos, videos, description) the way they would
// post it; the bot reads it and asks only what is missing. Nick approves every unit, approved units show to clients and go to Nick's
// channels, and every 7 days the bot asks the agent whether each unit is still available. Agents see only their own units, never a client.
// createAgentArea(ctx) -> { handleMessage, handleCallback, listings, runChecks, isAgent, toListing }. Everything Telegram goes through ctx.api.
const { parsePost } = require('./postparse.js');

const DAY = 86400000;
const CHECK_DAYS = 7, REMIND_HOURS = 24, MAX_REMINDS = 3, MAX_MEDIA = 10;
const AREAS = ['Daun Penh', 'Tonle Bassac', 'BKK1', 'TTP', 'Toul Kork', 'Others'];

function refPrefix(name) {
  const seg = String(name || '').normalize('NFKD').replace(/[^\w\s-]/g, '').trim().toLowerCase().split(/[\s_-]+/).filter(Boolean);
  if (!seg.length) return 'PH';
  const letters = seg.length === 1 ? (/\d/.test(seg[0]) ? seg[0] : seg[0].slice(0, 3)) : seg.map((x) => (/\d/.test(x) ? x : x[0])).join('');
  return letters.toUpperCase().slice(0, 6);
}
const numOf = (text) => { const n = Number(String(text || '').replace(/[,$\s]/g, '').replace(/[^\d.]/g, '')); return Number.isFinite(n) && n > 0 ? n : 0; };
const usd = (n) => '$' + Math.round(n).toLocaleString('en-US');
const looksLikePost = (b) => b.length >= 40 && (/\$\s*\d/.test(b) || /\d+\s*(?:sqm|㎡|m2)/i.test(b) || /bedroom|#for/i.test(b));

function createAgentArea(ctx) {
  const { api, nickId, clock, esc, L, places, data } = ctx;
  const isNick = (id) => !!nickId && String(id) === String(nickId);
  const isAgent = (id) => !!data.getAgent(id);
  const iso = (t) => new Date(t == null ? clock() : t).toISOString();

  const kb = (rows) => ({ inline_keyboard: rows });
  const btn = (text, cd) => ({ text, callback_data: cd });
  const say = (chat, text, rows) => api('sendMessage', Object.assign({ chat_id: chat, text, parse_mode: 'HTML', disable_web_page_preview: true }, rows ? { reply_markup: kb(rows) } : {}));
  // photos and videos, as one album (2 to 10) or one message; the caption goes on the first item
  const mediaTo = (chat, media, caption) => {
    if (!media || !media.length) return Promise.resolve(null);
    const cap = caption ? { caption, parse_mode: 'HTML' } : {};
    if (media.length === 1) return media[0].t === 'video' ? api('sendVideo', Object.assign({ chat_id: chat, video: media[0].id }, cap)) : api('sendPhoto', Object.assign({ chat_id: chat, photo: media[0].id }, cap));
    return api('sendMediaGroup', { chat_id: chat, media: media.map((x, i) => Object.assign({ type: x.t === 'video' ? 'video' : 'photo', media: x.id }, i === 0 ? cap : {})) });
  };
  const counts = (media) => { const p = (media || []).filter((x) => x.t !== 'video').length, v = (media || []).length - p; return p + ' photo' + (p === 1 ? '' : 's') + (v ? ' and ' + v + ' video' + (v === 1 ? '' : 's') : ''); };

  // ---- units as listings the client side already understands
  function toListing(u) {
    const place = L.placeFor(u.name, places) || {};
    return { id: u.ref, type: u.type, name: u.name, district: u.area, khan: place.khan || '', sangkat: place.sangkat || '', price: u.type === 'buy' ? u.price : 0,
      rent: u.type === 'rent' ? u.price : 0, sqm: u.sqm || 0, net: u.net || 0, gross: u.gross || 0, basis: '', beds: u.beds ? String(u.beds) : '', floor: u.floor || '',
      tenanted: !!u.tenanted, tenantNote: u.tenantNote || '', partner: false, netYield: 0, photo: '', media: u.media || [], noteJp: '', noteEn: '', checked: u.checked || '', preview: false, source: 'agent' };
  }
  const listings = () => data.allUnits().filter((u) => u.status === 'active').map(toListing);

  const sizeLine = (u) => [u.net ? u.net + ' sqm net' : '', u.gross ? u.gross + ' sqm gross' : '', !u.net && !u.gross && u.sqm ? u.sqm + ' sqm (net or gross not known)' : ''].filter(Boolean).join(' / ') || 'not given';
  const summary = (u) => [
    '<b>' + esc(u.name || 'Unnamed') + '</b> · ' + (u.type === 'rent' ? 'for rent' : u.type === 'both' ? 'for sale and for rent' : 'for sale'),
    (u.type === 'both' ? usd(u.price) + ' sale, ' + usd(u.rentPrice) + ' per month' : usd(u.price) + (u.type === 'rent' ? ' per month' : '')) + (u.beds === 0 ? ' · studio' : u.beds ? ' · ' + u.beds + ' bedroom' + (u.beds > 1 ? 's' : '') : '') + (u.floor ? ' · floor ' + esc(u.floor) : ''),
    'Size: ' + sizeLine(u), 'Area: ' + esc(u.area || 'not given'), (u.tenanted ? 'Tenanted' + (u.tenantNote ? ': ' + esc(u.tenantNote) : '') + '\n' : '') + 'Media: ' + counts(u.media),
  ].join('\n');

  // ---- the intake: collect the post, read it, ask only what is missing
  const cancelRow = [btn('Cancel', 'aw:cancel')];
  function missing(w) {
    const d = w.d;
    if (!d.name) return 'name';
    if (!d.type) return 'type';
    if (!d.price) return 'price';
    if (d.sqm && !d.net && !d.gross && !d.plainDone) return 'plain';
    if (!d.net && !d.gross && !d.sqm && !d.netAsked) return 'net';
    if (!d.net && !d.gross && !d.sqm && !d.grossAsked) return 'gross';
    if (d.beds === undefined) return 'beds';
    if (d.floor === undefined) return 'floor';
    if (!d.area) return 'area';
    if (!w.mediaDone && !(w.media || []).length) return 'media';
    return null;
  }
  const PROMPTS = {
    name: 'Which project or building is it? Example: Time Square 5',
    type: 'Is it for sale or for rent?',
    price: (w) => (w.d.type === 'rent' ? 'Monthly rent in USD? Example: 650' : 'Selling price in USD? Example: 82000'),
    net: 'Net size in sqm (the inside area). Example: 32. Send - if you do not know.',
    gross: 'Gross size in sqm (including walls and shared parts). Example: 41. Send - if you do not know.',
    beds: 'How many bedrooms?',
    floor: 'Which floor? Example: 15. Send - if you do not know.',
    area: 'Which area?',
    media: 'I have no photos yet. Send photos or videos (no logos or contact details on them), then tap Done.',
  };
  async function ask(chat, u, step) {
    const w = u.wiz; w.step = step; ctx.saveUser(u);
    let q = typeof PROMPTS[step] === 'function' ? PROMPTS[step](w) : PROMPTS[step];
    let rows = [cancelRow];
    if (step === 'type') {
      rows = w.d.rentPrice && w.d.buyPrice ? [[btn('For sale ' + usd(w.d.buyPrice), 'aw:type:buy'), btn('For rent ' + usd(w.d.rentPrice), 'aw:type:rent')], [btn('Both, as two listings', 'aw:type:both')], cancelRow]
        : [[btn('For sale', 'aw:type:buy'), btn('For rent', 'aw:type:rent')], cancelRow];
      if (w.d.rentPrice && w.d.buyPrice) q = 'The post has a sale price and a rent price. Which do you want to list?';
    }
    if (step === 'plain') { q = 'The post says ' + w.d.sqm + ' sqm. Is that the net size (inside) or the gross size (with walls and shared parts)?'; rows = [[btn('Net', 'aw:plain:net'), btn('Gross', 'aw:plain:gross')], [btn('Not sure', 'aw:plain:unknown')], cancelRow]; }
    if (step === 'beds') rows = [[btn('Studio', 'aw:beds:0'), btn('1', 'aw:beds:1'), btn('2', 'aw:beds:2')], [btn('3', 'aw:beds:3'), btn('4', 'aw:beds:4'), btn('5 or more', 'aw:beds:5')], cancelRow];
    if (step === 'area') {
      const guess = (L.placeFor(w.d.name, places) || {}).area;
      rows = [].concat(guess && guess !== 'Others' ? [[btn('Use ' + guess + ' (from the map)', 'aw:area:' + guess)]] : [], [AREAS.slice(0, 3).map((a) => btn(a, 'aw:area:' + a)), AREAS.slice(3).map((a) => btn(a, 'aw:area:' + a))], [cancelRow[0]]);
    }
    if (step === 'media') rows = [[btn('Done', 'aw:media:done')], cancelRow];
    return say(chat, esc(q), rows);
  }
  async function advance(chat, u) {
    const s = missing(u.wiz);
    if (s) return ask(chat, u, s);
    u.wiz.step = 'confirm'; ctx.saveUser(u);
    const d = u.wiz.d;
    return say(chat, '<b>Check your unit</b>\n\n' + summary({ ...d, media: u.wiz.media }) + '\n\nSubmit it to Nick for approval?', [[btn('Submit', 'aw:submit'), btn('Cancel', 'aw:cancel')]]);
  }
  const newWiz = (mode) => ({ mode, step: mode === 'intake' ? 'collect' : 'name', d: {}, media: [], texts: [] });

  async function collect(m, body, u, chat) {
    const w = u.wiz; let added = false;
    const room = MAX_MEDIA - w.media.length;
    if (m.photo && m.photo.length && room > 0) { w.media.push({ t: 'photo', id: m.photo[m.photo.length - 1].file_id }); added = true; }
    if (m.video && m.video.file_id && w.media.length < MAX_MEDIA) { w.media.push({ t: 'video', id: m.video.file_id }); added = true; }
    if (body) w.texts.push(body);
    const quiet = m.media_group_id && w.lastGroup === m.media_group_id && w.media.length < MAX_MEDIA;
    w.lastGroup = m.media_group_id || '';
    ctx.saveUser(u);
    if (quiet) return;
    return say(chat, 'Received: ' + counts(w.media) + (w.texts.length ? ' and the description' : '') + '. Send more if you have it, then tap Done.' + (added || body ? '' : ''), [[btn('Done', 'aw:collectdone')], cancelRow]);
  }
  async function readPost(chat, u) {
    const w = u.wiz, r = parsePost(w.texts.join('\n'), places);
    const d = w.d;
    if (r.faraway) { u.wiz = null; ctx.saveUser(u); return say(chat, 'This bot lists Phnom Penh units only. That post looks like another city (Sihanoukville or Siem Reap), so I stopped. Ask Nick if you want it handled another way.'); }
    if (r.name) d.name = r.name;
    if (r.type) { d.type = r.type; d.price = r.price; }
    else if (r.buy && r.rent) { d.buyPrice = r.buy; d.rentPrice = r.rent; }
    else if (r.price) { d.price = r.price; }
    if (r.net) d.net = r.net; if (r.gross) d.gross = r.gross; if (r.plain) d.sqm = r.plain;
    if (r.beds !== undefined) d.beds = r.beds; if (r.floor) d.floor = r.floor; if (r.area) d.area = r.area;
    if (r.unit) d.unitNo = r.unit; if (r.tenanted) { d.tenanted = true; d.tenantNote = r.tenantNote; }
    const found = [r.name, r.type && (r.type === 'rent' ? 'rent ' + usd(r.price) : 'sale ' + usd(r.price)), (r.net || r.gross || r.plain) && 'size', r.beds !== undefined && 'bedrooms', r.floor && 'floor', r.area && 'area'].filter(Boolean);
    await say(chat, found.length ? 'I read your post. Found: ' + esc(found.join(', ')) + '. I will ask only what is missing.' : 'I could not read details from that post, so I will ask step by step.');
    return advance(chat, u);
  }
  async function startIntake(chat, u) {
    u.wiz = newWiz('intake'); ctx.saveUser(u);
    return say(chat, '<b>Add a unit</b>\n\nSend me the post as you would post it: photos, videos and the description, in one or several messages. I read it and ask only what is missing. Then tap Done.', [[btn('Ask me step by step instead', 'aw:steps')], cancelRow]);
  }

  // ---- submitting: one or two units (a unit for both sale and rent is two listings)
  async function submit(chat, u) {
    const w = u.wiz, d = w.d, made = [];
    const kinds = d.type === 'both' ? [['buy', d.buyPrice || d.price], ['rent', d.rentPrice]] : [[d.type, d.price]];
    for (const [type, price] of kinds) {
      const seq = data.nextSeq(), ref = refPrefix(d.name) + '-' + (6000 + seq);
      const unit = { ref, seq, agentId: u.id, agentName: (data.getAgent(u.id) || {}).name || 'Agent', status: 'pending', type, name: d.name, area: d.area, price, net: d.net || 0, gross: d.gross || 0, sqm: d.sqm || 0,
        beds: d.beds, floor: d.floor || '', unitNo: d.unitNo || '', tenanted: !!d.tenanted, tenantNote: d.tenantNote || '', media: w.media || [], submittedAt: iso(), approvedAt: '', checked: '', nextCheckAt: '', askedAt: '', reminders: 0, pendingPrice: null };
      data.setUnit(ref, unit); made.push(unit);
    }
    u.wiz = null; ctx.saveUser(u);
    await say(chat, 'Submitted as <b>' + made.map((x) => esc(x.ref)).join(' and ') + '</b>. Nick will review it and you will get a message here.');
    if (nickId) for (const unit of made) {
      await mediaTo(nickId, unit.media);
      await say(nickId, '<b>New unit to approve</b>\nRef ' + esc(unit.ref) + '\nAgent: ' + esc(unit.agentName) + ' (' + unit.agentId + ')\n\n' + summary(unit), [[btn('Approve', 'ua:' + unit.ref), btn('Reject', 'ur:' + unit.ref)]]);
    }
  }

  // ---- posting an approved unit to Nick's channels
  const lineUrl = () => (ctx.lineUrl || '');
  function channelText(l, lang) {
    const head = lang === 'jp' ? '<b>新着物件</b>' : '<b>New listing</b>';
    const avail = lang === 'jp' ? '※空室状況と価格は、お問い合わせいただいた時点で最新情報を確認します。' : 'Availability and price are confirmed when you ask.';
    const line = lang === 'jp' ? '\n<a href="' + lineUrl() + '">LINEでNickに相談</a>' : '';
    return head + '\n\n' + ctx.listingText(l, lang) + '\n\n<i>' + avail + '</i>' + line;
  }
  async function postToChannel(ch, unit) {
    const text = channelText(toListing(unit), ch.lang === 'en' ? 'en' : 'jp');
    const media = unit.media || [];
    let r;
    if (media.length) { r = await mediaTo(ch.chat, media, text.length <= 1000 ? text : null); if (r && r.ok !== false && text.length > 1000) r = await say(ch.chat, text); }
    else r = await say(ch.chat, text);
    return r;
  }
  async function afterApprove(unit) {
    const out = [], rows = [];
    for (const [i, ch] of (ctx.channels || []).entries()) {
      if (ch.mode === 'auto') {
        const r = await postToChannel(ch, unit);
        out.push((r && r.ok === false) ? 'Could not post to ' + esc(ch.chat) + ': ' + esc(r.description || 'unknown error') + ' (is the bot an administrator there?)' : 'Posted to ' + esc(ch.chat) + '.');
      } else { rows.push([btn('Also post to ' + ch.chat, 'uc:' + unit.ref + ':' + i)]); out.push('Draft for ' + esc(ch.chat) + ' is ready: tap the button to post it.'); }
    }
    return { text: out.join('\n'), rows };
  }

  // ---- weekly availability check
  const manageRows = (ref) => [[btn('Still available', 'ac:' + ref + ':y'), btn('Sold', 'ac:' + ref + ':s')], [btn('Price changed', 'ac:' + ref + ':p')]];
  async function runChecks() {
    const t = clock(), hourIct = new Date(t + 7 * 3600000).getUTCHours();
    if (hourIct < 8 || hourIct >= 19) return 0;
    let n = 0;
    for (const u of data.allUnits()) {
      if (u.status !== 'active' || !u.nextCheckAt || t < Date.parse(u.nextCheckAt)) continue;
      if (u.askedAt && t - Date.parse(u.askedAt) < REMIND_HOURS * 3600000) continue;
      if (u.reminders >= MAX_REMINDS) {
        u.status = 'stale'; data.setUnit(u.ref, u); // no answer after three asks: hidden until the agent confirms
        if (nickId) await say(nickId, '<b>' + esc(u.ref) + '</b> ' + esc(u.name) + ' is hidden: ' + esc(u.agentName) + ' did not confirm it after ' + MAX_REMINDS + ' reminders. It returns when the agent taps Still available.');
        await say(u.agentId, esc(u.ref) + ' is hidden from clients because it was not confirmed. Open /myunits and tap Still available to show it again.');
        continue;
      }
      await say(u.agentId, '<b>Still available?</b>\n\n' + summary(u) + '\nRef ' + esc(u.ref), manageRows(u.ref));
      u.askedAt = iso(t); u.reminders = (u.reminders || 0) + 1; data.setUnit(u.ref, u); n++;
    }
    return n;
  }
  async function confirmAvailable(u, chat) {
    u.status = 'active'; u.checked = iso(); u.nextCheckAt = iso(clock() + CHECK_DAYS * DAY); u.askedAt = ''; u.reminders = 0; data.setUnit(u.ref, u);
    return say(chat, 'Thank you. <b>' + esc(u.ref) + '</b> is confirmed available today. Next check in ' + CHECK_DAYS + ' days.');
  }
  async function myUnits(chat, agentId) {
    const mine = data.allUnits().filter((u) => u.agentId === agentId && u.status !== 'rejected' && u.status !== 'sold');
    const lines = mine.map((u) => '<b>' + esc(u.ref) + '</b> ' + esc(u.name) + ' · ' + usd(u.price) + (u.type === 'rent' ? '/month' : '') + ' · ' + ({ pending: 'waiting for Nick', active: 'live', stale: 'hidden, please confirm' }[u.status] || u.status));
    return say(chat, '<b>Your units</b>\n\n' + (lines.join('\n') || 'No units yet.') + '\n\nTo add a unit, just send me the post.', mine.map((u) => [btn('Manage ' + u.ref, 'am:' + u.ref)]).concat([[btn('Add a unit', 'aw:start')]]));
  }

  // ---- messages
  async function handleMessage(m, u, text, cmd) {
    const from = m.from, chat = m.chat.id, body = (m.text || m.caption || '').trim();
    if (isNick(from.id)) {
      if (cmd === '/addagent') {
        const parts = text.split(/\s+/).slice(1); let id = parts[0] || '', name = parts.slice(1).join(' ');
        if (/^@\w{3,}$/.test(id)) {
          const found = ctx.findUserByUsername ? ctx.findUserByUsername(id.slice(1)) : null;
          if (!found) { await say(chat, 'I have not met ' + esc(id) + ' yet. Ask them to open @Nick_Cambodia_Bot and send /start, then send me the same command again.'); return true; }
          name = name || id.slice(1); id = String(found.id);
        }
        if (!/^\d{5,15}$/.test(id)) { await say(chat, 'Send: /addagent TELEGRAM_ID Name, or /addagent @username Name (they must have opened this bot once).'); return true; }
        data.setAgent(id, { id, name: name || 'Agent', addedAt: iso() });
        await say(chat, 'Agent added: ' + esc(name || id) + ' (' + esc(id) + '). They can now send /myunits to this bot, or just send a post.');
        return true;
      }
      if (cmd === '/removeagent') {
        const id = text.split(/\s+/)[1];
        if (id && data.getAgent(id)) { data.deleteAgent(id); await say(chat, 'Agent removed: ' + esc(id) + '. Their live units stay until you hide them.'); } else await say(chat, 'No such agent. Send /agents to see the list.');
        return true;
      }
      if (cmd === '/agents') { await say(chat, '<b>Agents</b>\n' + (data.allAgents().map((a) => esc(a.name) + ' (' + esc(a.id) + ')').join('\n') || 'None yet. Send /addagent TELEGRAM_ID Name')); return true; }
      if (cmd === '/units') {
        const line = (x) => esc(x.ref) + ' ' + esc(x.name) + ' ' + usd(x.price) + ' · ' + esc(x.status) + ' · ' + esc(x.agentName);
        await say(chat, '<b>Agent units</b>\n' + (data.allUnits().map(line).join('\n') || 'None yet.'));
        return true;
      }
    }
    if (!isAgent(from.id)) return false;
    if (cmd === '/myunits') { u.wiz = null; ctx.saveUser(u); await myUnits(chat, u.id); return true; }
    if (cmd === '/addunit') { await startIntake(chat, u); return true; }
    const w = u.wiz, hasMedia = !!((m.photo && m.photo.length) || (m.video && m.video.file_id));
    if (w && w.step === 'newprice') {
      const unit = data.getUnit(w.ref), price = numOf(text);
      if (!unit || unit.agentId !== u.id) { u.wiz = null; ctx.saveUser(u); return true; }
      if (!price) { await say(chat, 'Please send the new price as a number, for example 79000.', [cancelRow]); return true; }
      unit.pendingPrice = { value: price, at: iso() }; data.setUnit(unit.ref, unit); u.wiz = null; ctx.saveUser(u);
      const pct = Math.round(((price - unit.price) / unit.price) * 100);
      await say(chat, 'Sent to Nick: ' + esc(unit.ref) + ' from ' + usd(unit.price) + ' to ' + usd(price) + '. The old price stays until he approves.');
      if (nickId) await say(nickId, '<b>Price change to approve</b>\n' + esc(unit.ref) + ' ' + esc(unit.name) + '\n' + usd(unit.price) + ' to ' + usd(price) + ' (' + (pct > 0 ? '+' : '') + pct + '%)' + (Math.abs(pct) > 15 ? '\nMore than 15 percent: please check it is right.' : '') + '\nAgent: ' + esc(unit.agentName), [[btn('Approve', 'pa:' + unit.ref), btn('Reject', 'pr:' + unit.ref)]]);
      return true;
    }
    if (!w && (hasMedia || looksLikePost(body))) { u.wiz = newWiz('intake'); await collect(m, body, u, chat); return true; }
    if (!w) return false;
    if (w.step === 'collect') { if (hasMedia || body) await collect(m, body, u, chat); return true; }
    if (w.step === 'media' && hasMedia) {
      if (m.photo && m.photo.length && w.media.length < MAX_MEDIA) w.media.push({ t: 'photo', id: m.photo[m.photo.length - 1].file_id });
      if (m.video && m.video.file_id && w.media.length < MAX_MEDIA) w.media.push({ t: 'video', id: m.video.file_id });
      const quiet = m.media_group_id && w.lastGroup === m.media_group_id && w.media.length < MAX_MEDIA; w.lastGroup = m.media_group_id || ''; ctx.saveUser(u);
      if (!quiet) await say(chat, 'Added (' + counts(w.media) + ').', [[btn('Done', 'aw:media:done')], cancelRow]);
      return true;
    }
    if (!body) { if (hasMedia) await say(chat, 'Please answer the question above first, or tap Cancel.'); return true; }
    const step = w.step;
    if (step === 'name') {
      const name = body.replace(/\s+/g, ' ').slice(0, 60);
      if (name.length < 2) { await say(chat, 'Please type the project or building name.', [cancelRow]); return true; }
      w.d.name = name; await advance(chat, u); return true;
    }
    if (step === 'price') {
      const p = numOf(body);
      if (!p) { await say(chat, 'Please send the price as a number, for example ' + (w.d.type === 'rent' ? '650' : '82000') + '.', [cancelRow]); return true; }
      w.d.price = p; await advance(chat, u); return true;
    }
    if (step === 'net' || step === 'gross') {
      const skip = /^[-–—]$|^(skip|unknown|no)$/i.test(body.trim()), n = skip ? 0 : numOf(body);
      if (!skip && !n) { await say(chat, 'Please send the size in sqm as a number, or send - if you do not know.', [cancelRow]); return true; }
      w.d[step] = n; w.d[step + 'Asked'] = true;
      if (step === 'gross' && !w.d.net && !w.d.gross) { w.d.grossAsked = false; await say(chat, 'I need at least one size, net or gross. Please send the gross size in sqm.', [cancelRow]); return true; }
      await advance(chat, u); return true;
    }
    if (step === 'floor') { const skip = /^[-–—]$|^(skip|unknown|no)$/i.test(body.trim()); w.d.floor = skip ? '' : (body.match(/\d{1,3}/) || [''])[0]; await advance(chat, u); return true; }
    await say(chat, 'Please use the buttons.', [cancelRow]);
    return true;
  }

  // ---- buttons
  async function handleCallback(cb, u) {
    const raw = cb.data || '', from = cb.from, chat = cb.message && cb.message.chat && cb.message.chat.id;
    const [kind, a, b] = raw.split(':');
    if (kind === 'ua' || kind === 'ur' || kind === 'pa' || kind === 'pr' || kind === 'uc') {
      if (!isNick(from.id)) return true;
      const unit = data.getUnit(a);
      if (!unit) return true;
      if (kind === 'ua' && unit.status === 'pending') {
        unit.status = 'active'; unit.approvedAt = iso(); unit.checked = iso(); unit.nextCheckAt = iso(clock() + CHECK_DAYS * DAY); data.setUnit(unit.ref, unit);
        await say(unit.agentId, '<b>' + esc(unit.ref) + '</b> is approved and now shows to clients. I will ask you every ' + CHECK_DAYS + ' days whether it is still available.');
        const res = await afterApprove(unit);
        await say(nickId, '<b>' + esc(unit.ref) + '</b> approved and live for clients.' + (res.text ? '\n' + res.text : ''), res.rows.length ? res.rows : null);
      } else if (kind === 'ur' && unit.status === 'pending') {
        unit.status = 'rejected'; data.setUnit(unit.ref, unit);
        await say(unit.agentId, esc(unit.ref) + ' was not approved. Nick may contact you.');
        await say(nickId, esc(unit.ref) + ' rejected. The agent was told.');
      } else if (kind === 'uc') {
        const ch = (ctx.channels || [])[Number(b)];
        if (ch && unit.status === 'active') { const r = await postToChannel(ch, unit); await say(nickId, (r && r.ok === false) ? 'Could not post to ' + esc(ch.chat) + ': ' + esc(r.description || 'unknown error') : 'Posted to ' + esc(ch.chat) + '.'); }
      } else if (kind === 'pa' && unit.pendingPrice) {
        const old = unit.price; unit.price = unit.pendingPrice.value; unit.pendingPrice = null; unit.checked = iso(); unit.nextCheckAt = iso(clock() + CHECK_DAYS * DAY); unit.askedAt = ''; unit.reminders = 0; data.setUnit(unit.ref, unit);
        await say(unit.agentId, esc(unit.ref) + ' price is now ' + usd(unit.price) + '.');
        await say(nickId, esc(unit.ref) + ' price changed from ' + usd(old) + ' to ' + usd(unit.price) + '.');
      } else if (kind === 'pr' && unit.pendingPrice) {
        unit.pendingPrice = null; data.setUnit(unit.ref, unit);
        await say(unit.agentId, 'The price change for ' + esc(unit.ref) + ' was not approved. The price stays ' + usd(unit.price) + '.');
        await say(nickId, 'Price change for ' + esc(unit.ref) + ' rejected.');
      }
      return true;
    }
    if (!isAgent(from.id)) return true;
    if (kind === 'am') {
      const unit = data.getUnit(a);
      if (!unit || unit.agentId !== u.id) return true;
      await say(chat, summary(unit) + '\nRef ' + esc(unit.ref), manageRows(unit.ref));
      return true;
    }
    if (kind === 'ac') {
      const unit = data.getUnit(a);
      if (!unit || unit.agentId !== u.id || !(unit.status === 'active' || unit.status === 'stale')) return true; // an agent can only act on their own live unit
      if (b === 'y') await confirmAvailable(unit, chat);
      else if (b === 's') {
        unit.status = 'sold'; data.setUnit(unit.ref, unit);
        const told = await ctx.tellAskersGone(unit.ref, unit.name);
        await say(chat, esc(unit.ref) + ' is marked sold and hidden from clients. Thank you.');
        if (nickId) await say(nickId, '<b>' + esc(unit.ref) + '</b> ' + esc(unit.name) + ' was marked sold by ' + esc(unit.agentName) + '. Hidden from clients' + (told ? '; ' + told + ' client(s) who asked were told' : '') + '.');
      } else if (b === 'p') { u.wiz = { step: 'newprice', ref: unit.ref }; ctx.saveUser(u); await say(chat, 'What is the new price in USD for ' + esc(unit.ref) + '? Current: ' + usd(unit.price), [cancelRow]); }
      return true;
    }
    if (kind === 'aw') {
      if (a === 'start') { await startIntake(chat, u); return true; }
      if (a === 'cancel') { u.wiz = null; ctx.saveUser(u); await say(chat, 'Cancelled.'); return true; }
      const w = u.wiz; if (!w) return true;
      if (a === 'steps' && w.step === 'collect') { w.mode = 'manual'; return !!(await advance(chat, u), true); }
      if (a === 'collectdone' && w.step === 'collect') { await readPost(chat, u); return true; }
      if (a === 'submit') { if (w.step === 'confirm') await submit(chat, u); return true; }
      if (a === 'type' && w.step === 'type') {
        const t = b === 'rent' ? 'rent' : b === 'both' ? 'both' : 'buy'; w.d.type = t;
        w.d.price = t === 'rent' ? (w.d.rentPrice || w.d.price || 0) : (w.d.buyPrice || w.d.price || 0);
        if (t === 'both') w.d.price = w.d.buyPrice || w.d.price;
        await advance(chat, u); return true;
      }
      if (a === 'plain' && w.step === 'plain') { w.d.plainDone = true; if (b === 'net') w.d.net = w.d.sqm; else if (b === 'gross') w.d.gross = w.d.sqm; await advance(chat, u); return true; }
      if (a === 'beds' && w.step === 'beds') { w.d.beds = Number(b) || 0; await advance(chat, u); return true; }
      if (a === 'area' && w.step === 'area' && AREAS.includes(b)) { w.d.area = b; await advance(chat, u); return true; }
      if (a === 'media' && b === 'done' && w.step === 'media') { w.mediaDone = true; await advance(chat, u); return true; }
      return true;
    }
    return false;
  }

  return { handleMessage, handleCallback, listings, runChecks, isAgent, toListing };
}

module.exports = { createAgentArea, refPrefix };
