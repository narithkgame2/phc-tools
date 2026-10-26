// Translator for @Nick_Cambodia_Bot. A separate, tiny Apps Script: it does NOT touch the Content Bot or any Sheet.
// It receives a few English lines, translates them with Google's translator (free inside Apps Script) and returns them.
// Names in "keep" are marked "do not translate", the same way the Content Bot protects them.
//
// Setup (once): Project Settings > Script Properties > add TRANSLATE_KEY = the same private key as in the bot's settings file.
// Deploy > New deployment > Web app > Execute as: Me > Who has access: Anyone. Copy the web app URL into the bot's settings file.

function doPost(e) {
  var out;
  try {
    var body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    var key = PropertiesService.getScriptProperties().getProperty('TRANSLATE_KEY');
    if (!key || body.key !== key) return json({ ok: false, error: 'not allowed' });
    var lines = (body.lines || []).slice(0, 40).map(function (x) { return String(x).slice(0, 500); });
    var keep = (body.keep || []).slice(0, 60);
    out = lines.map(function (line) { return translateKeeping(line, body.from || 'en', body.to || 'ja', keep); });
    return json({ ok: true, out: out });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}

function doGet() { return json({ ok: true, service: 'nick-cambodia-translator' }); }

function translateKeeping(text, from, to, keep) {
  var esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); };
  var marked = esc(text);
  var used = [];
  keep.sort(function (a, b) { return b.length - a.length; }).forEach(function (k) {
    var re = new RegExp('\\b' + k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'g');
    if (re.test(marked)) { used.push(k); marked = marked.replace(re, '<span translate="no">' + esc(k) + '</span>'); }
  });
  var res;
  try { res = LanguageApp.translate(marked, from, to, { contentType: 'html' }).replace(/<\/?span[^>]*>/gi, ''); }
  catch (e) { res = LanguageApp.translate(text, from, to); }
  res = res.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'").replace(/&quot;/g, '"');
  // safety net: if the translator still changed a protected name, put the original back
  used.forEach(function (k) { if (res.indexOf(k) === -1 && /bangkok|バンコク/i.test(res) && /^BKK/.test(k)) res = res.replace(/バンコク|Bangkok/i, k); });
  return res;
}

function json(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
