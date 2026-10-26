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
  s.buttons = [{ l: 'Message Nick on LINE', to: '', half: false, url: LINE }, { l: 'Alert me to new matches', to: '', half: false, url: '', cb: 'al:on' }, { l: 'Change my search', to: back, half: false, url: '' }, { l: 'Main menu', to: 'menu', half: false, url: '' }];
  setTr(s, 'jp', jpT, ['LINEでNickに相談', '新着物件を通知する', '条件を変更する', 'メインメニュー']);
  setTr(s, 'kh', khT, ['និយាយជាមួយ Nick តាម LINE', 'ជូនដំណឹងពេលមានថ្មី', 'ប្តូរលក្ខខណ្ឌ', 'ម៉ឺនុយមេ']);
  s.note = 'Matching listings from the Sheet are shown above this screen when there are any. Either way Nick checks availability by hand and replies within 1 business day.';
}
request('bres', 'b1',
  '<b>Your search is saved</b>\n<i>[search summary]</i>\n\nNick will check availability and send you the three best options for this search within 1 business day.\nYou can also message him now on LINE.',
  '<b>ご希望の条件を承りました</b>\n<i>[search summary]</i>\n\nNickが空室状況を確認し、この条件に合う物件を3件、数字つきで1営業日以内にお送りします。\nお急ぎの場合は、今すぐLINEでもご相談いただけます。',
  '<b>យើងបានទទួលលក្ខខណ្ឌស្វែងរករបស់អ្នក</b>\n<i>[search summary]</i>\n\nNick នឹងពិនិត្យភាពអាចរកបាន ហើយផ្ញើជម្រើសល្អបំផុតចំនួន 3 ជូនអ្នកក្នុងរយៈពេល 1 ថ្ងៃធ្វើការ។\nអ្នកក៏អាចផ្ញើសារទៅគាត់តាម LINE ភ្លាមៗបានដែរ។');
request('rres', 'rr1',
  '<b>Your search is saved</b>\n<i>[search summary]</i>\n\nNick will check availability and send you the three best rental options for this search within 1 business day.\nYou can also message him now on LINE.',
  '<b>ご希望の条件を承りました</b>\n<i>[search summary]</i>\n\nNickが空室状況を確認し、この条件に合う賃貸物件を3件、1営業日以内にお送りします。\nお急ぎの場合は、今すぐLINEでもご相談いただけます。',
  '<b>យើងបានទទួលលក្ខខណ្ឌស្វែងរករបស់អ្នក</b>\n<i>[search summary]</i>\n\nNick នឹងពិនិត្យភាពអាចរកបាន ហើយផ្ញើជម្រើសសម្រាប់ជួលល្អបំផុតចំនួន 3 ជូនអ្នកក្នុងរយៈពេល 1 ថ្ងៃធ្វើការ។\nអ្នកក៏អាចផ្ញើសារទៅគាត់តាម LINE ភ្លាមៗបានដែរ។');
// wording fixes found in the Japanese review: the bot has no favourites and no keyword search, so the screens must not mention them
function retext(id, en, jp, kh) { const s = by[id]; s.text = en; s.tr.jp.t = jp; s.tr.kh.t = kh; }
retext('forget',
  '<b>Delete my data</b>\n\nThis removes your saved searches, new listing alerts and enquiry history.\nTap Confirm to delete.',
  '<b>データの削除</b>\n\n保存した検索条件、新着通知の設定、相談履歴を削除します。\n「確認」をタップすると削除されます。',
  '<b>លុបទិន្នន័យរបស់ខ្ញុំ</b>\n\nវានឹងលុបការស្វែងរកដែលបានរក្សាទុក ការជូនដំណឹងអំពីបញ្ជីថ្មី និងប្រវត្តិសាកសួរ។\nចុច \"បញ្ជាក់\" ដើម្បីលុប។');
