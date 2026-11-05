// The link to the backup in Google Apps Script (deploy/backup/NickBot_Backup.gs), which answers clients while this Mac is off.
// Every minute: "the Mac is alive", plus the screens, texts and client languages whenever they changed, so the backup answers
// exactly like the Mac. The answer lists what the backup did while the Mac was off and could not finish itself (listings,
// photos, alerts, CRM rows); bot.replay finishes each one and the next heartbeat confirms it (ack), so nothing runs twice.
// Off (returns null) until BACKUP_URL and BACKUP_KEY are set by deploy/backup/setup-backup.sh.
const crypto = require('crypto');

const hashOf = (o) => crypto.createHash('sha1').update(JSON.stringify(o)).digest('hex').slice(0, 16);

// what the backup needs to draw the same screens as the Mac
function backupConfig({ flow, MSG, GUIDE, MEDIA_BASE, commandList, nickId, testers, priv, guides }) {
  const g = {};
  Object.keys(guides || {}).forEach((k) => { const x = guides[k]; if (x && x.fileId) g[k] = { fileId: x.fileId, title: x.title || '' }; });
  return { v: 1, flow, msg: MSG, guide: GUIDE, media: MEDIA_BASE, cmds: { jp: commandList('jp'), en: commandList('en'), kh: commandList('kh') }, nickId: String(nickId || ''), testers: (testers || []).map(String), priv: !!priv, guides: g };
}

function createBackupLink({ url, key, fetchImpl, config, live, replay, log }) {
  if (!url || !key) return null;
  const f = fetchImpl || ((...a) => fetch(...a));
  const say = log || (() => {});
  let held = '', lheld = '', ack = 0, failing = false, busy = false;
  async function beat() {
    if (busy) return false; // a slow answer from Google: never two heartbeats at once
    busy = true;
    try {
      const cfg = config(), lv = live(), hash = hashOf(cfg), lhash = hashOf(lv);
      const body = { t: Date.now(), url, hash, lhash, ack };
      if (hash !== held) body.cfg = cfg;
      if (lhash !== lheld) body.live = lv;
      let j = null;
      try {
        const r = await f(url + '?a=sync&k=' + encodeURIComponent(key), { method: 'POST', headers: { 'Content-Type': 'text/plain' }, redirect: 'follow', body: JSON.stringify(body) });
        j = await r.json();
      } catch (e) { j = { ok: false, error: e.message }; }
      if (!j || !j.ok) {
        if (!failing) say('Backup not reachable (' + ((j && j.error) || 'no answer') + '). The bot itself is fine.');
        failing = true; return false;
      }
      if (failing) say('Backup reachable again.');
      failing = false;
      held = j.hash || ''; lheld = j.lhash || ''; // what the backup really holds: anything else is sent again next time
      for (const it of j.delta || []) {
        try { await replay(it); } catch (e) { say('Backup item ' + it.k + ' for ' + it.id + ' failed: ' + e.message); }
        ack = Math.max(ack, Number(it.s) || 0);
      }
      return true;
    } finally { busy = false; }
  }
  return { beat };
}

module.exports = { createBackupLink, backupConfig, hashOf };
