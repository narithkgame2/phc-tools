// Static checks on config/flow.json: every screen reachable, wording rules, button limits, three languages.
const assert = require('assert');
const flow = require('../config/flow.json');
const R = require('../engines/render.js');
let passed = 0, total = 0;
function t(name, fn) { total++; try { fn(); passed++; console.log(`  ✅ Test ${total}: ${name}`); } catch (e) { console.log(`  ❌ Test ${total}: ${name}\n     ${e.message}`); } }
const steps = flow.steps, ids = new Set(steps.map((s) => s.id));
const allTexts = (s) => ['en', 'jp', 'kh'].map((l) => R.textOf(s, l) + '\n' + s.buttons.map((b, i) => R.labelOf(s, i, l)).join('\n'));
const cp = (x) => Array.from(String(x)).length;

t('every button points to a real screen or a URL', () => steps.forEach((s) => s.buttons.forEach((b) => assert.ok(b.url || b.cb || ids.has(b.to), s.id + ' -> ' + b.to))));
t('every screen is reachable from the menu or a command', () => {
  const seen = new Set(['start', 'menu', 'b1', 'rr1', 'tour', 'calc1', 'calc2', 'check2', 'refused', 'unknown', 'error']);
  let grew = true;
  while (grew) { grew = false; steps.forEach((s) => { if (seen.has(s.id)) s.buttons.forEach((b) => { if (b.to && !seen.has(b.to)) { seen.add(b.to); grew = true; } }); }); }
  steps.forEach((s) => assert.ok(seen.has(s.id), 'unreachable: ' + s.id));
});
t('every screen has Japanese and Khmer text and matching button counts', () => steps.forEach((s) => ['jp', 'kh'].forEach((l) => {
  assert.ok(s.tr && s.tr[l] && s.tr[l].t, s.id + ' missing ' + l);
  assert.strictEqual((s.tr[l].b || []).length, s.buttons.length, s.id + ' ' + l + ' button count');
})));
t('buttons never get cut: shared row 14 characters, full row 28', () => steps.forEach((s) => ['en', 'jp', 'kh'].forEach((l) => s.buttons.forEach((b, i) => {
  const lab = R.labelOf(s, i, l); assert.ok(cp(lab) <= (b.half ? 14 : 28), `${s.id} ${l} "${lab}" is ${cp(lab)}`);
}))));
t('banned words never appear in any language', () => steps.forEach((s) => allTexts(s).forEach((x) => assert.ok(!/高利回り|非公開|最大級|off[- ]market/i.test(x), s.id))));
t('PHC, REAKH and their links never appear', () => steps.forEach((s) => allTexts(s).forEach((x) => assert.ok(!/PHC|Property Hub|propertyhubcambodia|REAKH|Realestate\.com\.kh|t\.me\/Nick_REAKH/i.test(x), s.id))));
t('every Talk to Nick or LINE button opens the official LINE link', () => steps.forEach((s) => s.buttons.forEach((b) => {
  if (/talk to nick|message nick|Nickに相談|LINEで/i.test(b.l)) assert.strictEqual(b.url, 'https://line.me/ti/p/@615ueovq', s.id + ' ' + b.l);
  if (b.url) assert.strictEqual(b.url, 'https://line.me/ti/p/@615ueovq', s.id + ' non-LINE link');
})));
t('every screen that shows a yield carries the standard disclaimer', () => steps.forEach((s) => ['en', 'jp'].forEach((l) => {
  const x = R.textOf(s, l); if (/yield|利回り/i.test(x)) assert.ok(/for reference only|参考値/.test(x), s.id + ' ' + l);
})));
t('no invented numbers: only the estimate screen shows a percentage', () => steps.forEach((s) => {
  if (s.id === 'calc2' || /^faq/.test(s.id)) return; ['en', 'jp'].forEach((l) => assert.ok(!/\d\s*[%％]/.test(R.textOf(s, l)), s.id + ' ' + l));
}));
t('the reply promise is 1 business day wherever one is made', () => steps.forEach((s) => {
  const en = R.textOf(s, 'en'); if (/within/i.test(en)) assert.ok(/1 business day/.test(en), s.id);
}));
t('every placeholder has a source (only known ones remain)', () => steps.forEach((s) => ['en', 'jp', 'kh'].forEach((l) => {
  (R.textOf(s, l).match(/\[[^\]]+\]/g) || []).forEach((p) => assert.ok(['[search summary]', '[amount]', '[result]', '[day]', '[time]', '[in person or video]'].includes(p), s.id + ' ' + p));
})));
t('callback data stays under 64 bytes', () => steps.forEach((s) => R.keyboard(s, 'en').inline_keyboard.forEach((row) => row.forEach((b) => b.callback_data && assert.ok(Buffer.byteLength(b.callback_data) < 64)))));

t('buy budget has four bands plus not decided, in all languages, with no gaps in the wording', () => {
  const b1 = steps.find((s) => s.id === 'b1');
  assert.strictEqual(b1.buttons.length, 6); // five choices and Main menu
  assert.deepStrictEqual(b1.buttons.slice(0, 5).map((b) => b.l), ['Under $50,000', '$50,000 to $100,000', '$100,000 to $200,000', 'Above $200,000', 'Not decided yet']);
  assert.deepStrictEqual(b1.tr.jp.b.slice(0, 5), ['5万ドル未満', '5万から10万ドル', '10万から20万ドル', '20万ドル以上', 'まだ決めていない']);
  assert.ok(b1.buttons.slice(0, 5).every((b) => b.to === 'b2'));
});

t('rent budget has four bands plus not decided', () => {
  const r1 = steps.find((s) => s.id === 'rr1');
  assert.deepStrictEqual(r1.buttons.slice(0, 5).map((b) => b.l), ['Under $500', '$500 to $800', '$800 to $1,500', 'Above $1,500', 'Not decided yet']);
  assert.deepStrictEqual(r1.tr.jp.b.slice(0, 5), ['500ドル未満', '500から800ドル', '800から1,500ドル', '1,500ドル以上', 'まだ決めていない']);
});

t('buttons fit by display width (full-width Japanese counts double): shared row 14, full row 28', () => {
  const wd = (str) => Array.from(String(str)).reduce((w, ch) => { const c = ch.codePointAt(0);
    if ((c >= 0x3000 && c <= 0x9FFF) || (c >= 0xFF00 && c <= 0xFFEF)) return w + 2;
    if (c >= 0x1780 && c <= 0x17FF) return w + (((c >= 0x17B6 && c <= 0x17D3) || c === 0x17DD) ? 0 : 1.2);
    return w + 1; }, 0);
  steps.forEach((s) => ['en', 'jp', 'kh'].forEach((l) => s.buttons.forEach((b, i) => {
    const lab = R.labelOf(s, i, l), w = wd(lab); assert.ok(w <= (b.half ? 14 : 28), `${s.id} ${l} "${lab}" is ${w} wide`);
  })));
});

console.log(`\nRESULTS: ${passed} / ${total} TESTS PASSED (${Math.round(passed / total * 100)}%)`);
process.exit(passed === total ? 0 : 1);
