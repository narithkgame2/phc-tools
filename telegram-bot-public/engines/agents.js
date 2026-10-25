// Phase 2: the owner and agent area of @Nick_Cambodia_Bot. Hidden: only Telegram ids Nick added with /addagent can open it,
// everyone else gets the normal "unknown command" screen. Agents add units, Nick approves every one, approved units show to clients
// and go to Nick's channels, and every 7 days the bot asks the agent whether each unit is still available.
// Agents see only their own units and never any client.
// createAgentArea(ctx) -> { handleMessage, handleCallback, listings, runChecks, isAgent }. Everything Telegram goes through ctx.api.

const DAY = 86400000;
const CHECK_DAYS = 7, REMIND_HOURS = 24, MAX_REMINDS = 3;
const AREAS = ['Daun Penh', 'Tonle Bassac', 'BKK1', 'TTP', 'Toul Kork', 'Others'];

function refPrefix(name) {
  const seg = String(name || '').normalize('NFKD').replace(/[^\w\s-]/g, '').trim().toLowerCase().split(/[\s_-]+/).filter(Boolean);
  if (!seg.length) return 'PH';
  const letters = seg.length === 1 ? (/\d/.test(seg[0]) ? seg[0] : seg[0].slice(0, 3)) : seg.map((x) => (/\d/.test(x) ? x : x[0])).join('');
  return letters.toUpperCase().slice(0, 6);
}
const numOf = (text) => { const n = Number(String(text || '').replace(/[,$\s]/g, '').replace(/[^\d.]/g, '')); return Number.isFinite(n) && n > 0 ? n : 0; };
const usd = (n) => '$' + Math.round(n).toLocaleString('en-US');

