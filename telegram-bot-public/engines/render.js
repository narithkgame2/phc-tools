// Turns a flow step into a Telegram message: text in the client's language, filled placeholders, inline keyboard.
// Half-width buttons share a row in pairs; everything else gets its own row.

const LANGS = ['jp', 'en', 'kh'];
const LANG_BUTTONS = ['en', 'jp', 'kh']; // order of the buttons on the language screen

function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

function textOf(step, lang) {
  const t = lang !== 'en' && step.tr && step.tr[lang] && step.tr[lang].t;
  return t || step.text;
}
function labelOf(step, i, lang) {
  const t = lang !== 'en' && step.tr && step.tr[lang] && step.tr[lang].b && step.tr[lang].b[i];
  return t || step.buttons[i].l;
}
function fill(text, vars) {
  let out = text;
  Object.keys(vars || {}).forEach(function (k) { out = out.split('[' + k + ']').join(vars[k]); });
  return out;
}
function keyboard(step, lang) {
  const rows = [];
  let pending = null;
  step.buttons.forEach(function (b, i) {
    const label = labelOf(step, i, lang);
    const btn = b.url ? { text: label, url: b.url } : { text: label, callback_data: (b.cb ? b.cb : step.id === 'start' ? 'l:' + LANG_BUTTONS[i] : 'g:' + step.id + ':' + i) };
    if (b.half) {
      if (pending) { rows.push([pending, btn]); pending = null; } else pending = btn;
    } else {
      if (pending) { rows.push([pending]); pending = null; }
      rows.push([btn]);
    }
  });
  if (pending) rows.push([pending]);
  return { inline_keyboard: rows };
}
function render(step, lang, vars) {
  return { text: fill(textOf(step, lang), vars), parse_mode: 'HTML', reply_markup: keyboard(step, lang), disable_web_page_preview: true };
}
module.exports = { LANGS, LANG_BUTTONS, esc, textOf, labelOf, fill, keyboard, render };
