// Operations behind the bot: event counting, the reply-time watchdog, the Monday numbers and price drop detection.
// Everything is counted from what the bot really saw. Telegram cannot tell the bot when someone taps a LINE link, so LINE taps are not counted.
const DAY = 86400000;
const SLA_STEPS_MIN = [60, 240, 1440]; // reminders to Nick after 1 hour, 4 hours and 1 day without a reply

function createOps(ctx) {
  const { api, nickId, clock, state, events, rawListings, alerts, L, esc } = ctx;
  const ict = (t) => new Date(t + 7 * 3600000), jst = (t) => new Date(t + 9 * 3600000);
  const track = (type, data) => events.add(Object.assign({ t: clock(), type }, data || {}));
  const usd = (n) => '$' + Math.round(n).toLocaleString('en-US');

  // ---- reply-time watchdog: every question a client asks about a unit must get Nick's answer
  const asks = () => state.get('_asks') || {};
  const saveAsks = (o) => state.set('_asks', o);
  function askOpened(ref, client, name, label) {
    const o = asks(); o[ref + '|' + client] = { ref, client, name, label: label || String(client), at: clock(), lvl: 0 }; saveAsks(o);
  }
  function askClosed(ref, client) {
    const o = asks(), k = ref + '|' + client, a = o[k];
    if (!a) return null;
    delete o[k]; saveAsks(o); track('reply', { ref, ms: clock() - a.at });
    return clock() - a.at;
  }
  function closeRef(ref) { const o = asks(); Object.keys(o).forEach((k) => { if (o[k].ref === ref) delete o[k]; }); saveAsks(o); }
  async function runSla() {
    const t = clock(), hour = ict(t).getUTCHours();
    if (!nickId || hour < 7 || hour >= 21) return 0; // no reminders at night in Phnom Penh
    const o = asks(); let n = 0, dirty = false;
    for (const k of Object.keys(o)) {
      const a = o[k], ageMin = (t - a.at) / 60000;
      if (a.lvl >= SLA_STEPS_MIN.length || ageMin < SLA_STEPS_MIN[a.lvl]) continue;
      const h = Math.floor(ageMin / 60), when = h >= 1 ? h + ' hour' + (h > 1 ? 's' : '') : Math.round(ageMin) + ' minutes';
      await api('sendMessage', { chat_id: nickId, text: '<b>No reply yet</b>\n' + esc(a.label) + ' asked about ' + esc(a.ref + ' ' + a.name) + ' ' + when + ' ago.\nOpen chat: tg://user?id=' + a.client,
        parse_mode: 'HTML', reply_markup: { inline_keyboard: [[{ text: 'Available', callback_data: 'v:a:' + a.ref + ':' + a.client }, { text: 'Not available', callback_data: 'v:n:' + a.ref + ':' + a.client }], [{ text: 'Checking now', callback_data: 'v:c:' + a.ref + ':' + a.client }]] } });
      a.lvl += 1; dirty = true; n++;
    }
    if (dirty) saveAsks(o);
    return n;
  }

  // ---- the Monday numbers
  const median = (xs) => { if (!xs.length) return 0; const s = xs.slice().sort((a, b) => a - b), m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
  const mins = (ms) => (ms >= 3600000 ? (ms / 3600000).toFixed(1) + ' hours' : Math.round(ms / 60000) + ' minutes');
  function weekCounts(from, to) {
    const ev = events.since(from).filter((e) => e.t < to), c = (ty) => ev.filter((e) => e.type === ty);
    const asksE = c('ask'), replies = c('reply'), refs = {};
    asksE.forEach((e) => { refs[e.ref] = (refs[e.ref] || 0) + 1; });
    return { newClients: c('new').length, searches: c('search').length, shown: c('search').reduce((a, e) => a + (e.n || 0), 0), empty: c('search').filter((e) => !e.n).length,
      asks: asksE.length, askedRefs: Object.keys(refs).length, top: Object.entries(refs).sort((a, b) => b[1] - a[1]).slice(0, 3), replied: replies.length, medianMs: median(replies.map((e) => e.ms)),
      alertsOn: c('alert_on').length, alertsSent: c('alert_sent').length, dropsSent: c('drop_sent').length, deeplinks: c('deeplink').length, compares: c('compare').length,
      leads: c('lead').length, tours: c('tour').length, submitted: c('agent_submit').length, approved: c('agent_approve').length, sold: c('agent_sold').length };
  }
  function digestText() {
    const t = clock(), cur = weekCounts(t - 7 * DAY, t + 1), prev = weekCounts(t - 14 * DAY, t - 7 * DAY);
    const d = (n, p) => n + ' (before: ' + p + ')';
    const fmt = (x) => ict(x).toISOString().slice(0, 10);
    const waiting = Object.keys(asks()).length;
    const lines = ['<b>Weekly numbers</b>', fmt(t - 7 * DAY) + ' to ' + fmt(t - DAY) + ', Phnom Penh time', '',
      'New clients: ' + d(cur.newClients, prev.newClients), 'Searches: ' + d(cur.searches, prev.searches) + (cur.empty ? ', ' + cur.empty + ' found nothing' : ''), 'Listings shown: ' + d(cur.shown, prev.shown),
      'Questions about a unit (Ask): ' + d(cur.asks, prev.asks) + ' on ' + cur.askedRefs + ' different units',
      'Your replies: ' + cur.replied + ' of ' + cur.asks + (cur.replied ? ', typical reply time ' + mins(cur.medianMs) : '') + (waiting ? '. Waiting now: ' + waiting : ''),
      'Viewing requests: ' + cur.tours + '. Talk to Nick forms: ' + cur.leads,
      'New listing alerts: ' + cur.alertsOn + ' switched on, ' + cur.alertsSent + ' sent. Price drop messages: ' + cur.dropsSent,
      'Opened from a unit link: ' + cur.deeplinks + '. Compare used: ' + cur.compares,
      'Agents: ' + cur.submitted + ' submitted, ' + cur.approved + ' approved, ' + cur.sold + ' sold'];
    if (cur.top.length) lines.push('', 'Most asked: ' + cur.top.map(([r, n]) => r + ' (' + n + ')').join(', '));
    lines.push('', 'Telegram cannot count taps on the contact buttons, so chats on LINE (Japanese clients) and on your own Telegram (English and Khmer clients) are not in these numbers. Check those apps for them.');
    return lines.join('\n');
  }
  async function runDigest() {
    const t = clock(), x = ict(t), hour = x.getUTCHours();
    if (!nickId || x.getUTCDay() !== 1 || hour < 9 || hour >= 19) return 0; // Monday 9:00 to 19:00 in Phnom Penh
    const key = x.toISOString().slice(0, 10), meta = state.get('_meta') || {};
    if (meta.digest === key) return 0;
    meta.digest = key; state.set('_meta', meta);
    await api('sendMessage', { chat_id: nickId, text: digestText(), parse_mode: 'HTML' });
    return 1;
  }

  // ---- price drops: any listing, from any source, whose price goes down by 1 percent or more
  const priceOf = (l) => (l.type === 'buy' ? l.price : l.rent);
  async function runPriceDrops(sendDrop) {
    const t = clock(), listings = (await rawListings()).filter((l) => !l.preview && priceOf(l) > 0);
    const known = state.get('_prices'), prices = known || {};
    let pending = state.get('_drops') || [];
    listings.forEach((l) => {
      const now = priceOf(l), old = prices[l.id];
      // the price to beat is the last price that was reported or the highest it has been since: small cuts add up
      if (known && old && now <= old * 0.99) { pending.push({ ref: l.id, old, now, at: t, sent: [] }); prices[l.id] = now; }
      else if (!old || now > old) prices[l.id] = now;
    });
    state.set('_prices', prices);
    const hour = jst(t).getUTCHours();
    if (hour < 9 || hour >= 21) { state.set('_drops', pending); return 0; }
    let n = 0;
    pending = pending.filter((d) => t - d.at < 3 * DAY);
    for (const d of pending) {
      const l = listings.find((x) => x.id === d.ref); if (!l) continue;
      const to = new Map();
      alerts.all().forEach((a) => { if (a.kind === l.type && L.match([Object.assign({}, l)], a.kind, a.keys, 1).length) to.set(String(a.id), a.lang || 'jp'); });
      ((state.get(d.ref) || {}).askers || []).forEach((x) => { if (t - Date.parse(x.at) <= 30 * DAY) to.set(String(x.id), x.lang || 'jp'); });
      for (const [id, lang] of to) {
        if (d.sent.includes(id)) continue;
        const r = await sendDrop(id, lang, l, d.old);
        d.sent.push(id); if (!(r && r.ok === false)) { track('drop_sent', { ref: d.ref }); n++; }
      }
    }
    state.set('_drops', pending);
    return n;
  }

  return { track, askOpened, askClosed, closeRef, runSla, digestText, runDigest, runPriceDrops, weekCounts };
}
module.exports = { createOps };