function createAgentArea(ctx) {
  const { api, nickId, clock, esc, L, places, data } = ctx;
  const isNick = (id) => !!nickId && String(id) === String(nickId);
  const isAgent = (id) => !!data.getAgent(id);
  const iso = (t) => new Date(t == null ? clock() : t).toISOString();

  const kb = (rows) => ({ inline_keyboard: rows });
  const btn = (text, cd) => ({ text, callback_data: cd });
  const say = (chat, text, rows) => api('sendMessage', Object.assign({ chat_id: chat, text, parse_mode: 'HTML', disable_web_page_preview: true }, rows ? { reply_markup: kb(rows) } : {}));
  const photosTo = (chat, ids, caption) => {
    if (!ids || !ids.length) return Promise.resolve(null);
    if (ids.length === 1) return api('sendPhoto', Object.assign({ chat_id: chat, photo: ids[0] }, caption ? { caption, parse_mode: 'HTML' } : {}));
    return api('sendMediaGroup', { chat_id: chat, media: ids.map((id, i) => Object.assign({ type: 'photo', media: id }, i === 0 && caption ? { caption, parse_mode: 'HTML' } : {})) });
  };

  // ---- units as listings the client side already understands
  function toListing(u) {
    const place = L.placeFor(u.name, places) || {};
    return { id: u.ref, type: u.type, name: u.name, district: u.area, khan: place.khan || '', sangkat: place.sangkat || '', price: u.type === 'buy' ? u.price : 0,
      rent: u.type === 'rent' ? u.price : 0, sqm: 0, net: u.net || 0, gross: u.gross || 0, basis: '', beds: u.beds ? String(u.beds) : '', floor: u.floor || '',
      tenanted: false, tenantNote: '', partner: false, netYield: 0, photo: '', photos: u.photos || [], noteJp: '', noteEn: '', checked: u.checked || '', preview: false, source: 'agent' };
  }
  const listings = () => data.allUnits().filter((u) => u.status === 'active').map(toListing);

  const summary = (u) => [
    '<b>' + esc(u.name) + '</b> · ' + (u.type === 'buy' ? 'for sale' : 'for rent'),
    (u.type === 'buy' ? usd(u.price) : usd(u.price) + ' per month') + (u.beds ? ' · ' + u.beds + ' bedroom' + (u.beds > 1 ? 's' : '') : (u.beds === 0 ? ' · studio' : '')) + (u.floor ? ' · floor ' + esc(u.floor) : ''),
    'Size: ' + ([u.net ? u.net + ' sqm net' : '', u.gross ? u.gross + ' sqm gross' : ''].filter(Boolean).join(' / ') || 'not given'),
    'Area: ' + esc(u.area), 'Photos: ' + (u.photos || []).length,
  ].join('\n');

  // ---- the add-a-unit wizard (state lives on the user record as u.wiz)
  const STEPS = {
    name: { ask: 'Which project or building? Example: Time Square 5', type: 'text' },
    type: { ask: 'Is it for sale or for rent?', type: 'buttons' },
    price: { ask: (w) => (w.d.type === 'rent' ? 'Monthly rent in USD? Example: 650' : 'Selling price in USD? Example: 82000'), type: 'text' },
    net: { ask: 'Net size in sqm (the inside area). Example: 32. Send - if you do not know.', type: 'text' },
    gross: { ask: 'Gross size in sqm (including walls and common parts). Example: 41. Send - if you do not know.', type: 'text' },
    beds: { ask: 'How many bedrooms?', type: 'buttons' },
    floor: { ask: 'Which floor? Example: 15. Send - if you do not know.', type: 'text' },
    area: { ask: 'Which area?', type: 'buttons' },
    photos: { ask: 'Send up to 5 photos of the unit, then tap Done. No logos or contact details on the photos, please.', type: 'photos' },
  };
  const ORDER = ['name', 'type', 'price', 'net', 'gross', 'beds', 'floor', 'area', 'photos'];
  const cancelRow = [btn('Cancel', 'aw:cancel')];

  async function ask(chat, u, step) {
    const s = STEPS[step], w = u.wiz; w.step = step;
    ctx.saveUser(u);
    const q = typeof s.ask === 'function' ? s.ask(w) : s.ask;
    let rows = [cancelRow];
    if (step === 'type') rows = [[btn('For sale', 'aw:type:buy'), btn('For rent', 'aw:type:rent')], cancelRow];
    if (step === 'beds') rows = [[btn('Studio', 'aw:beds:0'), btn('1', 'aw:beds:1'), btn('2', 'aw:beds:2')], [btn('3', 'aw:beds:3'), btn('4', 'aw:beds:4'), btn('5 or more', 'aw:beds:5')], cancelRow];
    if (step === 'area') {
      const guess = (L.placeFor(w.d.name, places) || {}).area;
      rows = [].concat(guess && guess !== 'Others' ? [[btn('Use ' + guess + ' (from the map)', 'aw:area:' + guess)]] : [], [AREAS.slice(0, 3).map((a) => btn(a, 'aw:area:' + a)), AREAS.slice(3).map((a) => btn(a, 'aw:area:' + a))], [cancelRow[0]]);
    }
    if (step === 'photos') rows = [[btn('Done', 'aw:photos:done')], cancelRow];
    return say(chat, '<b>Add a unit</b>  <i>step ' + (ORDER.indexOf(step) + 1) + ' of ' + ORDER.length + '</i>\n\n' + esc(q), rows);
  }
  const next = (step) => ORDER[ORDER.indexOf(step) + 1];

  async function finishWizard(chat, u) {
    const w = u.wiz, d = w.d;
    const unit = { name: d.name, type: d.type, price: d.price, net: d.net || 0, gross: d.gross || 0, beds: d.beds, floor: d.floor || '', area: d.area, photos: w.photos || [] };
    ctx.saveUser(u);
    return say(chat, '<b>Check your unit</b>\n\n' + summary(unit) + '\n\nSubmit it to Nick for approval?', [[btn('Submit', 'aw:submit'), btn('Cancel', 'aw:cancel')]]);
  }

  async function submit(chat, u, from) {
    const w = u.wiz, d = w.d;
    const seq = data.nextSeq();
    const ref = refPrefix(d.name) + '-' + (6000 + seq);
    const unit = { ref, seq, agentId: u.id, agentName: (data.getAgent(u.id) || {}).name || 'Agent', status: 'pending', type: d.type, name: d.name, area: d.area, price: d.price,
      net: d.net || 0, gross: d.gross || 0, beds: d.beds, floor: d.floor || '', photos: w.photos || [], submittedAt: iso(), approvedAt: '', checked: '', nextCheckAt: '', askedAt: '', reminders: 0, pendingPrice: null };
    data.setUnit(ref, unit);
    u.wiz = null; ctx.saveUser(u);
    await say(chat, 'Submitted as <b>' + esc(ref) + '</b>. Nick will review it and you will get a message here.');
    if (nickId) {
      await photosTo(nickId, unit.photos);
      await say(nickId, '<b>New unit to approve</b>\nRef ' + esc(ref) + '\nAgent: ' + esc(unit.agentName) + ' (' + unit.agentId + ')\n\n' + summary(unit), [[btn('Approve', 'ua:' + ref), btn('Reject', 'ur:' + ref)]]);
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
    const l = toListing(unit), lang = ch.lang === 'en' ? 'en' : 'jp';
    const text = channelText(l, lang);
    const ids = unit.photos || [];
    let r;
    if (ids.length) { r = await photosTo(ch.chat, ids, text.length <= 1000 ? text : null); if (r && r.ok !== false && text.length > 1000) r = await say(ch.chat, text); }
    else r = await say(ch.chat, text);
    return r;
  }
  async function afterApprove(unit) {
    const out = [];
    const rows = [];
    for (const [i, ch] of (ctx.channels || []).entries()) {
      if (ch.mode === 'auto') {
        const r = await postToChannel(ch, unit);
        out.push((r && r.ok === false) ? 'Could not post to ' + esc(ch.chat) + ': ' + esc(r.description || 'unknown error') + ' (is the bot an administrator there?)' : 'Posted to ' + esc(ch.chat) + '.');
      } else {
        rows.push([btn('Also post to ' + ch.chat, 'uc:' + unit.ref + ':' + i)]);
        out.push('Draft for ' + esc(ch.chat) + ' is ready: tap the button to post it.');
      }
    }
    return { text: out.join('\n'), rows };
  }

  // ---- weekly availability check
  async function askCheck(u) {
    return say(u.agentId, '<b>Still available?</b>\n\n' + summary(u) + '\nRef ' + esc(u.ref), [[btn('Still available', 'ac:' + u.ref + ':y'), btn('Sold', 'ac:' + u.ref + ':s')], [btn('Price changed', 'ac:' + u.ref + ':p')]]);
  }
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
      await askCheck(u); u.askedAt = iso(t); u.reminders = (u.reminders || 0) + 1; data.setUnit(u.ref, u); n++;
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
    const rows = mine.map((u) => [btn('Manage ' + u.ref, 'am:' + u.ref)]).concat([[btn('Add a unit', 'aw:start')]]);
    return say(chat, '<b>Your units</b>\n\n' + (lines.join('\n') || 'No units yet.'), rows);
  }

  // ---- messages
  async function handleMessage(m, u, text, cmd) {
    const from = m.from, chat = m.chat.id;
    if (isNick(from.id)) {
      if (cmd === '/addagent') {
        const parts = text.split(/\s+/).slice(1); const id = parts[0];
        if (!/^\d{5,15}$/.test(id || '')) { await say(chat, 'Send: /addagent TELEGRAM_ID Name\nExample: /addagent 5712964982 Dara'); return true; }
        data.setAgent(id, { id, name: parts.slice(1).join(' ') || 'Agent', addedAt: iso() });
        await say(chat, 'Agent added: ' + esc(parts.slice(1).join(' ') || id) + ' (' + esc(id) + '). They can now send /myunits to this bot.');
        return true;
      }
      if (cmd === '/removeagent') {
        const id = text.split(/\s+/)[1];
        if (id && data.getAgent(id)) { data.deleteAgent(id); await say(chat, 'Agent removed: ' + esc(id) + '. Their live units stay until you hide them.'); } else await say(chat, 'No such agent. Send /agents to see the list.');
        return true;
      }
      if (cmd === '/agents') {
        const list = data.allAgents().map((a) => esc(a.name) + ' (' + esc(a.id) + ')');
        await say(chat, '<b>Agents</b>\n' + (list.join('\n') || 'None yet. Send /addagent TELEGRAM_ID Name'));
        return true;
      }
      if (cmd === '/units') {
        const all = data.allUnits();
        const line = (x) => esc(x.ref) + ' ' + esc(x.name) + ' ' + usd(x.price) + ' · ' + esc(x.status) + ' · ' + esc(x.agentName);
        await say(chat, '<b>Agent units</b>\n' + (all.map(line).join('\n') || 'None yet.'));
        return true;
      }
    }
    if (!isAgent(from.id) && !isNick(from.id)) return false;
    if (isAgent(from.id) && (cmd === '/myunits' || cmd === '/addunit')) { u.wiz = null; ctx.saveUser(u); if (cmd === '/addunit') { u.wiz = { d: {}, photos: [] }; await ask(chat, u, 'name'); } else await myUnits(chat, u.id); return true; }
    if (!isAgent(from.id) || !u.wiz) return false;
    const w = u.wiz;
    // a typed new price for an existing unit
    if (w.step === 'newprice') {
      const unit = data.getUnit(w.ref); const price = numOf(text);
      if (!unit || unit.agentId !== u.id) { u.wiz = null; ctx.saveUser(u); return true; }
      if (!price) { await say(chat, 'Please send the new price as a number, for example 79000.', [cancelRow]); return true; }
      unit.pendingPrice = { value: price, at: iso() }; data.setUnit(unit.ref, unit); u.wiz = null; ctx.saveUser(u);
      const pct = Math.round(((price - unit.price) / unit.price) * 100);
      await say(chat, 'Sent to Nick: ' + esc(unit.ref) + ' from ' + usd(unit.price) + ' to ' + usd(price) + '. The old price stays until he approves.');
      if (nickId) await say(nickId, '<b>Price change to approve</b>\n' + esc(unit.ref) + ' ' + esc(unit.name) + '\n' + usd(unit.price) + ' to ' + usd(price) + ' (' + (pct > 0 ? '+' : '') + pct + '%)' + (Math.abs(pct) > 15 ? '\nMore than 15 percent: please check it is right.' : '') + '\nAgent: ' + esc(unit.agentName), [[btn('Approve', 'pa:' + unit.ref), btn('Reject', 'pr:' + unit.ref)]]);
      return true;
    }
    const step = w.step;
    if (step === 'photos' && m.photo && m.photo.length) {
      w.photos = w.photos || [];
      if (w.photos.length < 5) w.photos.push(m.photo[m.photo.length - 1].file_id);
      const quiet = m.media_group_id && w.lastGroup === m.media_group_id && w.photos.length < 5;
      w.lastGroup = m.media_group_id || '';
      ctx.saveUser(u);
      if (!quiet) await say(chat, 'Photo added (' + w.photos.length + ' of 5).', [[btn('Done', 'aw:photos:done')], cancelRow]);
      return true;
    }
    if (!text) return true;
    if (step === 'name') {
      const name = text.replace(/\s+/g, ' ').slice(0, 60);
      if (name.length < 2) { await say(chat, 'Please type the project or building name.', [cancelRow]); return true; }
      w.d.name = name; await ask(chat, u, 'type'); return true;
    }
    if (step === 'price') {
      const p = numOf(text);
      if (!p) { await say(chat, 'Please send the price as a number, for example ' + (w.d.type === 'rent' ? '650' : '82000') + '.', [cancelRow]); return true; }
      w.d.price = p; await ask(chat, u, 'net'); return true;
    }
    if (step === 'net' || step === 'gross') {
      const skip = /^[-–—]$|^(skip|unknown|no)$/i.test(text.trim());
      const n = skip ? 0 : numOf(text);
      if (!skip && !n) { await say(chat, 'Please send the size in sqm as a number, or send - if you do not know.', [cancelRow]); return true; }
      w.d[step] = n;
      if (step === 'gross' && !w.d.net && !w.d.gross) { await say(chat, 'I need at least one size, net or gross. Please send the gross size in sqm.', [cancelRow]); return true; }
      await ask(chat, u, next(step)); return true;
    }
    if (step === 'floor') {
      const skip = /^[-–—]$|^(skip|unknown|no)$/i.test(text.trim());
      w.d.floor = skip ? '' : (text.match(/\d{1,3}/) || [''])[0];
      await ask(chat, u, 'area'); return true;
    }
    if (step === 'type' || step === 'beds' || step === 'area' || step === 'photos') { await say(chat, 'Please use the buttons.', [cancelRow]); return true; }
    return true;
  }

  // ---- buttons
  async function handleCallback(cb, u) {
    const data0 = cb.data || '', from = cb.from, chat = cb.message && cb.message.chat && cb.message.chat.id;
    const [kind, a, b] = data0.split(':');
    // Nick's decisions
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
        if (ch && unit.status === 'active') {
          const r = await postToChannel(ch, unit);
          await say(nickId, (r && r.ok === false) ? 'Could not post to ' + esc(ch.chat) + ': ' + esc(r.description || 'unknown error') : 'Posted to ' + esc(ch.chat) + '.');
        }
      } else if (kind === 'pa' && unit.pendingPrice) {
        const old = unit.price; unit.price = unit.pendingPrice.value; unit.pendingPrice = null; unit.checked = iso(); unit.nextCheckAt = iso(clock() + CHECK_DAYS * DAY); unit.askedAt = ''; unit.reminders = 0;
        data.setUnit(unit.ref, unit);
        await say(unit.agentId, esc(unit.ref) + ' price is now ' + usd(unit.price) + '.');
        await say(nickId, esc(unit.ref) + ' price changed from ' + usd(old) + ' to ' + usd(unit.price) + '.');
      } else if (kind === 'pr' && unit.pendingPrice) {
        unit.pendingPrice = null; data.setUnit(unit.ref, unit);
        await say(unit.agentId, 'The price change for ' + esc(unit.ref) + ' was not approved. The price stays ' + usd(unit.price) + '.');
        await say(nickId, 'Price change for ' + esc(unit.ref) + ' rejected.');
      }
      return true;
    }
    // everything else belongs to agents
    if (!isAgent(from.id)) return true;
    if (kind === 'am') {
      const unit = data.getUnit(a);
      if (!unit || unit.agentId !== u.id) return true;
      await say(chat, summary(unit) + '\nRef ' + esc(unit.ref), [[btn('Still available', 'ac:' + unit.ref + ':y'), btn('Sold', 'ac:' + unit.ref + ':s')], [btn('Price changed', 'ac:' + unit.ref + ':p')]]);
      return true;
    }
    if (kind === 'ac') {
      const unit = data.getUnit(a);
      if (!unit || unit.agentId !== u.id || !(unit.status === 'active' || unit.status === 'stale')) return true; // an agent can only act on their own live unit
      if (b === 'y') { await confirmAvailable(unit, chat); }
      else if (b === 's') {
        unit.status = 'sold'; data.setUnit(unit.ref, unit);
        const told = await ctx.tellAskersGone(unit.ref, unit.name);
        await say(chat, esc(unit.ref) + ' is marked sold and hidden from clients. Thank you.');
        if (nickId) await say(nickId, '<b>' + esc(unit.ref) + '</b> ' + esc(unit.name) + ' was marked sold by ' + esc(unit.agentName) + '. Hidden from clients' + (told ? '; ' + told + ' client(s) who asked were told' : '') + '.');
      } else if (b === 'p') { u.wiz = { step: 'newprice', ref: unit.ref }; ctx.saveUser(u); await say(chat, 'What is the new price in USD for ' + esc(unit.ref) + '? Current: ' + usd(unit.price), [cancelRow]); }
      return true;
    }
    if (kind === 'aw') {
      if (a === 'start') { u.wiz = { d: {}, photos: [] }; await ask(chat, u, 'name'); return true; }
      if (a === 'cancel') { u.wiz = null; ctx.saveUser(u); await say(chat, 'Cancelled.'); return true; }
      const w = u.wiz; if (!w) return true;
      if (a === 'submit') { if (w.step === 'confirm') await submit(chat, u, from); return true; }
      if (a === 'type' && w.step === 'type') { w.d.type = b === 'rent' ? 'rent' : 'buy'; await ask(chat, u, 'price'); return true; }
      if (a === 'beds' && w.step === 'beds') { w.d.beds = Number(b) || 0; await ask(chat, u, 'floor'); return true; }
      if (a === 'area' && w.step === 'area' && AREAS.includes(b)) { w.d.area = b; await ask(chat, u, 'photos'); return true; }
      if (a === 'photos' && b === 'done' && w.step === 'photos') { w.step = 'confirm'; await finishWizard(chat, u); return true; }
      return true;
    }
    return false;
  }

  return { handleMessage, handleCallback, listings, runChecks, isAgent, toListing };
}

module.exports = { createAgentArea, refPrefix };
