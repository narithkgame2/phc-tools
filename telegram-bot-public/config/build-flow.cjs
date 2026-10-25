// Builds config/flow.json from the Studio's Phase 1 export (config/phase1.source.json) plus the Phase 1 changes.
// Edit screens in the Studio, export, save as config/phase1.source.json, then run: node config/build-flow.cjs
const fs = require('fs'), path = require('path');
const LINE = 'https://line.me/ti/p/@615ueovq';
const src = JSON.parse(fs.readFileSync(path.join(__dirname, 'phase1.source.json'), 'utf8'));
const by = {}; src.forEach(s => by[s.id] = s);
function setTr(s, lang, t, b) { s.tr = s.tr || {}; s.tr[lang] = { t, b }; }
function request(id, back, enT, jpT, khT) {
  const s = by[id];
  s.title = s.title.replace('results', 'request');
  s.text = enT; s.notify = 'Search request';
  s.buttons = [{ l: 'Message Nick on LINE', to: '', half: false, url: LINE }, { l: 'Change my search', to: back, half: false, url: '' }, { l: 'Main menu', to: 'menu', half: false, url: '' }];
  setTr(s, 'jp', jpT, ['LINEでNickに相談', '条件を変更する', 'メインメニュー']);
  setTr(s, 'kh', khT, ['និយាយជាមួយ Nick តាម LINE', 'ប្តូរលក្ខខណ្ឌ', 'ម៉ឺនុយមេ']);
  s.note = 'Phase 1 has no listing database, so Nick prepares the three options by hand. Real listings come in a later phase.';
}
request('bres', 'b1',
  '<b>Your search is saved</b>\n<i>[search summary]</i>\n\nNick will prepare three honest options for this search and send them to you within 1 business day.\nYou can also message him now on LINE.',
  '<b>ご希望の条件を承りました</b>\n<i>[search summary]</i>\n\nNickがこの条件に合う物件を3件、数字つきで選び、1営業日以内にお送りします。\nお急ぎの場合は、今すぐLINEでもご相談いただけます。',
  '<b>យើងបានទទួលលក្ខខណ្ឌស្វែងរករបស់អ្នក</b>\n<i>[search summary]</i>\n\nNick នឹងជ្រើសរើសជម្រើសសមរម្យចំនួន 3 ជូនអ្នកក្នុងរយៈពេល 1 ថ្ងៃធ្វើការ។\nអ្នកក៏អាចផ្ញើសារទៅគាត់តាម LINE ភ្លាមៗបានដែរ។');
request('rres', 'rr1',
  '<b>Your search is saved</b>\n<i>[search summary]</i>\n\nNick will prepare three honest rental options for this search and send them to you within 1 business day.\nYou can also message him now on LINE.',
  '<b>ご希望の条件を承りました</b>\n<i>[search summary]</i>\n\nNickがこの条件に合う賃貸物件を3件選び、1営業日以内にお送りします。\nお急ぎの場合は、今すぐLINEでもご相談いただけます。',
  '<b>យើងបានទទួលលក្ខខណ្ឌស្វែងរករបស់អ្នក</b>\n<i>[search summary]</i>\n\nNick នឹងជ្រើសរើសជម្រើសសម្រាប់ជួលចំនួន 3 ជូនអ្នកក្នុងរយៈពេល 1 ថ្ងៃធ្វើការ។\nអ្នកក៏អាចផ្ញើសារទៅគាត់តាម LINE ភ្លាមៗបានដែរ។');