retext('unknown',
  '<b>I did not catch that</b>\n\nPlease pick an option below.',
  '<b>うまく理解できませんでした</b>\n\n下のメニューから選んでください。',
  '<b>ខ្ញុំមិនយល់ទេ</b>\n\nសូមជ្រើសរើសជម្រើសខាងក្រោម។');
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
// FAQ (Part 4): facts from the website FAQ, no company names, no contact channels other than the LINE button.
// Japanese wording needs a native review before launch. Khmer uses the English text for now (placeholder).
(function () {
  const LINEBTN = { l: 'Message Nick on LINE', to: '', half: false, url: LINE };
  const items = [
    // faq1 to faq4 follow the Trusted Agent training app (Nick, 2026-10-26: it holds the newest figures, from the Cambodia Condo Investment Guide 2026)
    ['faq1', 'Foreign ownership', '外国人の所有', 'Foreign ownership',
      '<b>Can foreigners own property in Cambodia?</b>\n\nYes, under 3 rules.\n1. From the first floor up, in your own name. The ground floor cannot be in a foreigner\'s own name.\n2. At most 70% of the units in one building can be owned by foreigners (the foreign quota). Check how much is left before you choose.\n3. The unit must have a strata title, registered with the national Ministry of Land Management. A soft title is for Cambodian citizens only.\n\nForeigners cannot own land in their own name. Buildings from before 2010, or without a strata licence, cannot give a strata title.',
      '<b>外国人は不動産を所有できますか？</b>\n\nはい。3つのルールがあります。\n1. 地上階（グラウンドフロア）より上の部屋なら、ご本人の名義で所有できます。グラウンドフロアは外国人本人の名義にはできません。\n2. 外国人が所有できるのは、1棟の全戸数の70%までです（外国人枠）。購入前に残りの枠を確認します。\n3. ストラタタイトル（国の土地管理省に登録される区分所有の権利証）が必要です。ソフトタイトルはカンボジア国民のみが対象です。\n\n土地そのものは、外国人本人の名義では所有できません。2010年以前の建物や、ストラタの許可がない建物では、ストラタタイトルが発行されません。'],
    ['faq2', 'Extra costs', '購入にかかる費用', 'Extra costs',
      '<b>What you pay, start to finish</b>\n\nBooking fee: usually $500 to $2,000, counted toward the down payment\nDown payment: 20 to 30% of the price, when you sign the contract (SPA)\nTransfer tax: 4% of the value (exemptions may apply)\nLegal and contract review: 0.5 to 1% of the value\nFurniture and fit-out: varies, often $5,000 to $15,000\n\nAfter you buy:\nYearly property tax: 0.1% of 80% of the value, above the first $25,000 (about $95 a year on a $150,000 unit)\nBuilding management: $1 to $2 per sqm a month\n\nSome developers pay the transfer tax as a promotion. Nick confirms the exact figures for each project.',
      '<b>購入から保有までにかかる費用</b>\n\n予約金：通常500ドルから2,000ドル（頭金に充当）\n頭金：価格の20%から30%（売買契約書の署名時）\n移転税：物件価格の4%（免除の場合あり）\n弁護士・契約書の確認：物件価格の0.5%から1%\n家具・内装：物件により異なり、5,000ドルから15,000ドルが目安\n\n購入後の費用：\n固定資産税：評価額の80%のうち25,000ドルを超える部分に年0.1%（15万ドルの部屋で年約95ドル）\n建物の管理費：1㎡あたり月1ドルから2ドル\n\n移転税をデベロッパーが負担するキャンペーンもあります。物件ごとに正確な金額を確認してお伝えします。'],
    ['faq3', 'Rental tax and fees', '賃貸収入の税金', 'Rental tax and fees',
      '<b>Tax and costs on rental income</b>\n\nRental income tax: 14% for owners living abroad, 10% for residents. For overseas owners it is usually deducted before the rent reaches you.\n\nOther running costs: building management of $1 to $2 per sqm a month (often about $1.8), and empty months between tenants (plan for about 10% a year).\n\nA practical estimate of what you keep: rent, minus the tax, minus building management, minus about 10% for empty months.',
      '<b>賃貸収入の税金と費用</b>\n\n賃貸収入の税金：海外在住のオーナーは14%、カンボジア居住者は10%です。海外オーナーの場合、通常は家賃が届く前に差し引かれます。\n\nそのほかの費用：建物の管理費（1㎡あたり月1ドルから2ドル、目安は約1.8ドル）と、入居者が入れ替わる間の空室（年に約10%を見込みます）。\n\n手取りの目安は、家賃から税金、建物の管理費、空室分の約10%を引いて計算します。'],
    ['faq4', 'How buying works', '購入の流れ', 'How buying works',
      '<b>The buying process: 6 steps</b>\n\n1. Booking: choose a unit and pay a booking fee, usually $500 to $2,000, to hold it\n2. Down payment and contract (SPA): about 20 to 30% of the price when you sign. Have your own lawyer review the SPA first\n3. Instalments during construction: monthly, quarterly or by construction stage (for example 1% a month for 35 months)\n4. Balance at handover: the rest, often 40 to 50%, in cash or with a bank loan\n5. Handover: inspect the unit, list any defects for the developer, then collect the keys\n6. Title registration: once fully paid, the strata title is registered in your name with the Ministry of Land Management (MLMUPC)',
      '<b>購入の流れ：6つのステップ</b>\n\n1. 予約：部屋を選び、予約金（通常500ドルから2,000ドル）を支払って確保\n2. 頭金と売買契約書（SPA）：署名時に価格の約20%から30%。署名前に、ご自身の弁護士による確認をおすすめします\n3. 建設中の分割払い：毎月、四半期ごと、または工事の段階ごと（例：月1%を35か月）\n4. 引き渡し時の残金：残りの40%から50%程度を、現金または銀行ローンで\n5. 引き渡し：完成した部屋を点検し、不具合をデベロッパーに伝えてから鍵を受け取り\n6. 権利の登記：全額の支払い後、ストラタタイトルが土地管理省（MLMUPC）でご本人の名義に登記'],
    ['faq5', 'Buying from abroad', '海外から購入', 'Buying from abroad',
      '<b>Can I buy from abroad?</b>\n\nYes. The Sales and Purchase Agreement can be signed digitally or through a notarised power of attorney, so you do not have to be in Cambodia.\n\nPurchase prices and rents are almost always in US dollars, so there is no currency exchange step in the deal itself.',
      '<b>海外から購入できますか？</b>\n\nはい。売買契約書は電子署名、または公証された委任状で締結できるため、現地に来なくても購入できます。\n\n購入価格も家賃も、ほぼすべて米ドルで取引されます。'],
  ];
  const labels = ['Foreign ownership', 'Extra costs', 'Rental tax and fees', 'How buying works', 'Buying from abroad'];
  by.faq = {
    id: 'faq', flow: 'FAQ', title: 'Common questions',
    text: '<b>Common questions</b>\n\nPick a topic.',
    buttons: items.map((it) => ({ l: it[1], to: it[0], half: false, url: '' })).concat([{ l: 'Back', to: 'more', half: false, url: '' }]),
    note: 'Facts come from the website FAQ. No company names, no WhatsApp. Japanese wording needs a native review. Khmer shows English for now.',
    tr: {
      jp: { t: '<b>よくある質問</b>\n\n知りたい項目をお選びください。', b: items.map((it) => it[2]).concat(['戻る']) },
      kh: { t: '<b>សំណួរញឹកញាប់</b>\n\nសូមជ្រើសរើសប្រធានបទ។', b: items.map((it) => it[3]).concat(['ត្រឡប់ក្រោយ']) },
    },
  };
  items.forEach((it) => {
    by[it[0]] = {
      id: it[0], flow: 'FAQ', title: 'FAQ: ' + it[1], text: it[4],
      buttons: [Object.assign({}, LINEBTN), { l: 'Back', to: 'faq', half: false, url: '' }],
      note: 'Facts from the website FAQ. Japanese needs a native review. Khmer shows English for now.',
      tr: { jp: { t: it[5], b: ['LINEでNickに相談', '戻る'] }, kh: { t: it[4], b: ['និយាយជាមួយ Nick តាម LINE', 'ត្រឡប់ក្រោយ'] } },
    };
  });
  // the More menu gets the FAQ as its first button
  by.more.buttons.unshift({ l: 'Common questions', to: 'faq', half: false, url: '' });
  by.more.tr.jp.b.unshift('よくある質問'); by.more.tr.kh.b.unshift('សំណួរញឹកញាប់');
  // the estimate screen now takes two numbers (quick estimate) or three
  by.calc1.text = '<b>Estimate with my numbers</b>\n\nSend two numbers: the price and the monthly rent. You get the gross yield and a net range after tax and the management fee.\nExample: <code>68000 650</code>\n\nIf you know your yearly costs, add them as a third number: <code>68000 650 1800</code>\n\n<i>Yields and prices are for reference only and do not guarantee future income.</i>';
  by.calc1.tr.jp.t = '<b>ご自身の数値で試算</b>\n\n2つの数字を送ってください。価格と月額家賃です。表面利回りと、税金と管理費を引いた手取りの目安が分かります。\n例: <code>68000 650</code>\n\n年間費用が分かる場合は、3つ目の数字として加えてください。<code>68000 650 1800</code>\n\n<i>※利回り・価格は参考値であり、将来の収益を保証するものではありません。</i>';
  by.calc1.tr.kh.t = '<b>ប៉ាន់ស្មានតាមលេខរបស់ខ្ញុំ</b>\n\nសូមផ្ញើលេខពីរ៖ តម្លៃ និងថ្លៃជួលប្រចាំខែ។\nឧទាហរណ៍: <code>68000 650</code>\n\nបើអ្នកដឹងចំណាយប្រចាំឆ្នាំ សូមបន្ថែមជាលេខទីបី៖ <code>68000 650 1800</code>\n\n<i>ផលចំណេញ និងតម្លៃគឺសម្រាប់ជាឯកសារយោងប៉ុណ្ណោះ ហើយមិនធានាប្រាក់ចំណូលនាពេលអនាគតទេ។</i>';
})();
// steps that tell Nick
by.leaddone.notify = 'Ask Nick'; by.tourok.notify = 'Tour request'; by.check2.notify = 'Listing to check';
const keep = Object.keys(by);
const order = []; src.forEach(s => { if (by[s.id]) order.push(s.id); if (s.id === 'more') ['faq','faq1','faq2','faq3','faq4','faq5'].forEach(i => order.push(i)); if (s.id === 'b2') order.push('b2other'); if (s.id === 'rr2') order.push('rr2other'); });
const steps = order.map(id => by[id]);
steps.forEach(s => s.buttons = s.buttons.filter(b => b.url || !b.to || keep.includes(b.to)));
fs.writeFileSync(path.join(__dirname, 'flow.json'), JSON.stringify({ line: LINE, steps }, null, 1));
console.log('flow.json written:', steps.length, 'steps');
