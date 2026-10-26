// Lines the glossary does not know are translated by Google's translator through a small Apps Script of Nick's
// (deploy/translator/Translator.gs). That translator is free only inside Apps Script, so the bot calls the script by its web address.
// Settings, in ~/.phc-secrets/nick-cambodia-bot.env: TRANSLATE_URL (the script's web app address) and TRANSLATE_KEY (a private key
// that the script checks). Without them the bot works as before and reports the lines it could not translate.
// Names are protected so a project or an area is never translated (BKK1 must not become Bangkok).
const KEEP = ['BKK1', 'BKK2', 'BKK3', 'TTP', 'Toul Kork', 'Tonle Bassac', 'Daun Penh', 'Chroy Changvar', 'Sen Sok', 'Chamkarmon', 'Koh Pich', 'Diamond Island', 'Phnom Penh'];

function createTranslator({ url, key, fetchImpl, timeoutMs }) {
  if (!url || !key) return null;
  const f = fetchImpl || fetch;
  return async function translate(lines, keep) {
    const list = (lines || []).map((x) => String(x || '').trim()).filter(Boolean);
    if (!list.length) return {};
    try {
      const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), timeoutMs || 20000);
      const r = await f(url, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify({ key, to: 'ja', from: 'en', lines: list, keep: KEEP.concat(keep || []).filter(Boolean) }), signal: ctl.signal, redirect: 'follow' });
      clearTimeout(timer);
      const j = await r.json();
      if (!j || !j.ok || !Array.isArray(j.out)) { console.error('Translator: ' + ((j && j.error) || 'no answer')); return {}; }
      const map = {};
      list.forEach((en, i) => { const jp = String(j.out[i] || '').trim(); if (jp && jp !== en) map[en] = jp; });
      return map;
    } catch (e) { console.error('Translator unreachable: ' + e.message); return {}; }
  };
}
module.exports = { createTranslator, KEEP };