// results no longer branch to refine or "no match"
['bref', 'nores', 'offline'].forEach(id => delete by[id]);
by.more.tr.kh.b[0] = 'ពិនិត្យបញ្ជីអចលនទ្រព្យ'; // shorter, so Telegram does not cut it
// lead 3: LINE or Telegram only (WhatsApp is for non-Japanese leads, phone needs a number the bot does not collect)
const l3 = by.lead3;
[3, 2].forEach(i => { l3.buttons.splice(i, 1); ['jp', 'kh'].forEach(g => l3.tr && l3.tr[g] && l3.tr[g].b && l3.tr[g].b.splice(i, 1)); });
// free text steps: the client types, the bot reads it
by.calc1.await = 'calc'; by.check1.await = 'check';
[by.calc1, by.check1].forEach(s => { s.buttons = s.buttons.filter(b => !/^Simulate/.test(b.l)); if (s.tr) ['jp', 'kh'].forEach(g => { if (s.tr[g] && s.tr[g].b) s.tr[g].b = s.tr[g].b.filter(x => !/^Simulate/.test(x)); }); });
// buy budget: 4 bands plus "not decided" (decided with Nick 2026-10-24, from the budgets his Japanese clients really have)
(function () {
  const b1 = by.b1, last = b1.buttons[b1.buttons.length - 1];
  const en = ['Under $50,000', '$50,000 to $100,000', '$100,000 to $200,000', 'Above $200,000', 'Not decided yet'];
  const jp = ['5万ドル未満', '5万から10万ドル', '10万から20万ドル', '20万ドル以上', 'まだ決めていない'];
  const kh = ['តិចជាង $50,000', '$50,000 ដល់ $100,000', '$100,000 ដល់ $200,000', 'លើស $200,000', 'មិនទាន់សម្រេច'];
  const jpLast = b1.tr.jp.b[b1.tr.jp.b.length - 1], khLast = b1.tr.kh.b[b1.tr.kh.b.length - 1];
  b1.buttons = en.map(l => ({ l, to: 'b2', half: false, url: '' })).concat([last]);
  b1.tr.jp.b = jp.concat([jpLast]); b1.tr.kh.b = kh.concat([khLast]);
  b1.note = 'Four bands from what Nick\'s Japanese clients actually have, plus "not decided". Nick asks the exact budget on LINE.';
})();
// rent budget: same pattern, four bands plus "not decided" (Nick accepted the bands 2026-10-24)
(function () {
  const r1 = by.rr1, last = r1.buttons[r1.buttons.length - 1];
  const en = ['Under $500', '$500 to $800', '$800 to $1,500', 'Above $1,500', 'Not decided yet'];
  const jp = ['500ドル未満', '500から800ドル', '800から1,500ドル', '1,500ドル以上', 'まだ決めていない'];
  const kh = ['តិចជាង $500', '$500 ដល់ $800', '$800 ដល់ $1,500', 'លើស $1,500', 'មិនទាន់សម្រេច'];
  const jpLast = r1.tr.jp.b[r1.tr.jp.b.length - 1], khLast = r1.tr.kh.b[r1.tr.kh.b.length - 1];
  r1.buttons = en.map(l => ({ l, to: 'rr2', half: false, url: '' })).concat([last]);
  r1.tr.jp.b = jp.concat([jpLast]); r1.tr.kh.b = kh.concat([khLast]);
})();
// districts (decided with Nick 2026-10-25): six buttons in three rows of two (five areas and "Others"), then Back.
// "Others" opens a screen where the client types an area or a project name, or taps "No preference".
(function () {
  const en = ['Daun Penh', 'Tonle Bassac', 'BKK1', 'TTP', 'Toul Kork', 'Others'];
  const jp = ['ダウンペン', 'トンレバサック', 'BKK1', 'TTP', 'トゥールコック', 'その他'];
  const kh = ['ដូនពេញ', 'ទន្លេបាសាក់', 'BKK1', 'TTP', 'ទួលគោក', 'ផ្សេងៗ'];
  function make(id, next, other) {
    const s = by[id], back = s.buttons[s.buttons.length - 1];
    const jpBack = s.tr.jp.b[s.tr.jp.b.length - 1], khBack = s.tr.kh.b[s.tr.kh.b.length - 1];
    s.buttons = en.map((l, i) => ({ l, to: i === 5 ? other : next, half: true, url: '' })).concat([back]);
    s.tr.jp.b = jp.concat([jpBack]); s.tr.kh.b = kh.concat([khBack]);
    s.note = 'Three rows of two, then Back. TTP is Toul Tompoung. Others opens a screen to type an area or project name, or to skip.';
    const o = JSON.parse(JSON.stringify(s));
    o.id = other; o.title = id === 'b2' ? 'Buy 2: Others (typed)' : 'Rent 2: Others (typed)';
    o.text = '<b>Other area</b>\n\nType the area or the project name in the message box below, then press send.\n<i>Example: BKK3, Time Square 8</i>\n\nNo preference? Tap the button.';
    o.buttons = [{ l: 'No preference', to: next, half: false, url: '' }, { l: 'Back', to: id, half: false, url: '' }];
    o.tr = {
      jp: { t: '<b>その他のエリア</b>\n\n下のメッセージ欄に、エリア名または物件名を入力して送信してください。\n<i>例: BKK3、Time Square 8</i>\n\n特にご希望がなければ、下のボタンを押してください。', b: ['指定なし', '戻る'] },
      kh: { t: '<b>តំបន់ផ្សេងទៀត</b>\n\nសូមវាយឈ្មោះតំបន់ ឬឈ្មោះគម្រោង នៅក្នុងប្រអប់សារខាងក្រោម រួចចុចផ្ញើ។\n<i>ឧទាហរណ៍៖ BKK3, Time Square 8</i>\n\nបើគ្មានចំណូលចិត្តពិសេស សូមចុចប៊ូតុងខាងក្រោម។', b: ['មិនកំណត់', 'ត្រឡប់ក្រោយ'] },
    };
    o.await = 'area:' + next + ':' + id; o.note = 'The next message the client types is saved as the area, then the search request is sent. No preference skips it.';
    by[other] = o;
  }
  make('b2', 'bres', 'b2other'); make('rr2', 'rres', 'rr2other');
})();
// budget screens: buttons only on screen. If a client types a number anyway, the next message is saved as the budget.
[['b1', 'b2'], ['rr1', 'rr2']].forEach(([id, next]) => { by[id].await = 'area:' + next + ':' + id; });
// steps that tell Nick
by.leaddone.notify = 'Ask Nick'; by.tourok.notify = 'Tour request'; by.check2.notify = 'Listing to check';
const keep = Object.keys(by);
const order = []; src.forEach(s => { if (by[s.id]) order.push(s.id); if (s.id === 'b2') order.push('b2other'); if (s.id === 'rr2') order.push('rr2other'); });
const steps = order.map(id => by[id]);
steps.forEach(s => s.buttons = s.buttons.filter(b => b.url || !b.to || keep.includes(b.to)));
fs.writeFileSync(path.join(__dirname, 'flow.json'), JSON.stringify({ line: LINE, steps }, null, 1));
console.log('flow.json written:', steps.length, 'steps');
